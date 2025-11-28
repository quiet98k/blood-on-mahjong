# Sichuan Mahjong (Blood Battle to the End) - Backend API

A complete backend implementation for Sichuan Mahjong (四川麻将 - 血战到底) supporting 4 concurrent players.

## Game Features

- **Blood Battle to the End**: Game continues until 3 players win or wall is exhausted
- **No Chi (吃)**: Players can only Peng (碰) and Kong (杠)
- **Missing One Suit (缺门)**: Must be missing at least one suit to win
- **Seven Pairs (七对)**: Alternative winning pattern
- **Kong Scoring**: Wind (刮风) and Rain (下雨) bonus points
- **Cha Jiao (查叫)**: End-game penalties for Flower Pigs and non-Ting players
- **Complex Fan System**: Multiple fan types with up to 5 fan maximum

## Tech Stack

- **Framework**: Nuxt 3
- **Runtime**: Node.js
- **WebSocket**: Built-in Nuxt WebSocket support (crossws)
- **Storage**: In-memory game state (no database required)

## Project Structure

```
server/
├── api/
│   ├── game/
│   │   ├── create.post.ts      # Create new game
│   │   ├── join.post.ts        # Join existing game
│   │   ├── state.get.ts        # Get game state
│   │   ├── action.post.ts      # Execute game action
│   │   └── list.get.ts         # List all games
│   └── ws.ts                   # WebSocket handler
├── types/
│   └── game.ts                 # TypeScript type definitions
└── utils/
    ├── gameManager.ts          # Game state manager
    ├── tiles.ts                # Tile utilities
    ├── handValidator.ts        # Win condition checker
    └── scoring.ts              # Fan calculation & scoring
```

## API Endpoints

### 1. Create Game
**POST** `/api/game/create`

Create a new game and become the first player (dealer).

**Request:**
```json
{
  "playerName": "Player 1"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "gameId": "uuid-v4",
    "playerId": "uuid-v4"
  }
}
```

### 2. Join Game
**POST** `/api/game/join`

Join an existing game (up to 4 players).

**Request:**
```json
{
  "gameId": "uuid-v4",
  "playerName": "Player 2"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "playerId": "uuid-v4",
    "position": 1
  }
}
```

### 3. Get Game State
**GET** `/api/game/state?gameId={gameId}&playerId={playerId}`

Get current game state for a player.

**Response:**
```json
{
  "success": true,
  "data": {
    "game": {
      "gameId": "uuid-v4",
      "phase": "playing",
      "players": [...],
      "currentPlayerIndex": 0,
      "wallCount": 84,
      "discardPile": [...]
    },
    "playerView": {
      "concealedTiles": [...],
      "exposedMelds": [...],
      "discardedTiles": [...]
    },
    "availableActions": ["discard", "hu", "concealed_kong"]
  }
}
```

### 4. Execute Action
**POST** `/api/game/action`

Execute a game action (draw, discard, peng, kong, hu, pass).

**Request:**
```json
{
  "gameId": "uuid-v4",
  "playerId": "uuid-v4",
  "action": "discard",
  "tileId": "dots-5-0"
}
```

**Response:** Same as Get Game State

### 5. List Games
**GET** `/api/game/list`

List all active games.

**Response:**
```json
{
  "success": true,
  "data": {
    "games": [
      {
        "gameId": "uuid-v4",
        "phase": "playing",
        "playerCount": 4,
        "roundNumber": 1,
        "createdAt": 1234567890
      }
    ]
  }
}
```

## WebSocket API

### Connection
Connect to `/api/ws` for real-time game updates.

### Subscribe to Game
```json
{
  "type": "subscribe",
  "gameId": "uuid-v4",
  "playerId": "uuid-v4"
}
```

### Events Received

**gameStateUpdate**: Sent when game state changes
```json
{
  "event": "gameStateUpdate",
  "data": {
    "gameId": "uuid-v4",
    "phase": "playing",
    "currentPlayerIndex": 1,
    "discardPile": [...],
    "wallCount": 82,
    "winnersCount": 0
  }
}
```

**subscribed**: Confirmation of subscription
```json
{
  "event": "subscribed",
  "data": {
    "gameId": "uuid-v4",
    "playerId": "uuid-v4"
  }
}
```

