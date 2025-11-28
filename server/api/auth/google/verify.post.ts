import { getCollection } from '../../../utils/mongo'
import type { User } from '../../../types/database'
import { randomUUID } from 'crypto'

/**
 * Alternative: Direct token verification (for frontend that uses Google Sign-In button)
 * Frontend gets ID token directly from Google, sends it here for verification
 * 
 * NOTE: Install google-auth-library for full functionality:
 * npm install google-auth-library
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { idToken } = body

    if (!idToken) {
      throw createError({
        statusCode: 400,
        message: 'ID token is required'
      })
    }

    // Verify the token with google-auth-library
    const { OAuth2Client } = await import('google-auth-library')
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
    
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    })

    const payload = ticket.getPayload()
    if (!payload) {
      throw createError({
        statusCode: 400,
        message: 'Invalid Google token'
      })
    }

    const googleUser = {
      sub: payload.sub,
      email: payload.email!,
      name: payload.name!,
      picture: payload.picture!
    }

    // Check if user exists
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
        oauthId: googleUser.sub,
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

      const result = await users.insertOne(newUser)
      user = newUser

      return {
        success: true,
        isNewUser: true,
        user: {
          userId: user.userId,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          oauthProvider: user.oauthProvider
        },
        message: 'New user created and logged in'
      }
    } else {
      // Update existing user
      await users.updateOne(
        { email: googleUser.email },
        {
          $set: {
            lastLoginAt: new Date(),
            oauthId: googleUser.sub,
            oauthProvider: 'google',
            avatar: googleUser.picture,
            name: googleUser.name
          }
        }
      )

      // Fetch updated user
      const updatedUser = await users.findOne({ email: googleUser.email })

      return {
        success: true,
        isNewUser: false,
        user: {
          userId: updatedUser!.userId,
          email: updatedUser!.email,
          name: updatedUser!.name,
          avatar: updatedUser!.avatar,
          oauthProvider: updatedUser!.oauthProvider,
          stats: updatedUser!.stats
        },
        message: 'User logged in successfully'
      }
    }
  } catch (error: any) {
    console.error('Google Verify Token Error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to verify Google token'
    })
  }
})
