import { getCollection } from '../utils/mongo'
import type { User } from '../types/database'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { userId, updates } = body

    if (!userId) {
      throw createError({
        statusCode: 400,
        message: 'userId is required'
      })
    }

    const users = await getCollection<User>('users')

    // Find user before update
    const userBefore = await users.findOne({ userId })
    
    if (!userBefore) {
      throw createError({
        statusCode: 404,
        message: `User with userId ${userId} not found`
      })
    }

    // Prepare update data
    const updateData: Partial<User> = {
      ...updates,
      lastLoginAt: new Date() // Always update last login
    }

    // Remove fields that shouldn't be updated
    delete (updateData as any).userId
    delete (updateData as any)._id

    // Update user
    const result = await users.updateOne(
      { userId },
      { $set: updateData }
    )

    // Get updated user
    const userAfter = await users.findOne({ userId })

    return {
      success: true,
      matched: result.matchedCount,
      modified: result.modifiedCount,
      userId,
      before: userBefore,
      after: userAfter,
      message: 'User updated successfully'
    }
  } catch (error: any) {
    console.error('Update Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to update user'
    })
  }
})
