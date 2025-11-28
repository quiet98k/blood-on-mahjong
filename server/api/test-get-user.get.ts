import { getCollection } from '../utils/mongo'
import type { User } from '../types/database'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { userId } = query

    if (!userId) {
      throw createError({
        statusCode: 400,
        message: 'userId query parameter is required'
      })
    }

    const users = await getCollection<User>('users')
    const user = await users.findOne({ userId: userId as string })

    if (!user) {
      throw createError({
        statusCode: 404,
        message: `User with userId ${userId} not found`
      })
    }

    return {
      success: true,
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        oauthProvider: user.oauthProvider,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        stats: user.stats
      }
    }
  } catch (error: any) {
    console.error('Get User Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to get user'
    })
  }
})
