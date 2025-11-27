import { GameService } from '../../services/gameService';
import { AuthService } from '../../services/authService';

/**
 * Get game state by ID
 */
export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'mahjong_session');
  
  if (!token) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated'
    });
  }

  const userId = await AuthService.validateSession(token);
  if (!userId) {
    throw createError({
      statusCode: 401,
      message: 'Invalid session'
    });
  }

  const gameId = getRouterParam(event, 'id');
  
  if (!gameId) {
    throw createError({
      statusCode: 400,
      message: 'Game ID is required'
    });
  }

  try {
    const game = await GameService.getGameById(gameId);
    
    if (!game) {
      throw createError({
        statusCode: 404,
        message: 'Game not found'
      });
    }

    // Check if user is in this game
    const isPlayer = game.players.some(p => p.userId === userId);
    if (!isPlayer) {
      throw createError({
        statusCode: 403,
        message: 'Not a player in this game'
      });
    }

    // Hide other players' concealed tiles
    const sanitizedGame = {
      ...game,
      players: game.players.map(p => ({
        ...p,
        hand: {
          ...p.hand,
          concealedTiles: p.userId === userId ? p.hand.concealedTiles : []
        }
      })),
      wall: [] // Don't send wall tiles to client
    };

    return {
      success: true,
      data: sanitizedGame
    };
  } catch (error: any) {
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to get game'
    });
  }
});
