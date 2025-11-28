import { gameManager } from '../../utils/gameManager';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { playerName } = body;

  if (!playerName || typeof playerName !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Player name is required'
    });
  }

  try {
    const result = await gameManager.createGame(playerName);
    
    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to create game'
    });
  }
});
