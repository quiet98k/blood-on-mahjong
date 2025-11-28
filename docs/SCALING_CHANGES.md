# Socket.IO Scaling Changes

## ✅ Changes Implemented

### 1. Redis Adapter for Socket.IO

**Package Installed:**
```bash
npm install @socket.io/redis-adapter redis
```

**File Changed:** `server/utils/socket.ts`

**What Changed:**
- ✅ Added Redis adapter configuration
- ✅ Removed global in-memory state (`connectedUsers`, `roomUsers` Maps)
- ✅ Now uses MongoDB for storing socket connections and room state

**Redis Configuration:**
```typescript
const pubClient = createClient({ url: redisUrl })
const subClient = pubClient.duplicate()
io.adapter(createAdapter(pubClient, subClient))
```

**Benefits:**
- Multiple server instances can now share Socket.IO events
- Room broadcasts work across all servers
- Horizontal scaling enabled

---

### 2. MongoDB State Storage

**New Collections Added:**

#### `socketConnections` Collection:
```typescript
{
  socketId: string       // Socket.IO connection ID
  userId: string         // User ID
  userName: string       // Display name
  roomId?: string        // Current room (optional)
  connectedAt: Date      // Connection timestamp
  lastSeenAt: Date       // Last activity
}
```

#### `roomStates` Collection:
```typescript
{
  roomId: string         // Game room ID
  playerIds: string[]    // Array of user IDs
  socketIds: string[]    // Array of socket IDs
  maxPlayers: number     // Always 4 for mahjong
  createdAt: Date
  updatedAt: Date
}
```

**File Changed:** `server/types/database.ts`

**What Changed:**
- ✅ Added `SocketConnection` interface
- ✅ Added `RoomState` interface

---

### 3. Socket.IO State Operations Now Use MongoDB

**Before (In-Memory):**
```typescript
// ❌ Lost when server restarts
const connectedUsers = new Map<string, SocketUser>()
const roomUsers = new Map<string, Set<string>>()
```

**After (MongoDB):**
```typescript
// ✅ Persists across restarts, shared across servers
const connections = await getSocketConnectionsCollection()
const roomStates = await getRoomStatesCollection()

// Store connection
await connections.insertOne({ socketId, userId, userName, ... })

// Update room state
await roomStates.updateOne({ roomId }, { $addToSet: { socketIds: socket.id } })
```

---

## 🚧 Still Needs Implementation

### Game State Must Move to MongoDB

**Current Problem:**
```typescript
// filepath: server/utils/gameManager.ts
class GameManager {
  private games: Map<string, GameState> = new Map()  // ❌ In-memory only!
  private playerToGame: Map<string, string> = new Map()  // ❌ In-memory only!
}
```

**Why This is a Problem:**
- Game state is lost on server restart
- Multiple servers have separate game states
- Not scalable to multiple instances

**Solution: MongoDB-Backed Game Manager**

Create new file: `server/utils/gameManagerMongo.ts`

```typescript
import { getMongoClient } from './mongo'
import type { MahjongGame } from '../types/database'

class MongoGameManager {
  async getGamesCollection() {
    const client = await getMongoClient()
    const db = client.db('Blood_mahjong')
    return db.collection<MahjongGame>('mahjongGames')
  }

  async createGame(playerName: string): Promise<{ gameId: string; playerId: string }> {
    const games = await this.getGamesCollection()
    
    const gameId = randomUUID()
    const playerId = randomUUID()
    
    // Create initial game state
    const gameState: MahjongGame = {
      gameId,
      roomId: gameId,
      phase: 'starting',
      players: [{
        userId: playerId,
        name: playerName,
        position: 0,
        hand: { concealedTiles: [], exposedMelds: [], discardedTiles: [] },
        status: 'waiting',
        isDealer: true,
        isTing: false,
        missingSuit: null,
        windScore: 0,
        rainScore: 0,
        wonFan: 0
      }],
      wall: [],
      currentPlayerIndex: 0,
      dealerIndex: 0,
      discardPile: [],
      actionHistory: [],
      winnersCount: 0,
      roundNumber: 1,
      createdAt: new Date(),
      lastActionTime: new Date(),
      updatedAt: new Date()
    }
    
    await games.insertOne(gameState)
    return { gameId, playerId }
  }

  async getGame(gameId: string): Promise<MahjongGame | null> {
    const games = await this.getGamesCollection()
    return await games.findOne({ gameId })
  }

  async updateGame(gameId: string, updates: Partial<MahjongGame>): Promise<void> {
    const games = await this.getGamesCollection()
    await games.updateOne(
      { gameId },
      { 
        $set: {
          ...updates,
          updatedAt: new Date(),
          lastActionTime: new Date()
        }
      }
    )
  }

  async executeAction(
    gameId: string, 
    playerId: string, 
    action: ActionType, 
    tileId?: string, 
    tileIds?: string[]
  ): Promise<void> {
    // Get current game state from MongoDB
    const game = await this.getGame(gameId)
    if (!game) throw new Error('Game not found')
    
    // Execute game logic (keep existing logic from gameManager.ts)
    // ... handle draw, discard, peng, kong, hu ...
    
    // Save updated state back to MongoDB
    await this.updateGame(gameId, game)
  }
}

export const mongoGameManager = new MongoGameManager()
```

