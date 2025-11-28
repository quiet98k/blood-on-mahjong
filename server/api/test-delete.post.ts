import { getCollection } from '../utils/mongo'
import type { User } from '../types/database'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { userId } = body

    if (!userId) {
      throw createError({
        statusCode: 400,
        message: 'userId is required'
      })
    }

    const users = await getCollection<User>('users')

    // Find user before deletion
    const userToDelete = await users.findOne({ userId })
    
    if (!userToDelete) {
      throw createError({
        statusCode: 404,
        message: `User with userId ${userId} not found`
      })
    }

    // Delete user
    const result = await users.deleteOne({ userId })

    // Get remaining count
    const remainingCount = await users.countDocuments()

    return {
      success: true,
      deleted: result.deletedCount > 0,
      deletedCount: result.deletedCount,
      remainingUsers: remainingCount,
      deletedUser: {
        userId: userToDelete.userId,
        email: userToDelete.email,
        name: userToDelete.name
      },
      message: 'User deleted successfully'
    }
  } catch (error: any) {
    console.error('Delete Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to delete user'
    })
  }
})
