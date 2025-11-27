import { gameManager } from '../../utils/gameManager';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerName } = body;

  if (!gameId || !playerName) {
    throw createError({
      statusCode: 400,
      message: 'Game ID and player name are required'
    });
  }

  try {
    const result = gameManager.joinGame(gameId, playerName);
    
    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    throw createError({
      statusCode: 400,
      message: error.message || 'Failed to join game'
    });
  }
});
