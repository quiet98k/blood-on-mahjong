import { getCollection } from '../../utils/mongo'
import type { User } from '../../types/database'
import { randomUUID } from 'crypto'

/**
 * Test Google OAuth flow without actual Google credentials
 * Simulates a Google login
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { email, name } = body

    if (!email || !name) {
      throw createError({
        statusCode: 400,
        message: 'Email and name are required'
      })
    }

    // Simulate Google user data
    const mockGoogleUser = {
      sub: `google-mock-${Date.now()}`,
      email: email,
      name: name,
      picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
    }

    // Check if user exists
    const users = await getCollection<User>('users')
    let user = await users.findOne({ email: mockGoogleUser.email })

    if (!user) {
      // Create new user
      const newUser: User = {
        userId: randomUUID(),
        email: mockGoogleUser.email,
        name: mockGoogleUser.name,
        avatar: mockGoogleUser.picture,
        oauthProvider: 'google',
        oauthId: mockGoogleUser.sub,
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

      return {
        success: true,
        isNewUser: true,
        user: {
          userId: newUser.userId,
          email: newUser.email,
          name: newUser.name,
          avatar: newUser.avatar,
          oauthProvider: newUser.oauthProvider,
          isAdmin: newUser.isAdmin
        },
        message: 'Mock Google user created successfully'
      }
    } else {
      // Update existing user
      await users.updateOne(
        { email: mockGoogleUser.email },
        {
          $set: {
            lastLoginAt: new Date(),
            oauthId: mockGoogleUser.sub,
            oauthProvider: 'google',
            avatar: mockGoogleUser.picture,
            name: mockGoogleUser.name
          }
        }
      )

      const updatedUser = await users.findOne({ email: mockGoogleUser.email })

      return {
        success: true,
        isNewUser: false,
        user: {
          userId: updatedUser!.userId,
          email: updatedUser!.email,
          name: updatedUser!.name,
          avatar: updatedUser!.avatar,
          oauthProvider: updatedUser!.oauthProvider,
          stats: updatedUser!.stats,
          isAdmin: updatedUser!.isAdmin ?? false
        },
        message: 'Mock Google user logged in successfully'
      }
    }
  } catch (error: any) {
    console.error('Mock Google Login Error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to create mock Google user'
    })
  }
})
