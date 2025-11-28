import { gameManager } from '../../utils/gameManager';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId } = body;

  if (!gameId || !playerId) {
    throw createError({
      statusCode: 400,
      message: 'Game ID and player ID are required'
    });
  }

  const game = gameManager.getGame(gameId);
  if (!game) {
    throw createError({
      statusCode: 404,
      message: 'Game not found'
    });
  }

  // Check if player is the dealer (creator)
  const player = game.players.find(p => p.id === playerId);
  if (!player) {
    throw createError({
      statusCode: 404,
      message: 'Player not found in this game'
    });
  }

  if (!player.isDealer) {
    throw createError({
      statusCode: 403,
      message: 'Only the dealer can start the game'
    });
  }

  try {
    gameManager.startGame(gameId);
    
    return {
      success: true,
      message: 'Game started'
    };
  } catch (error: any) {
    throw createError({
      statusCode: 400,
      message: error.message || 'Failed to start game'
    });
  }
});
