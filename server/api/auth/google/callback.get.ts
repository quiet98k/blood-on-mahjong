import { getCollection } from '../../../utils/mongo'
import type { User } from '../../../types/database'
import { randomUUID } from 'crypto'

/**
 * Step 2: Google OAuth callback
 * Handles the redirect from Google after user consents
 * 
 * NOTE: Install google-auth-library for full functionality:
 * npm install google-auth-library
 */
export default defineEventHandler(async (event) => {
  try {
    throw createError({
      statusCode: 501,
      message: 'Google OAuth callback requires google-auth-library package. Run: npm install google-auth-library'
    })

    // The code below will work after installing google-auth-library
    /*
    const query = getQuery(event)
    const code = query.code as string

    if (!code) {
      throw createError({
        statusCode: 400,
        message: 'Authorization code is required'
      })
    }

    // This requires google-auth-library to be installed
    const { OAuth2Client } = await import('google-auth-library')
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )
    
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
    if (!payload) {
      throw createError({
        statusCode: 400,
        message: 'Invalid token payload'
      })
    }

    const googleUser = {
      sub: payload.sub,
      email: payload.email!,
      name: payload.name!,
      picture: payload.picture!
    }
    */

    // Check if user exists in database
    const users = await getCollection<User>('users')
    let user = await users.findOne({ email: googleUser.email })

    if (!user) {
      // Create new user
      const newUser: User = {
        userId: randomUUID(),
        email: googleUser.email,
        name: googleUser.name,
        avatar: googleUser.picture,
        oauthProvider: 'google',
        googleId: googleUser.sub,
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
      // Update existing user's last login and Google ID
      await users.updateOne(
        { email: googleUser.email },
        {
          $set: {
            lastLoginAt: new Date(),
            googleId: googleUser.sub,
            oauthProvider: 'google',
            avatar: googleUser.picture, // Update avatar in case it changed
            name: googleUser.name // Update name in case it changed
          }
        }
      )
      user.lastLoginAt = new Date()
    }

    // In production, you'd create a session/JWT here
    // For now, return user info
    return {
      success: true,
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
          oauthProvider: user.oauthProvider,
          isAdmin: user.isAdmin ?? false
      },
      tokens: {
        accessToken: tokens.access_token,
        // Don't expose refresh token in response
      },
      message: user ? 'User logged in successfully' : 'New user created and logged in'
    }
  } catch (error: any) {
    console.error('Google OAuth Callback Error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to process Google login'
    })
  }
})
