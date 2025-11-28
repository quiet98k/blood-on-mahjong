import { AuthService } from '../../services/authService';

/**
 * Logout endpoint
 */
export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'mahjong_session');

  if (token) {
    await AuthService.deleteSession(token);
  }

  // Clear cookie
  deleteCookie(event, 'mahjong_session');

  return {
    success: true,
    message: 'Logged out successfully'
  };
});
