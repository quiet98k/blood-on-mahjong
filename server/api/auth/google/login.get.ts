/**
 * Step 1: Initiate Google OAuth login
 * Redirects user to Google's consent screen
 */
export default defineEventHandler((event) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'

    if (!clientId) {
      throw createError({
        statusCode: 500,
        message: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID in .env'
      })
    }

    // Build Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'openid email profile')
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    
    // Return the URL for frontend to redirect to
    return {
      success: true,
      authUrl: authUrl.toString(),
      message: 'Redirect user to this URL for Google login'
    }
  } catch (error: any) {
    console.error('Google Auth URL Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to generate Google auth URL'
    })
  }
})
