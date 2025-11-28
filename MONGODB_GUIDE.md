# MongoDB Integration Guide

## Overview

The backend now uses MongoDB for persistent data storage with Google OAuth authentication.

## Database Collections

### 1. **users**
Stores user accounts, profiles, and login information.

```typescript
{
  userId: string,           // Unique user ID
  email: string,            // Email address
  name: string,             // Display name
  avatar?: string,          // Profile picture URL
  oauthProvider: 'google' | 'local',
  oauthId?: string,         // Google ID
  createdAt: Date,
  lastLoginAt: Date,
  stats: {
    gamesPlayed: number,
    gamesWon: number,
    totalScore: number,
    highestFan: number,
    winRate: number
  }
}
```

### 2. **rooms**
Stores game rooms and their settings.

```typescript
{
  roomId: string,           // Unique room ID
  ownerId: string,          // User ID of creator
  name: string,             // Room name
  status: 'waiting' | 'playing' | 'finished',
  maxPlayers: 4,
  currentPlayers: string[], // Array of user IDs
  settings: {
    isPrivate: boolean,
    password?: string,
    allowSpectators: boolean
  },
  createdAt: Date,
  startedAt?: Date,
  finishedAt?: Date
}
```

### 3. **mahjongGames**
Stores active game state (real-time game data).

```typescript
{
  gameId: string,
  roomId: string,
  phase: 'starting' | 'playing' | 'cha_jiao' | 'ended',
  players: GamePlayer[],
  wall: Tile[],
  currentPlayerIndex: number,
  dealerIndex: number,
  discardPile: Tile[],
  actionHistory: GameAction[],
  winnersCount: number,
  roundNumber: number,
  createdAt: Date,
  lastActionTime: Date,
  updatedAt: Date
}
```

### 4. **gameHistory**
Stores completed games for statistics and replays.

```typescript
{
  gameId: string,
  roomId: string,
  roomName: string,
  players: HistoryPlayer[],
  winners: string[],        // User IDs who won
  totalRounds: number,
  finalScores: Record<string, number>,
  fanDetails: Record<string, FanDetail[]>,
  duration: number,         // Milliseconds
  completedAt: Date,
  actionCount: number
}
```

### 5. **sessions**
Stores user sessions for authentication.

```typescript
{
  sessionId: string,
  userId: string,
  token: string,
  expiresAt: Date,
  createdAt: Date
}
```

---

## Setup Instructions

### 1. **Environment Variables**

Create a `.env` file in the project root:

```bash
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=mahjong

# Google OAuth (Get from Google Cloud Console)
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Session
SESSION_SECRET=your_random_secret_here
NODE_ENV=development
```

### 2. **Install MongoDB**

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Ubuntu/Debian:**
```bash
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Docker:**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 3. **Initialize Database**

Run the initialization script:

```bash
npm run db:init
```

Or manually:
```bash
npx tsx server/utils/initDB.ts
```

This creates:
- All required collections
- Indexes for performance
- TTL indexes for session expiration

### 4. **Google OAuth Setup**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback`
   - `https://yourdomain.com/api/auth/google/callback`
6. Copy Client ID and Client Secret to `.env`

---

## API Endpoints

### Authentication

#### **POST** `/api/auth/google`
Login with Google OAuth.

**Request:**
```json
{
  "googleId": "123456789",
  "email": "user@gmail.com",
  "name": "John Doe",
  "picture": "https://..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "userId": "uuid",
      "email": "user@gmail.com",
      "name": "John Doe",
      "avatar": "https://...",
      "stats": {...}
    },
    "token": "session-token"
  }
}
```

#### **GET** `/api/auth/me`
Get current user from session.

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@gmail.com",
    "name": "John Doe",
    "avatar": "https://...",
    "stats": {...}
  }
}
```

#### **POST** `/api/auth/logout`
Logout current user.

---

### Rooms

#### **POST** `/api/rooms/create`
Create a new room.

**Request:**
```json
{
  "name": "My Mahjong Room",
  "isPrivate": false,
  "password": "optional",
  "allowSpectators": true
}
```

#### **GET** `/api/rooms/list`
List available rooms.

**Query:** `?includePrivate=true`

#### **POST** `/api/rooms/join`
Join a room.

**Request:**
```json
{
  "roomId": "room-uuid",
  "password": "if-private"
}
```

#### **POST** `/api/rooms/start`
Start game (room owner only, requires 4 players).

**Request:**
```json
{
  "roomId": "room-uuid"
}
```

---

### Games

#### **GET** `/api/games/:id`
Get game state (only shows your tiles).

#### **POST** `/api/games/action`
Execute game action (draw, discard, peng, kong, hu, pass).

---

### History & Stats

#### **GET** `/api/history/user/:userId`
Get user's game history.

#### **GET** `/api/history/game/:gameId`
Get specific game history.

#### **GET** `/api/leaderboard`
Get top players.

---

## Service Layer

### UserService
```typescript
import { UserService } from '~/server/services/userService';

