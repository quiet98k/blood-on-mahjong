import { gameManager } from '../../utils/gameManager';
import { ActionType } from '../../types/game';

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
