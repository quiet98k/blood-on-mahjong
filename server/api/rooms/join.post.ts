import { RoomService } from '../../services/roomService';
import { AuthService } from '../../services/authService';

/**
 * Join a room
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
  const { roomId, password } = body;

  if (!roomId) {
    throw createError({
      statusCode: 400,
      message: 'Room ID is required'
    });
  }

  try {
    const room = await RoomService.joinRoom(roomId, userId, password);

    return {
      success: true,
      data: room
    };
  } catch (error: any) {
    throw createError({
      statusCode: 400,
      message: error.message || 'Failed to join room'
    });
  }
});
