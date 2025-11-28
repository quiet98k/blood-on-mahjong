import { AuthService } from '../../services/authService';

/**
 * Google OAuth Login Endpoint
 * 
 * In production, you would:
 * 1. Redirect to Google OAuth consent screen
 * 2. Handle callback with authorization code
 * 3. Exchange code for tokens
 * 4. Get user profile from Google
 * 
 * For now, this accepts Google profile data directly
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { googleId, email, name, picture } = body;

  if (!googleId || !email || !name) {
    throw createError({
      statusCode: 400,
      message: 'Missing required Google profile data'
    });
  }

  try {
    const { user, session } = await AuthService.handleGoogleAuth({
      id: googleId,
      email,
      name,
      picture
    });

    // Set cookie for session
    setCookie(event, 'mahjong_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    return {
      success: true,
      data: {
        user: {
          userId: user.userId,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          stats: user.stats,
          isAdmin: user.isAdmin
        },
        token: session.token
      }
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Authentication failed'
    });
  }
});