**Files That Need Updating:**

1. ✅ `server/utils/socket.ts` - Already using MongoDB
2. ❌ `server/utils/gameManager.ts` - Still using in-memory Map
3. ❌ `server/api/game/create.post.ts` - Uses gameManager
4. ❌ `server/api/game/join.post.ts` - Uses gameManager
5. ❌ `server/api/game/action.post.ts` - Uses gameManager
6. ❌ `server/api/game/state.get.ts` - Uses gameManager
7. ❌ `server/api/game/list.get.ts` - Uses gameManager

---

## 🎯 Complete Migration Steps

### Step 1: ✅ COMPLETED - Socket.IO with Redis
- ✅ Install `@socket.io/redis-adapter` and `redis`
- ✅ Configure Redis adapter in `socket.ts`
- ✅ Move socket state to MongoDB

### Step 2: ❌ TODO - Game State to MongoDB
```typescript
// Create new game manager that uses MongoDB
export class MongoGameManager {
  async createGame(...) { /* save to MongoDB */ }
  async getGame(...) { /* read from MongoDB */ }
  async executeAction(...) { /* update in MongoDB */ }
}
```

### Step 3: ❌ TODO - Update API Endpoints
```typescript
// Replace all imports:
// OLD: import { gameManager } from '../../utils/gameManager'
// NEW: import { mongoGameManager } from '../../utils/gameManagerMongo'

// Replace all calls:
// OLD: gameManager.createGame(...)
// NEW: await mongoGameManager.createGame(...)
```

### Step 4: ❌ TODO - Add Game Cleanup
```typescript
// Clean up old finished games periodically
setInterval(async () => {
  const games = await getGamesCollection()
  const oneHourAgo = new Date(Date.now() - 3600000)
  
  await games.deleteMany({
    phase: 'ended',
    updatedAt: { $lt: oneHourAgo }
  })
}, 600000) // Every 10 minutes
```

---

## 📊 Current Status

| Component | Status | Scalable? |
|-----------|--------|-----------|
| Socket.IO Connections | ✅ MongoDB | ✅ Yes (with Redis) |
| Room Management | ✅ MongoDB | ✅ Yes (with Redis) |
| Game State | ❌ In-Memory Map | ❌ No |
| Player Actions | ❌ In-Memory Map | ❌ No |

---

## 🧪 How to Test Scaling

### Test With Redis (Optional):

1. **Install Redis locally:**
```bash
brew install redis
brew services start redis
```

2. **Set environment variable:**
```bash
export REDIS_URL=redis://localhost:6379
```

3. **Start multiple servers:**
```bash
# Terminal 1
PORT=3000 npm run dev

# Terminal 2
PORT=3001 npm run dev
```

4. **Test cross-server communication:**
- Connect Player 1 to `http://localhost:3000`
- Connect Player 2 to `http://localhost:3001`
- Both should see each other in the same room!

### Test Without Redis (Current State):

Without Redis, only Socket.IO state is in MongoDB. Socket.IO events still work on single server:

```bash
npm run dev

# Open 4 tabs to http://localhost:3000/test-socket.html
# All 4 players can join same room on single server
```

---

## 🚀 Deployment Recommendations

### For Production with Scaling:

1. **Use Redis Cloud** (free tier available):
   - Redis Labs: https://redis.com/try-free/
   - Upstash: https://upstash.com/

2. **Set environment variables:**
```env
REDIS_URL=redis://your-redis-url:6379
MONGODB_URI=mongodb+srv://...
```

3. **Deploy multiple instances:**
   - Vercel, Railway, or Render (2-3 instances)
   - All instances share Redis & MongoDB
   - Load balancer distributes traffic

4. **Complete game manager migration:**
   - Move game state to MongoDB
   - All servers can access same games

---

## 📝 Summary

### What's Done:
✅ Socket.IO Redis adapter configured
✅ Socket connections stored in MongoDB
✅ Room state stored in MongoDB
✅ Ready for horizontal scaling (Socket.IO layer)

### What's Needed:
❌ Game state must move from `Map` to MongoDB
❌ Game manager needs MongoDB implementation
❌ API endpoints need to use new async game manager

### Impact:
- **Current:** Socket.IO can scale, but game logic can't
- **After Migration:** Full horizontal scaling capability
- **Benefit:** Deploy to 10+ servers, handle 10,000+ concurrent players
