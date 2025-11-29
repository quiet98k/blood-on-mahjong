import { getCollection } from '../../../utils/mongo'
import type { User } from '../../../types/database'
import { randomUUID } from 'crypto'
import { setCookie } from 'h3'

interface GoogleUserPayload {
  sub: string
  email: string
  name: string
  picture?: string
}

/**
 * Step 2: Google OAuth callback
 * Handles the redirect from Google after user consents
 * 
 * NOTE: Install google-auth-library for full functionality:
 * npm install google-auth-library
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const code = query.code as string

    if (!code) {
      throw createError({
        statusCode: 400,
        message: 'Authorization code is required'
      })
    }

    console.log('[GoogleOAuth] Received callback with code')

    const client = await createOAuthClient()
    const { tokens, googleUser } = await exchangeCodeForProfile(client, code)

    console.log('[GoogleOAuth] Google user verified', { email: googleUser.email, sub: googleUser.sub })

    // Check if user exists in database
    const users = await getCollection<User>('users')
    const existingUser = await users.findOne({ email: googleUser.email })
    let user: User

    if (!existingUser) {
      console.log('[GoogleOAuth] Creating new user', googleUser.email)
      // Create new user
      const newUser: User = {
        userId: randomUUID(),
        email: googleUser.email,
        name: googleUser.name,
        avatar: googleUser.picture,
        oauthProvider: 'google',
        oauthId: googleUser.sub,
        isAdmin: false,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        stats: {
          gamesPlayed: 0,
          gamesWon: 0,
          totalScore: 0,
          highestFan: 0,
          winRate: 0
        }
      }

      await users.insertOne(newUser)
      user = newUser
    } else {
      console.log('[GoogleOAuth] Existing user login', googleUser.email)
      // Update existing user's last login and Google ID
      await users.updateOne(
        { email: googleUser.email },
        {
          $set: {
            lastLoginAt: new Date(),
            oauthId: googleUser.sub,
            oauthProvider: 'google',
            avatar: googleUser.picture, // Update avatar in case it changed
            name: googleUser.name // Update name in case it changed
          }
        }
      )
      user = {
        ...existingUser,
        lastLoginAt: new Date(),
        avatar: googleUser.picture,
        name: googleUser.name,
        oauthProvider: 'google',
        oauthId: googleUser.sub
      }
    }

    const sessionToken = tokens.access_token ?? `session-${user.userId}`

    console.log('[GoogleOAuth] Setting auth cookie and redirecting', { userId: user.userId })

    setCookie(event, 'auth_token', sessionToken, {
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    })
    setCookie(event, 'user_name', user.name, { path: '/', maxAge: 60 * 60 * 24 * 7 })
    setCookie(event, 'is_admin', user.isAdmin ? 'true' : 'false', { path: '/', maxAge: 60 * 60 * 24 * 7 })

    return sendRedirect(event, '/', 302)
  } catch (error: any) {
    console.error('Google OAuth Callback Error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to process Google login'
    })
  }
})

async function createOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw createError({
      statusCode: 500,
      message: 'Google OAuth environment variables missing. Set GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI.'
    })
  }

  let OAuth2Client: any
  try {
    ;({ OAuth2Client } = await import('google-auth-library'))
  } catch (err) {
    throw createError({
      statusCode: 500,
      message: 'google-auth-library is required. Run: npm install google-auth-library'
    })
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri)
}

async function exchangeCodeForProfile(client: any, code: string): Promise<{ tokens: any; googleUser: GoogleUserPayload }> {
  const { tokens } = await client.getToken(code)

  if (!tokens.id_token) {
    throw createError({
      statusCode: 400,
      message: 'No ID token received from Google'
    })
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID
  })

  const payload = ticket.getPayload()
  if (!payload || !payload.email || !payload.name || !payload.sub) {
    throw createError({
      statusCode: 400,
      message: 'Invalid token payload'
    })
  }

  const googleUser: GoogleUserPayload = {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture
  }

  return { tokens, googleUser }
}
