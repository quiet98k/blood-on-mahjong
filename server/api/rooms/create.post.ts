import { RoomService } from '../../services/roomService';
import { AuthService } from '../../services/authService';

/**
 * Create a new room
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
  const { name, isPrivate, password, allowSpectators } = body;

  if (!name) {
    throw createError({
      statusCode: 400,
      message: 'Room name is required'
    });
  }

  try {
    const room = await RoomService.createRoom({
      ownerId: userId,
      name,
      isPrivate,
      password,
      allowSpectators
    });

    return {
      success: true,
      data: room
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to create room'
    });
  }
});
