import { AuthService } from '../../services/authService';
import { UserService } from '../../services/userService';

/**
 * Get current user from session
 */
export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'mahjong_session');

  if (!token) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated'
    });
  }

  try {
    const userId = await AuthService.validateSession(token);
    
    if (!userId) {
      throw createError({
        statusCode: 401,
        message: 'Invalid or expired session'
      });
    }

    const user = await UserService.getUserById(userId);
    
    if (!user) {
      throw createError({
        statusCode: 404,
        message: 'User not found'
      });
    }

    return {
      success: true,
      data: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        stats: user.stats,
        isAdmin: user.isAdmin ?? false
      }
    };
  } catch (error: any) {
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      message: 'Failed to get user'
    });
  }
});
