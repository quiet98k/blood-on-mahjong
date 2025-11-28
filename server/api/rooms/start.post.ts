import { RoomService } from '../../services/roomService';
import { GameService } from '../../services/gameService';
import { AuthService } from '../../services/authService';
import { UserService } from '../../services/userService';

/**
 * Start a game in a room
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

  const body = await readBody(event);
  const { roomId } = body;

  if (!roomId) {
    throw createError({
      statusCode: 400,
      message: 'Room ID is required'
    });
  }

  try {
    const room = await RoomService.getRoomById(roomId);
    
    if (!room) {
      throw createError({
        statusCode: 404,
        message: 'Room not found'
      });
    }

    if (room.ownerId !== userId) {
      throw createError({
        statusCode: 403,
        message: 'Only room owner can start the game'
      });
    }

    if (room.currentPlayers.length !== 4) {
      throw createError({
        statusCode: 400,
        message: 'Need exactly 4 players to start'
      });
    }

    if (room.status !== 'waiting') {
      throw createError({
        statusCode: 400,
        message: 'Room has already started'
      });
    }

    // Get player names
    const players = await Promise.all(
      room.currentPlayers.map(async (playerId) => {
        const user = await UserService.getUserById(playerId);
        return {
          userId: playerId,
          name: user?.name || 'Unknown'
        };
      })
    );

    // Create game
    const game = await GameService.createGame(roomId, players);

    // Update room status
    await RoomService.updateRoomStatus(roomId, 'playing');

    return {
      success: true,
      data: {
        gameId: game.gameId,
        room: await RoomService.getRoomById(roomId)
      }
    };
  } catch (error: any) {
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to start game'
    });
  }
});
