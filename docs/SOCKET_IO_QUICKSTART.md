# Socket.IO Quick Start Guide

## ✅ What's Completed

### Server-Side Setup
- ✅ **Socket.IO Server**: `server/utils/socket.ts` - Room management, connection handling
- ✅ **Nitro Plugin**: `server/plugins/socket.ts` - Auto-initializes Socket.IO with Nuxt server
- ✅ **Game Integration**: `server/api/game/action.post.ts` - Broadcasts game state via Socket.IO
- ✅ **Room Limits**: Max 4 players per room enforced

### Client-Side Setup
- ✅ **Composable**: `composables/useSocket.ts` - Vue composable for Socket.IO operations
- ✅ **Example Component**: `components/GameRoom.vue` - Full multiplayer game example
- ✅ **Test Page**: `public/test-socket.html` - Standalone HTML test client

### Documentation
- ✅ **Comprehensive Guide**: `SOCKET_IO_GUIDE.md` - Full API reference and examples
- ✅ **This Quick Start**: `SOCKET_IO_QUICKSTART.md`

## 🚀 Testing Socket.IO

### Option 1: HTML Test Page (Easiest)

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Open test page in 4 browser tabs:**
   ```
   http://localhost:3000/test-socket.html
   ```

3. **In each tab:**
   - Enter different User ID and Name (e.g., user1, user2, user3, user4)
   - Click "Connect"
   - Enter same Room ID (e.g., "room-test")
   - Click "Join Room"
   - Try sending actions and chat messages

4. **Verify:**
   - ✅ All tabs show 4/4 players
   - ✅ Chat messages appear in all tabs
   - ✅ Game actions logged in all tabs
   - ✅ User list updates when someone joins/leaves

### Option 2: Vue Component Integration

1. **Use the GameRoom component:**
   ```vue
   <!-- pages/game.vue -->
   <template>
     <GameRoom />
   </template>
   ```

2. **Or use the composable directly:**
   ```vue
   <script setup>
   const { connect, joinRoom, sendGameAction } = useSocket()
   
   onMounted(() => {
     connect()
     joinRoom('room-123', 'user-1', 'Player 1')
   })
   </script>
   ```

### Option 3: Browser Console Testing

```javascript
// Open browser console at http://localhost:3000
const socket = io('http://localhost:3000')

// Connect and authenticate
socket.emit('auth:login', { userId: 'test-user', userName: 'Test Player' })

// Join room
socket.emit('room:join', { 
  roomId: 'test-room', 
  userId: 'test-user', 
  userName: 'Test Player' 
})

// Listen for events
socket.on('room:user-joined', (data) => console.log('User joined:', data))
socket.on('game:state-changed', (data) => console.log('Game updated:', data))
socket.on('chat:message-received', (data) => console.log('Chat:', data))

// Send actions
socket.emit('game:action', { type: 'discard', data: { tileId: 'tile-1' } })
socket.emit('chat:message', { message: 'Hello!' })
```

## 📊 Expected Console Output

When testing with the HTML page, you should see logs like:

```
🔌 Client connected: dF3x9kL2mN5pQ8r
✅ User authenticated: Player 1 (user1)
👥 Player 1 joined room room-test (1/4 players)
👥 Player 2 joined room room-test (2/4 players)
👥 Player 3 joined room room-test (3/4 players)
👥 Player 4 joined room room-test (4/4 players)
```

## 🎮 Game Flow with Socket.IO

### 1. Create Game (REST API)
```typescript
const { gameId } = await $fetch('/api/game/create', {
  method: 'POST',
  body: { playerName: 'Player 1' }
})
```

### 2. Join Socket.IO Room
```typescript
const { joinRoom } = useSocket()
joinRoom(gameId, userId, userName)
```

### 3. Make Game Move (REST API)
```typescript
await $fetch('/api/game/action', {
  method: 'POST',
  body: {
    gameId,
    playerId,
    action: 'discard',
    tileId: 'tile-123'
  }
})
```

### 4. Receive Real-Time Update (Socket.IO)
```typescript
onGameStateChange((data) => {
  // All 4 players receive this simultaneously
  console.log('Game updated:', data)
  gameState.value = data
})
```

## 🔧 Common Issues & Solutions

### Issue: "Cannot connect to Socket.IO"
**Solution:**
- Ensure server is running: `npm run dev`
- Check URL is correct: `http://localhost:3000`
- Check browser console for CORS errors

### Issue: "Room is full (max 4 players)"
**Solution:**
- Room already has 4 players
- Create a new room with different `roomId`
- Wait for someone to leave

### Issue: "Game state not updating in other clients"
**Solution:**
- Verify `gameId` matches `roomId`
- Check server logs for `emitToRoom()` calls
- Ensure all clients listening to `game:state-changed`

### Issue: "Players can't see each other"
**Solution:**
- All players must join same `roomId`
- Check `roomUsers` array in state
- Verify `room:user-joined` events are firing

## 📦 Package Dependencies

Already installed:
```json
{
  "socket.io": "^4.6.1",
  "socket.io-client": "^4.6.1"
}
```

## 🧪 Automated Testing Script

Create `test-multiplayer.sh`:

```bash
#!/bin/bash

echo "Testing Socket.IO Multiplayer..."

# Start server in background
npm run dev &
SERVER_PID=$!
sleep 3

# Open 4 test pages
open "http://localhost:3000/test-socket.html"
sleep 1
open "http://localhost:3000/test-socket.html"
sleep 1
open "http://localhost:3000/test-socket.html"
sleep 1
open "http://localhost:3000/test-socket.html"

echo "✅ Opened 4 test clients"
echo "Manually test in each browser:"
echo "1. Enter unique User ID and Name"
echo "2. Click Connect"
echo "3. Enter same Room ID: 'test-room'"
echo "4. Click Join Room"
echo "5. Test actions and chat"
echo ""
echo "Press Ctrl+C to stop server"

wait $SERVER_PID
```

Make executable:
```bash
chmod +x test-multiplayer.sh
./test-multiplayer.sh
```

## 🎯 Next Steps

### Phase 1: Test Current Setup ✅
1. Open `test-socket.html` in 4 tabs
2. Verify all events work
3. Test room joining/leaving
4. Test chat and actions

### Phase 2: Integrate with Game Logic
1. Update game UI to show real-time updates
2. Add turn indicators
3. Show other players' actions
4. Handle disconnections gracefully

### Phase 3: Add Redis (Optional)
For horizontal scaling across multiple servers:
```bash
npm install @socket.io/redis-adapter redis
```

Then update `server/utils/socket.ts` to use Redis adapter.

## 📚 Additional Resources

- **Full Guide**: See `SOCKET_IO_GUIDE.md` for complete API reference
- **Game API**: See `API_README.md` for REST endpoint documentation
- **Game Flow**: See `GAME_FLOW.md` for Mahjong rules and gameplay
- **Socket.IO Docs**: https://socket.io/docs/v4/

## ✨ Features Summary

✅ Real-time multiplayer (2-4 players)
✅ Room management with player limits
✅ Game state broadcasting
✅ Chat system
✅ Player ready status
✅ Auto-reconnection
✅ Hybrid REST + WebSocket architecture
✅ Connection state tracking
✅ Event logging

## 🎉 You're Ready!

Your Socket.IO setup is complete. Start testing with the HTML page, then integrate into your Vue components using the `useSocket()` composable.

**Happy Gaming! 🎴**
