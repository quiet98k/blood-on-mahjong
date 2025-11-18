import { getDb } from '../utils/mongo'

export default defineEventHandler(async () => {
  const db = await getDb()
  // Ping the database to verify connection works
  const result = await db.command({ ping: 1 })
  return { ok: 1, mongo: result }
})
