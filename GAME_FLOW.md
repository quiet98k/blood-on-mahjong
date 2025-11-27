# Sichuan Mahjong Game Flow Quick Reference

## Game Setup Phase

1. **Create Game**
   - First player calls `POST /api/game/create`
   - Receives `gameId` and `playerId`
   - Becomes the dealer (position 0)

2. **Players Join**
   - 3 more players call `POST /api/game/join` with the `gameId`
   - Each receives their `playerId` and `position` (1-3)
   - Game automatically starts when 4th player joins

3. **Initial Deal**
   - Each player receives 13 tiles
   - Dealer draws 14th tile and starts first turn
   - Game phase changes to `PLAYING`

## Turn Flow

### Current Player's Turn (has 14 tiles)

1. **Available Actions:**
   - **DISCARD** (required): Choose a tile to discard
   - **HU**: Win if hand is complete and missing one suit
   - **CONCEALED_KONG**: If holding 4 identical tiles
   - **EXTENDED_KONG**: If can add 4th tile to exposed triplet

2. **After Discard:**
   - Other players get opportunity to:
     - **PENG**: If they have 2 matching tiles
     - **KONG**: If they have 3 matching tiles  
     - **HU**: If discard completes their winning hand
     - **PASS**: Skip the opportunity
   - Actions have 30-second timeout

### Next Player's Turn

- If no one claims discard → next player draws
- If someone claims → that player's turn after action
- After PENG/KONG → must discard
- After HU → winner marked, game continues

## Winning (HU)

### Requirements
1. Valid winning pattern:
   - **Standard**: 4 melds + 1 pair (14 tiles)
   - **Seven Pairs**: 7 pairs (14 tiles)
2. **Missing one suit** (缺门) - no tiles from one suit

### After First Win
- Player marked as WON
- Game continues for remaining players
- Winners count increments
- Game ends when:
  - 3 players have won, OR
  - Wall runs out of tiles

## Special Actions

### Peng (碰)
- Claim discard with 2 matching tiles
- Forms exposed triplet
- Player must discard after

### Kong (杠)

**Direct Kong (点杠):**
- Claim discard with 3 matching tiles
- Discarder pays 2 points
- Draw supplement tile from wall

**Concealed Kong (暗杠):**
- Declare with 4 identical tiles in hand
- Each other player pays 2 points  
- Draw supplement tile

**Extended Kong (续明杠):**
- Add 4th tile to existing exposed triplet
- Each other player pays 1 point
- Draw supplement tile

### Kong Then Discard Rule
- If you make kong then discard
- Someone wins on your discard
- Transfer all your kong earnings to winner

## End Game (Cha Jiao)

When game ends, check remaining non-winners:

### Flower Pig (花猪)
- Player holding all 3 suits
- Pays 16 points to ALL other players (including winners)

### Non-Ting (未听)
- Not in listening state (can't win on next tile)
- Compensates all Ting players
- Loses all kong scores earned

### Final Scoring
1. Base winning scores
2. Kong bonuses (wind/rain)
3. Cha Jiao penalties
4. Final tallies

## Fan Calculation Quick Reference

| Fan Count | Name | Score |
|-----------|------|-------|
| 1 | One-Fan Win | 1 |
| 2 | Two-Fan Win | 2 |
| 3 | Small Grand Slam | 4 |
| 4 | Big Grand Slam | 8 |
| 5 | Extreme | 16 |

### Getting to 5 Fan (Examples)

- Pure Seven Pairs (4) + Root (1) = 5 ✓
- Full Flush (3) + All Pungs (cannot stack) ✗
- Pure Terminals (4) + Root (1) = 5 ✓
- Any base + Kong Flower (1) + 3 Roots (3) + Heaven (4) = capped at 5 ✓

## WebSocket Events

### Subscribe
```json
{"type": "subscribe", "gameId": "...", "playerId": "..."}
```

### Receive Updates
- `gameStateUpdate`: After every action
- `subscribed`: Confirmation
- `pong`: Response to ping

## Action Validation

The backend validates:
- ✓ Player's turn
- ✓ Valid tile selection
- ✓ Correct tile count in hand
- ✓ Win pattern validation
- ✓ Missing suit requirement
- ✓ Kong tile availability
- ✓ Pending action timeouts

## Error Handling

Common errors:
- `400`: Invalid request (missing params, invalid action)
- `404`: Game/player not found
- `500`: Server error

All responses include:
```json
{
  "success": true/false,
  "data": {...} or "message": "error"
}
```

## Development Tips

1. **Test with Postman/Insomnia** - Save requests for quick testing
2. **Use WebSocket Client** - Test real-time updates
3. **Check Console Logs** - Server logs all actions
4. **Monitor Game State** - Use `/api/game/state` frequently

## Complete Example Sequence

```bash
# 1. Player 1 creates game
POST /api/game/create {"playerName":"Alice"}
# → gameId: abc, playerId: p1

# 2. Players 2-4 join
POST /api/game/join {"gameId":"abc","playerName":"Bob"}
POST /api/game/join {"gameId":"abc","playerName":"Carol"}
POST /api/game/join {"gameId":"abc","playerName":"Dave"}
# → Game starts automatically

# 3. Subscribe to WebSocket
WS /api/ws {"type":"subscribe","gameId":"abc","playerId":"p1"}

# 4. Alice (dealer) has 14 tiles, must discard
POST /api/game/action {"gameId":"abc","playerId":"p1","action":"discard","tileId":"dots-1-0"}

# 5. Bob can peng
POST /api/game/action {"gameId":"abc","playerId":"p2","action":"peng"}

# 6. Bob must discard after peng
POST /api/game/action {"gameId":"abc","playerId":"p2","action":"discard","tileId":"wan-5-2"}

# 7. Continue until 3 players win or wall exhausted...
```
