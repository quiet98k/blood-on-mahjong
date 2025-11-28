import type { Server as HTTPServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import type { Socket } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'
import { getMongoClient } from './mongo'
import type { SocketConnection, RoomState } from '../types/database'
import { gameManager } from './gameManager'

let io: SocketIOServer | null = null

export interface SocketUser {
  socketId: string
  userId: string
  userName: string
  roomId?: string
}

// ✅ MongoDB Collections
async function getSocketConnectionsCollection() {
  const client = await getMongoClient()
  const db = client.db('Blood_mahjong')
  return db.collection<SocketConnection>('socketConnections')
}

async function getRoomStatesCollection() {
  const client = await getMongoClient()
  const db = client.db('Blood_mahjong')
  return db.collection<RoomState>('roomStates')
}

export async function initializeSocketIO(server: HTTPServer) {
  if (io) return io

  io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        // Allow all origins in development/testing
        callback(null, true)
      },
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  })

  // ✅ Configure Redis adapter for horizontal scaling
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
  
  try {
    const pubClient = createClient({ url: redisUrl })
    const subClient = pubClient.duplicate()

    await Promise.all([
      pubClient.connect(),
      subClient.connect()
    ])

    io.adapter(createAdapter(pubClient, subClient))
    console.log('✅ Socket.IO Redis adapter connected')
  } catch (error) {
    console.warn('⚠️  Redis not available, running in single-server mode')
    console.warn('   Set REDIS_URL environment variable to enable scaling')
  }

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`)

    // Set up GameManager broadcasting
    gameManager.setWebSocketManager({
      broadcast: (gameId: string, event: string, data: any) => {
        // Map gameId to roomId (assuming they are the same for now, or we need a lookup)
        // In GameManager.createGame, gameId is randomUUID.
        // In GameService.createGame, gameId is randomUUID, roomId is passed.
        // But GameManager is in-memory and uses gameId as the key.
        // The frontend uses gameId as roomId in the URL usually.
        // Let's assume gameId == roomId for broadcasting purposes in this context
        emitToRoom(gameId, 'game:state-changed', data)
      }
    })

    // Handle user authentication
    socket.on('auth:login', async (data: { userId: string; userName: string }) => {
      try {
        const collection = await getSocketConnectionsCollection()
        
        // Store connection in MongoDB
        await collection.insertOne({
          socketId: socket.id,
          userId: data.userId,
          userName: data.userName,
          connectedAt: new Date(),
          lastSeenAt: new Date()
        })
        
        socket.emit('auth:success', { socketId: socket.id })
        console.log(`✅ User authenticated: ${data.userName} (${data.userId})`)
      } catch (error) {
        console.error('Error in auth:login:', error)
        socket.emit('auth:error', { message: 'Authentication failed' })
      }
    })

    // Join a game room
    socket.on('room:join', async (data: { roomId: string; userId: string; userName: string }) => {
      const { roomId, userId, userName } = data
      
      try {
        const roomStates = await getRoomStatesCollection()
        const connections = await getSocketConnectionsCollection()
        
        // Get or create room state
        let roomState = await roomStates.findOne({ roomId })
        
        if (!roomState) {
          // Create new room
          await roomStates.insertOne({
            roomId,
            playerIds: [],
            socketIds: [],
            maxPlayers: 4,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          roomState = await roomStates.findOne({ roomId })
        }
        
        // Check if room is full
        if (roomState!.socketIds.length >= 4) {
          socket.emit('room:error', { message: 'Room is full (max 4 players)' })
          return
        }

        // Join the Socket.IO room
        await socket.join(roomId)
        
        // Update room state in MongoDB
        await roomStates.updateOne(
          { roomId },
          {
            $addToSet: { 
              socketIds: socket.id,
              playerIds: userId 
            },
            $set: { updatedAt: new Date() }
          }
        )
        
        // Update user's room assignment
        await connections.updateOne(
          { socketId: socket.id },
          { 
            $set: { 
              roomId,
              lastSeenAt: new Date() 
            } 
          }
        )

        // Get updated room state
        const updatedRoom = await roomStates.findOne({ roomId })
        
        // Get all users in room
        const roomUsers = await connections.find({
          socketId: { $in: updatedRoom!.socketIds }
        }).toArray()

        const roomUsersList = roomUsers.map((u: any) => ({
          userId: u.userId,
          userName: u.userName,
          socketId: u.socketId
        }))

        // Notify all users in room
        io!.to(roomId).emit('room:user-joined', {
          userId,
          userName,
          roomUsers: roomUsersList,
          playerCount: updatedRoom!.socketIds.length
        })

        console.log(`👥 ${userName} joined room ${roomId} (${updatedRoom!.socketIds.length}/4 players)`)
      } catch (error) {
        console.error('Error in room:join:', error)
        socket.emit('room:error', { message: 'Failed to join room' })
      }
    })

    // Leave room
    socket.on('room:leave', async (data: { roomId: string }) => {
      await handleLeaveRoom(socket, data.roomId)
    })

    // Game state updates
    socket.on('game:action', async (data: any) => {
      try {
        const { gameId, playerId, type, tileId, tileIds } = data
        
        console.log(`🎮 Action received: ${type} from ${playerId} in game ${gameId}`)
        
        // Execute action in GameManager (the brain)
        // This will validate the move, update state, and trigger broadcast via setWebSocketManager
        await gameManager.executeAction(gameId, playerId, type, tileId, tileIds)
        
      } catch (error: any) {
        console.error('Error in game:action:', error.message)
        socket.emit('game:error', { message: error.message })
      }
    })

    // Game state sync (broadcast to all including sender)
    socket.on('game:state-update', async (data: any) => {
      try {
        const connections = await getSocketConnectionsCollection()
        const user = await connections.findOne({ socketId: socket.id })
        
        if (!user || !user.roomId) return

        io!.to(user.roomId).emit('game:state-changed', data)
      } catch (error) {
        console.error('Error in game:state-update:', error)
      }
    })

    // Chat messages
    socket.on('chat:message', async (data: { message: string }) => {
      try {
        const connections = await getSocketConnectionsCollection()
        const user = await connections.findOne({ socketId: socket.id })
        
        if (!user || !user.roomId) return

        io!.to(user.roomId).emit('chat:message-received', {
          userId: user.userId,
          userName: user.userName,
          message: data.message,
          timestamp: Date.now()
        })
      } catch (error) {
        console.error('Error in chat:message:', error)
      }
    })

    // Player ready status
    socket.on('player:ready', async (data: { isReady: boolean }) => {
      try {
        const connections = await getSocketConnectionsCollection()
        const user = await connections.findOne({ socketId: socket.id })
        
        if (!user || !user.roomId) return

        io!.to(user.roomId).emit('player:ready-changed', {
          userId: user.userId,
          userName: user.userName,
          isReady: data.isReady
        })
      } catch (error) {
        console.error('Error in player:ready:', error)
      }
    })

    // Disconnect
    socket.on('disconnect', async () => {
      try {
        const connections = await getSocketConnectionsCollection()
        const user = await connections.findOne({ socketId: socket.id })
        
        if (user && user.roomId) {
          await handleLeaveRoom(socket, user.roomId)
        }

        // Remove connection from MongoDB
        await connections.deleteOne({ socketId: socket.id })
        console.log(`❌ Client disconnected: ${socket.id}`)
      } catch (error) {
        console.error('Error in disconnect:', error)
      }
    })
  })

  console.log('🚀 Socket.IO initialized with MongoDB state storage')
  return io
}

async function handleLeaveRoom(socket: Socket, roomId: string) {
  try {
    const connections = await getSocketConnectionsCollection()
    const roomStates = await getRoomStatesCollection()
    
    const user = await connections.findOne({ socketId: socket.id })
    
    // Remove from Socket.IO room
    socket.leave(roomId)
    
    // Update room state in MongoDB
    await roomStates.updateOne(
      { roomId },
      {
        $pull: { 
          socketIds: socket.id,
          playerIds: user?.userId 
        },
        $set: { updatedAt: new Date() }
      }
    )
    
    // Clear user's room assignment
    await connections.updateOne(
      { socketId: socket.id },
      { 
        $unset: { roomId: '' },
        $set: { lastSeenAt: new Date() }
      }
    )

    // Get updated room state
    const updatedRoom = await roomStates.findOne({ roomId })
    
    if (updatedRoom) {
      // Get remaining users
      const roomUsers = await connections.find({
        socketId: { $in: updatedRoom.socketIds }
      }).toArray()

      const roomUsersList = roomUsers.map((u: any) => ({
        userId: u.userId,
        userName: u.userName,
        socketId: u.socketId
      }))

      // Notify others
      if (user) {
        io!.to(roomId).emit('room:user-left', {
          userId: user.userId,
          userName: user.userName,
          roomUsers: roomUsersList,
          playerCount: updatedRoom.socketIds.length
        })

        console.log(`👋 ${user.userName} left room ${roomId} (${updatedRoom.socketIds.length}/4 players)`)
      }

      // Clean up empty room
      if (updatedRoom.socketIds.length === 0) {
        await roomStates.deleteOne({ roomId })
      }
    }
  } catch (error) {
    console.error('Error in handleLeaveRoom:', error)
  }
}

export function getIO(): SocketIOServer | null {
  return io
}

// Helper to emit to specific room
export function emitToRoom(roomId: string, event: string, data: any) {
  if (io) {
    io.to(roomId).emit(event, data)
  }
}

// Helper to get room users from MongoDB
export async function getRoomUsers(roomId: string): Promise<SocketUser[]> {
  try {
    const roomStates = await getRoomStatesCollection()
    const connections = await getSocketConnectionsCollection()
    
    const room = await roomStates.findOne({ roomId })
    if (!room) return []

    const users = await connections.find({
      socketId: { $in: room.socketIds }
    }).toArray()

    return users.map((u: any) => ({
      socketId: u.socketId,
      userId: u.userId,
      userName: u.userName,
      roomId: u.roomId
    }))
  } catch (error) {
    console.error('Error in getRoomUsers:', error)
    return []
  }
}

// Helper to get user count in room from MongoDB
export async function getRoomUserCount(roomId: string): Promise<number> {
  try {
    const roomStates = await getRoomStatesCollection()
    const room = await roomStates.findOne({ roomId })
    return room ? room.socketIds.length : 0
  } catch (error) {
    console.error('Error in getRoomUserCount:', error)
    return 0
  }
}
