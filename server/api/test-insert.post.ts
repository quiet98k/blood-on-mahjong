import { getCollection, getDb } from '../utils/mongo'
import type { User } from '../types/database'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  try {
    // Get database info
    const db = await getDb()
    const dbName = db.databaseName
    
    // Get users collection
    const users = await getCollection<User>('users')

    const testUser: User = {
      userId: randomUUID(),
      email: `test-${Date.now()}@example.com`, // Unique email each time
      name: 'Test User 2',
      avatar: 'https://ui-avatars.com/api/?name=Test+User',
      oauthProvider: 'local',
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

    const result = await users.insertOne(testUser)
    
    // Verify insertion
    const insertedUser = await users.findOne({ _id: result.insertedId })
    const totalCount = await users.countDocuments()

    return {
      success: true,
      insertedId: result.insertedId.toString(),
      userId: testUser.userId,
      database: dbName,
      collection: 'users',
      totalUsersInDB: totalCount,
      verifiedInsertion: insertedUser !== null,
      insertedUser: insertedUser,
      message: 'User inserted successfully',
      instructions: `Check MongoDB Compass:\n1. Database: "${dbName}"\n2. Collection: "users"\n3. Document count should be: ${totalCount}`
    }
  } catch (error: any) {
    console.error('MongoDB Insert Error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to insert user',
      stack: error.stack
    })
  }
})
