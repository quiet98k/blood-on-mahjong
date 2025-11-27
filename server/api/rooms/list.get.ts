import { RoomService } from '../../services/roomService';

/**
 * List available rooms
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const includePrivate = query.includePrivate === 'true';

  try {
    const rooms = await RoomService.listAvailableRooms(includePrivate);

    return {
      success: true,
      data: { rooms }
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to list rooms'
    });
  }
});
