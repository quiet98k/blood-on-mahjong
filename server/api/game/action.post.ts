import { gameManager } from '../../utils/gameManager';
import { ActionType } from '../../types/game';
import { emitToRoom } from '../../utils/socket';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, action, tileId, tileIds } = body;

  if (!gameId || !playerId || !action) {
    throw createError({
      statusCode: 400,
      message: 'Game ID, player ID, and action are required'
    });
  }

  // Validate action type
  if (!Object.values(ActionType).includes(action)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid action type'
    });
  }

  try {
    gameManager.executeAction(gameId, playerId, action, tileId, tileIds);
    
    const game = gameManager.getGame(gameId);
    const player = game?.players.find(p => p.id === playerId);

    // Broadcast game state to all players in the room via Socket.IO
    emitToRoom(gameId, 'game:state-changed', {
      gameId,
      currentPlayerIndex: game?.currentPlayerIndex,
      phase: game?.phase,
      roundNumber: game?.roundNumber,
      players: game!.players.map(p => ({
        id: p.id,
        name: p.name,
        position: p.position,
        discardedTiles: p.hand.discardedTiles,
        exposedMelds: p.hand.exposedMelds,
        status: p.status,
        windScore: p.windScore,
        rainScore: p.rainScore,
        handSize: p.hand.concealedTiles.length
      })),
      lastAction: {
        playerId,
        action,
        tileId
      }
    });

    const availableActions = gameManager.getAvailableActions(gameId, playerId);

    return {
      success: true,
      data: {
        game: {
          ...game,
          players: game!.players.map(p => ({
            ...p,
            hand: {
              ...p.hand,
              concealedTiles: p.id === playerId ? p.hand.concealedTiles : []
            }
          }))
        },
        playerView: player?.hand,
        availableActions
      }
    };
  } catch (error: any) {
    throw createError({
      statusCode: 400,
      message: error.message || 'Failed to execute action'
    });
  }
});
