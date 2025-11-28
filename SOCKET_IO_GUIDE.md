# Socket.IO Real-Time Multiplayer Setup

This document explains how to use Socket.IO for real-time multiplayer mahjong games (2-4 players).

## Architecture

### Server Side
- **Location**: `server/utils/socket.ts` + `server/plugins/socket.ts`
- **Purpose**: WebSocket server for real-time communication
- **Room Management**: Tracks connected users and game rooms (max 4 players per room)

### Client Side
- **Location**: `composables/useSocket.ts`
- **Purpose**: Vue composable for Socket.IO client operations
- **State Management**: Uses Nuxt's `useState` for reactive state

## Server Events (Receive from Client)

### Authentication
```typescript
socket.emit('auth:login', {
  userId: string,
  userName: string
})
```

### Room Management
```typescript
// Join a room (max 4 players)
socket.emit('room:join', {
  roomId: string,
  userId: string,
  userName: string
})

// Leave current room
socket.emit('room:leave', {
  roomId: string
})
```

### Game Actions
```typescript
// Send game action (draw, discard, peng, kong, hu)
socket.emit('game:action', {
  type: 'draw' | 'discard' | 'peng' | 'kong' | 'hu' | 'pass',
  data: any
})

// Broadcast game state update
socket.emit('game:state-update', {
  gameId: string,
  currentPlayerIndex: number,
  phase: string,
  players: Array<PlayerInfo>
})
```

### Chat & Ready Status
```typescript
// Send chat message
socket.emit('chat:message', {
  message: string
})

// Set ready status
socket.emit('player:ready', {
  isReady: boolean
})
```

## Client Events (Receive from Server)

### Authentication Response
```typescript
socket.on('auth:success', (data: {
  socketId: string
}) => {
  // User authenticated
})
```

### Room Updates
```typescript
socket.on('room:user-joined', (data: {
  userId: string,
  userName: string,
  roomUsers: RoomUser[],
  playerCount: number
}) => {
  // Player joined room
})

socket.on('room:user-left', (data: {
  userId: string,
  userName: string,
  roomUsers: RoomUser[],
  playerCount: number
}) => {
  // Player left room
})

socket.on('room:error', (data: {
  message: string
}) => {
  // Room error (e.g., room full)
})
```

### Game Updates
```typescript
socket.on('game:action-received', (data: {
  playerId: string,
  playerName: string,
  type: ActionType,
  data: any
}) => {
  // Another player performed action
})

socket.on('game:state-changed', (data: {
  gameId: string,
  currentPlayerIndex: number,
  phase: string,
  players: PlayerInfo[],
  lastAction: any
}) => {
  // Game state updated
})
```

### Chat & Ready
```typescript
socket.on('chat:message-received', (data: {
  userId: string,
  userName: string,
  message: string,
  timestamp: number
}) => {
  // Chat message received
})

socket.on('player:ready-changed', (data: {
  userId: string,
  userName: string,
  isReady: boolean
}) => {
  // Player ready status changed
})
```

## Vue Component Usage

### 1. Basic Setup

```vue
<script setup lang="ts">
const {
  connect,
  disconnect,
  authenticate,
  joinRoom,
  leaveRoom,
  isConnected,
  roomUsers,
  sendGameAction,
  onGameStateChange,
  onGameAction
} = useSocket()

const userId = ref('user123')
const userName = ref('Player 1')
const roomId = ref('room-abc')

onMounted(() => {
  // Connect to Socket.IO server
  connect()
  
  // Authenticate user
  authenticate(userId.value, userName.value)
  
  // Join game room
  joinRoom(roomId.value, userId.value, userName.value)
  
  // Listen for game updates
  onGameStateChange((data) => {
    console.log('Game state updated:', data)
    // Update your local game state
  })
  
  onGameAction((data) => {
    console.log('Player action:', data)
    // Handle other players' actions
  })
})

onUnmounted(() => {
  leaveRoom()
  disconnect()
})
</script>
```

### 2. Sending Game Actions

```vue
<script setup lang="ts">
const { sendGameAction } = useSocket()

function discardTile(tileId: string) {
  sendGameAction({
    type: 'discard',
    data: { tileId }
  })
}

function performPeng(tileIds: string[]) {
  sendGameAction({
    type: 'peng',
    data: { tileIds }
  })
}

function declareWin() {
  sendGameAction({
    type: 'hu',
    data: {}
  })
}
</script>
```

### 3. Chat System

```vue
<script setup lang="ts">
const { sendChatMessage, chatMessages } = useSocket()

const newMessage = ref('')

function sendMessage() {
  if (newMessage.value.trim()) {
    sendChatMessage(newMessage.value)
    newMessage.value = ''
  }
}
</script>

<template>
  <div class="chat">
    <div v-for="msg in chatMessages" :key="msg.timestamp">
      <strong>{{ msg.userName }}:</strong> {{ msg.message }}
    </div>
    <input v-model="newMessage" @keyup.enter="sendMessage" />
  </div>
</template>
```