// Create user
await UserService.createUser({ email, name, avatar });

// Get by ID
await UserService.getUserById(userId);

// Update stats
await UserService.updateStats(userId, { gamesWon: 1, scoreChange: 16 });

// Get leaderboard
await UserService.getLeaderboard(10);
```

### RoomService
```typescript
import { RoomService } from '~/server/services/roomService';

// Create room
await RoomService.createRoom({ ownerId, name, isPrivate });

// Join room
await RoomService.joinRoom(roomId, userId, password);

// List rooms
await RoomService.listAvailableRooms();
```

### GameService
```typescript
import { GameService } from '~/server/services/gameService';

// Create game
await GameService.createGame(roomId, players);

// Get game
await GameService.getGameById(gameId);

// Update game
await GameService.updateGame(gameId, { phase: 'ended' });

// Draw tile
await GameService.drawTile(gameId);
```

### GameHistoryService
```typescript
import { GameHistoryService } from '~/server/services/gameHistoryService';

// Save completed game
await GameHistoryService.saveGameHistory(game, finalScores);

// Get user history
await GameHistoryService.getUserHistory(userId);

// Get stats
await GameHistoryService.getUserStatsSummary(userId);
```

---

## Package.json Scripts

Add these to `package.json`:

```json
{
  "scripts": {
    "db:init": "tsx server/utils/initDB.ts",
    "db:cleanup": "tsx server/utils/cleanup.ts",
    "dev": "nuxt dev",
    "build": "nuxt build",
    "start": "node .output/server/index.mjs"
  }
}
```

---

## Migration from In-Memory

### Before (In-Memory):
```typescript
class GameManager {
  private games = new Map<string, GameState>();
  
  getGame(id: string) {
    return this.games.get(id);
  }
}
```

### After (MongoDB):
```typescript
import { GameService } from './services/gameService';

// Now async with database
const game = await GameService.getGameById(gameId);
```

---

## Indexes & Performance

### Automatic Indexes
- **users**: `userId`, `email`, `oauthId`, `stats.totalScore`
- **rooms**: `roomId`, `ownerId`, `status`, `currentPlayers`
- **mahjongGames**: `gameId`, `roomId`, `players.userId`, `phase`
- **gameHistory**: `gameId`, `players.userId`, `winners`, `completedAt`
- **sessions**: `sessionId`, `token`, `expiresAt` (TTL)

### Query Performance
- Indexed queries: ~1-5ms
- Collection scans: ~50-200ms
- Aggregations: ~100-500ms

---

## Data Cleanup

### Automatic Cleanup (TTL Indexes)
- **Sessions**: Expire after 7 days (automatic)

### Manual Cleanup
```typescript
// Clean old games (7+ days)
await GameService.cleanupOldGames();

// Clean old history (90+ days)
await GameHistoryService.cleanupOldHistory();

// Clean expired sessions
await AuthService.cleanupExpiredSessions();
```

---

## Testing

### Test MongoDB Connection
```bash
mongosh
> use mahjong
> db.users.find()
> db.rooms.find()
```

### Test API
```bash
# Create user (Google OAuth)
curl -X POST http://localhost:3000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "googleId": "test123",
    "email": "test@gmail.com",
    "name": "Test User"
  }'

# Create room
curl -X POST http://localhost:3000/api/rooms/create \
  -H "Cookie: mahjong_session=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Room"}'
```

---

## Production Deployment

### MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create cluster
3. Get connection string
4. Update `.env`:
```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
```

### Security
- ✅ Use strong passwords
- ✅ Enable MongoDB authentication
- ✅ Use TLS/SSL in production
- ✅ Restrict IP whitelist
- ✅ Use environment variables
- ✅ Enable audit logging

---

## Troubleshooting

### Connection Failed
```bash
# Check MongoDB is running
mongosh

# Check connection string
echo $MONGODB_URI

# Check firewall
sudo ufw allow 27017
```

### Slow Queries
```javascript
// Enable profiling
db.setProfilingLevel(2);

// Check slow queries
db.system.profile.find().sort({ ts: -1 }).limit(5);
```

### Index Issues
```javascript
// Rebuild indexes
db.users.reIndex();
db.rooms.reIndex();
```

---

## Benefits Over In-Memory

| Feature | In-Memory | MongoDB |
|---------|-----------|---------|
| Persistence | ❌ Lost on restart | ✅ Permanent |
| Scalability | ❌ Single server | ✅ Horizontal scaling |
| Queries | ✅ O(1) lookup | ✅ Indexed queries |
| History | ❌ Must implement | ✅ Built-in |
| Analytics | ❌ Hard | ✅ Aggregations |
| Backup | ❌ Manual | ✅ Automated |

---

## Next Steps

1. ✅ Setup MongoDB
2. ✅ Run `npm run db:init`
3. ✅ Configure Google OAuth
4. ✅ Test authentication
5. ✅ Test room creation
6. ✅ Test game flow
7. 🔜 Build frontend UI
8. 🔜 Deploy to production
