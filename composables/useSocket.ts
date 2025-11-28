import { io, type Socket } from 'socket.io-client'
import type { Ref } from 'vue'

export interface GameAction {
  type: 'draw' | 'discard' | 'peng' | 'gang' | 'hu' | 'pass'
  data: any
}

export interface RoomUser {
  userId: string
  userName: string
  socketId: string
}

export interface ChatMessage {
  userId: string
  userName: string
  message: string
  timestamp: number
}

export const useSocket = () => {
  const socket: Ref<Socket | null> = useState('socket', () => null)
  const isConnected = useState('socket-connected', () => false)
  const roomId = useState<string | undefined>('socket-room-id', () => undefined)
  const roomUsers = useState<RoomUser[]>('socket-room-users', () => [])
  const chatMessages = useState<ChatMessage[]>('socket-chat-messages', () => [])

  const connect = (serverUrl?: string) => {
    if (socket.value?.connected) return socket.value

    const config = useRuntimeConfig()
    const url = serverUrl || config.public.socketUrl || 'http://localhost:3000'

    socket.value = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    // Connection events
    socket.value.on('connect', () => {
      console.log('✅ Connected to Socket.IO server')
      isConnected.value = true
    })

    socket.value.on('disconnect', (reason) => {
      console.log('❌ Disconnected from Socket.IO server:', reason)
      isConnected.value = false
    })

    socket.value.on('connect_error', (error) => {
      console.error('🔴 Connection error:', error)
      isConnected.value = false
    })

    // Auth events
    socket.value.on('auth:success', (data: { socketId: string }) => {
      console.log('✅ Authenticated:', data.socketId)
    })

    // Room events
    socket.value.on('room:user-joined', (data: { userId: string; userName: string; roomUsers: RoomUser[]; playerCount: number }) => {
      console.log(`👥 ${data.userName} joined room (${data.playerCount}/4 players)`)
      roomUsers.value = data.roomUsers
    })

    socket.value.on('room:user-left', (data: { userId: string; userName: string; roomUsers: RoomUser[]; playerCount: number }) => {
      console.log(`👋 ${data.userName} left room (${data.playerCount}/4 players)`)
      roomUsers.value = data.roomUsers
    })

    socket.value.on('room:error', (data: { message: string }) => {
      console.error('🔴 Room error:', data.message)
      alert(data.message)
    })

    // Chat events
    socket.value.on('chat:message-received', (data: ChatMessage) => {
      chatMessages.value.push(data)
    })

    return socket.value
  }

  const disconnect = () => {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
      isConnected.value = false
      roomId.value = undefined
      roomUsers.value = []
    }
  }

  const authenticate = (userId: string, userName: string) => {
    if (!socket.value) return
    socket.value.emit('auth:login', { userId, userName })
  }

  const joinRoom = (roomIdToJoin: string, userId: string, userName: string) => {
    if (!socket.value) return
    
    roomId.value = roomIdToJoin
    socket.value.emit('room:join', { roomId: roomIdToJoin, userId, userName })
  }

  const leaveRoom = () => {
    if (!socket.value || !roomId.value) return
    
    socket.value.emit('room:leave', { roomId: roomId.value })
    roomId.value = undefined
    roomUsers.value = []
  }

  const sendGameAction = (action: GameAction) => {
    if (!socket.value || !roomId.value) return
    socket.value.emit('game:action', action)
  }

  const updateGameState = (gameState: any) => {
    if (!socket.value || !roomId.value) return
    socket.value.emit('game:state-update', gameState)
  }

  const sendChatMessage = (message: string) => {
    if (!socket.value || !roomId.value) return
    socket.value.emit('chat:message', { message })
  }

  const setPlayerReady = (isReady: boolean) => {
    if (!socket.value || !roomId.value) return
    socket.value.emit('player:ready', { isReady })
  }

  // Event listeners
  const onGameAction = (callback: (data: any) => void) => {
    if (!socket.value) return
    socket.value.on('game:action-received', callback)
  }

  const onGameStateChange = (callback: (data: any) => void) => {
    if (!socket.value) return
    socket.value.on('game:state-changed', callback)
  }

  const onPlayerReady = (callback: (data: { userId: string; userName: string; isReady: boolean }) => void) => {
    if (!socket.value) return
    socket.value.on('player:ready-changed', callback)
  }

  const offGameAction = () => {
    if (!socket.value) return
    socket.value.off('game:action-received')
  }

  const offGameStateChange = () => {
    if (!socket.value) return
    socket.value.off('game:state-changed')
  }

  const offPlayerReady = () => {
    if (!socket.value) return
    socket.value.off('player:ready-changed')
  }

  return {
    socket,
    isConnected,
    roomId,
    roomUsers,
    chatMessages,
    connect,
    disconnect,
    authenticate,
    joinRoom,
    leaveRoom,
    sendGameAction,
    updateGameState,
    sendChatMessage,
    setPlayerReady,
    onGameAction,
    onGameStateChange,
    onPlayerReady,
    offGameAction,
    offGameStateChange,
    offPlayerReady
  }
}