### 4. Room Status Display

```vue
<script setup lang="ts">
const { roomUsers, isConnected } = useSocket()
</script>

<template>
  <div class="room-info">
    <p>Connected: {{ isConnected ? '✅' : '❌' }}</p>
    <p>Players: {{ roomUsers.length }}/4</p>
    <ul>
      <li v-for="user in roomUsers" :key="user.socketId">
        {{ user.userName }}
      </li>
    </ul>
  </div>
</template>
```

## Game Flow with Socket.IO

### 1. Player Joins Room
```
Client → server: room:join
Server → all clients in room: room:user-joined
```

### 2. Players Get Ready
```
Client → server: player:ready
Server → all clients in room: player:ready-changed
```

### 3. Game Starts (when 4 players ready)
```
Client → server: POST /api/game/create
Server → all clients: game:state-changed
```

### 4. Player Actions
```
Client → server: POST /api/game/action (REST API)
Server → all clients in room: game:state-changed (Socket.IO)
```

### 5. Player Leaves
```
Client → server: room:leave
Server → all clients in room: room:user-left
```

## API + Socket.IO Integration

The game uses **hybrid architecture**:
- **REST API**: Game logic operations (create, join, action)
- **Socket.IO**: Real-time state broadcasting

When a player makes a move:
1. Client calls REST API: `POST /api/game/action`
2. Server processes action in `gameManager`
3. Server broadcasts update via `emitToRoom()`
4. All clients receive `game:state-changed` event
5. Clients update their UI in real-time

### Example Flow
```typescript
// Client makes move
await $fetch('/api/game/action', {
  method: 'POST',
  body: {
    gameId,
    playerId,
    action: 'discard',
    tileId: 'tile-123'
  }
})

// Server processes and broadcasts
// (in action.post.ts)
gameManager.executeAction(...)
emitToRoom(gameId, 'game:state-changed', { ... })

// All clients receive update
socket.on('game:state-changed', (data) => {
  // Update UI
  gameState.value = data
})
```

## Room Management

### Room ID Convention
- Use **gameId** as **roomId** for Socket.IO rooms
- This ensures Socket.IO rooms match game instances

```typescript
// When creating game
const { gameId } = await $fetch('/api/game/create', { ... })

// Join Socket.IO room with same ID
joinRoom(gameId, userId, userName)
```

### Player Limits
- Max 4 players per room
- Server enforces limit and emits `room:error` if full

### Connection States
- **Connected**: `isConnected = true`
- **In Room**: `roomId` is set
- **Disconnected**: Auto-cleanup on disconnect event

## Testing Socket.IO

### Test with Multiple Browsers
1. Open 4 browser tabs/windows
2. Each connects to `http://localhost:3000`
3. All join the same room ID
4. Test actions and see real-time updates

### Manual Testing Script
```javascript
// Browser console 1
const socket = io('http://localhost:3000')
socket.emit('auth:login', { userId: 'user1', userName: 'Player 1' })
socket.emit('room:join', { roomId: 'test-room', userId: 'user1', userName: 'Player 1' })

// Browser console 2
const socket = io('http://localhost:3000')
socket.emit('auth:login', { userId: 'user2', userName: 'Player 2' })
socket.emit('room:join', { roomId: 'test-room', userId: 'user2', userName: 'Player 2' })

// Listen for events
socket.on('room:user-joined', (data) => console.log('User joined:', data))
socket.on('game:state-changed', (data) => console.log('Game updated:', data))
```

## Redis Scaling (Future Enhancement)

For horizontal scaling across multiple servers:

```typescript
import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'

const pubClient = createClient({ url: 'redis://localhost:6379' })
const subClient = pubClient.duplicate()

await Promise.all([pubClient.connect(), subClient.connect()])

io.adapter(createAdapter(pubClient, subClient))
```

This allows:
- Multiple Nuxt servers sharing Socket.IO state
- Load balancing across servers
- Session persistence

## Configuration

Add to `nuxt.config.ts`:
```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      socketUrl: process.env.SOCKET_URL || 'http://localhost:3000'
    }
  }
})
```

Add to `.env`:
```
SOCKET_URL=http://localhost:3000
CLIENT_URL=http://localhost:3000
```

## Troubleshooting

### Connection Issues
- Check server is running: `npm run dev`
- Verify port 3000 is not blocked
- Check browser console for errors

### Room Not Updating
- Ensure `gameId` matches `roomId`
- Check `emitToRoom()` is called in API endpoints
- Verify clients are listening to correct events

### Player Not Joining
- Check room limit (max 4 players)
- Verify `room:join` includes all required fields
- Look for `room:error` events

## Summary

✅ Real-time multiplayer with Socket.IO
✅ Room management (2-4 players)
✅ Game state broadcasting
✅ Chat system
✅ Player ready status
✅ Auto-cleanup on disconnect
✅ Hybrid REST + WebSocket architecture
