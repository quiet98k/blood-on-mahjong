import { getCollection } from '../utils/mongo'
import type { User } from '../types/database'

export default defineEventHandler(async (event) => {
  try {
    const users = await getCollection<User>('users')

    const allUsers = await users.find({}).toArray()

    return {
      success: true,
      count: allUsers.length,
      users: allUsers.map(user => ({
        userId: user.userId,
        email: user.email,
        name: user.name,
        oauthProvider: user.oauthProvider,
        createdAt: user.createdAt,
        stats: user.stats
      }))
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch users'
    })
  }
})