## Game Actions

### Available Actions

- **draw**: Draw a tile from the wall
- **discard**: Discard a tile from hand
- **peng**: Claim a discard to form a triplet
- **kong**: Claim a discard to form a kong
- **concealed_kong**: Form a kong from 4 identical tiles in hand
- **extended_kong**: Add 4th tile to an exposed triplet
- **hu**: Declare a win
- **pass**: Pass on a pending action

## Game Logic Implementation

### Winning Conditions

1. **Standard Win**: 4 melds (sequences/triplets) + 1 pair
2. **Seven Pairs**: 7 pairs

Both require **missing one suit** (缺门).

### Fan Calculation

**Additional Fans** (累加):
- Root (有根): +1 per set of 4 identical tiles
- Robbing Kong (抢杠): +1
- Kong Discard (杠上炮): +1
- Kong Flower (杠上花): +1
- Heaven/Earth Win: +4

**Hand-Type Fans** (不累加):
- Pure Win (素番): 1
- All Pungs (对对和): 2
- Full Flush (清一色): 3
- Seven Pairs (暗七对): 3
- All Terminals (全带幺): 3
- Pure Terminals (清带幺): 4
- Pure Pungs (清对): 4
- Pure Seven Pairs (清七对): 4
- Jiang Pungs (将对): 4
- **Maximum**: 5 fan (Extreme/极品)

### Scoring

**Winning Score**: Base × 2^(Fan - 1)
- 1 fan = 1 point
- 2 fan = 2 points
- 3 fan = 4 points
- 4 fan = 8 points
- 5 fan = 16 points

**Kong Scores**:
- Direct Kong (点杠): Discarder pays 2
- Extended Kong (续明杠): Each player pays 1
- Concealed Kong (暗杠): Each player pays 2

**Cha Jiao Penalties**:
- Flower Pig (花猪): Pays 16 points to all non-flower-pig players
- Non-Ting Players: Compensate Ting players, lose all kong scores

## Installation & Running

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. The API will be available at `http://localhost:3000/api`

## Example Game Flow

1. **Player 1** creates game → Gets `gameId` and `playerId`
2. **Players 2-4** join using `gameId`
3. Game auto-starts when 4 players join
4. Each player subscribes to WebSocket for real-time updates
5. Players take turns:
   - Draw tile (automatic)
   - Discard tile or perform kong
   - Other players can peng/kong/hu on discard
6. Game continues until 3 players win or wall exhausted
7. Final scores calculated with all bonuses and penalties

## Data Models

### Tile
```typescript
{
  suit: 'dots' | 'wan' | 'tiao',
  value: 1-9,
  id: 'unique-tile-id'
}
```

### Player
```typescript
{
  id: string,
  name: string,
  position: 0-3,
  hand: {
    concealedTiles: Tile[],
    exposedMelds: Meld[],
    discardedTiles: Tile[]
  },
  status: 'waiting' | 'playing' | 'won' | 'lost',
  isDealer: boolean,
  isTing: boolean,
  missingSuit: 'dots' | 'wan' | 'tiao' | null,
  windScore: number,
  rainScore: number,
  wonFan: number
}
```

## Testing

You can test the API using curl or any HTTP client:

```bash
# Create a game
curl -X POST http://localhost:3000/api/game/create \
  -H "Content-Type: application/json" \
  -d '{"playerName":"Alice"}'

# Join a game
curl -X POST http://localhost:3000/api/game/join \
  -H "Content-Type: application/json" \
  -d '{"gameId":"<gameId>","playerName":"Bob"}'

# Get game state
curl "http://localhost:3000/api/game/state?gameId=<gameId>&playerId=<playerId>"

# Execute action
curl -X POST http://localhost:3000/api/game/action \
  -H "Content-Type: application/json" \
  -d '{"gameId":"<gameId>","playerId":"<playerId>","action":"discard","tileId":"dots-1-0"}'
```

## Future Enhancements

- [ ] Persistent storage with MongoDB
- [ ] Player authentication
- [ ] Game history and statistics
- [ ] Replay functionality
- [ ] Tournament mode
- [ ] AI opponents
- [ ] Mobile app support

## License

MIT

## Contributors

Built for CS590 Web Development Course
