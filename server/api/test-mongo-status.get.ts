import { getCollection, getDb } from '../utils/mongo'
import type { User } from '../types/database'

export default defineEventHandler(async (event) => {
  try {
    // Test MongoDB connection
    const db = await getDb()
    const admin = db.admin()
    const serverStatus = await admin.serverStatus()
    
    // List all collections
    const collections = await db.listCollections().toArray()
    
    // Get users collection
    const users = await getCollection<User>('users')
    const userCount = await users.countDocuments()
    const allUsers = await users.find({}).toArray()
    
    return {
      success: true,
      mongodb: {
        connected: true,
        version: serverStatus.version,
        database: db.databaseName
      },
      collections: collections.map(c => c.name),
      users: {
        count: userCount,
        data: allUsers
      }
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      stack: error.stack
    }
  }
})
