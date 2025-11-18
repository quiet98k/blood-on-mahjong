import { MongoClient, Db, Collection, Document } from 'mongodb'

// Cache the client/db across hot-reloads in dev and across route calls
// so we don't create multiple connections.
type GlobalWithMongo = typeof globalThis & {
	_mongoClient?: MongoClient
	_mongoDb?: Db
}

const g = globalThis as GlobalWithMongo

function getMongoUri(): string {
	const uri = process.env.MONGODB_URI
	if (!uri) {
		throw new Error(
			'MONGODB_URI is not set. Add it to your environment (e.g. .env) like:\n' +
				'MONGODB_URI=mongodb://localhost:27017\n' +
				'Optionally set MONGODB_DB for the default database name.'
		)
	}
	return uri
}

function getDefaultDbName(): string {
	return process.env.MONGODB_DB || 'app'
}

export async function getMongoClient(): Promise<MongoClient> {
	if (g._mongoClient) return g._mongoClient

	const client = new MongoClient(getMongoUri())
	// Ensure the connection is valid by pinging admin
	await client.db('admin').command({ ping: 1 })
	g._mongoClient = client
	return client
}

export async function getDb(dbName?: string): Promise<Db> {
	if (g._mongoDb && (!dbName || g._mongoDb.databaseName === dbName)) {
		return g._mongoDb
	}

	const client = await getMongoClient()
	const db = client.db(dbName || getDefaultDbName())
	g._mongoDb = db
	return db
}

export async function getCollection<T extends Document = Document>(
	name: string,
	dbName?: string
): Promise<Collection<T>> {
	const db = await getDb(dbName)
	return db.collection<T>(name)
}

// Optional helper to gracefully close the client; not used in serverless/edge
// but can be called in tests or scripts.
export async function closeMongo(): Promise<void> {
	if (g._mongoClient) {
		await g._mongoClient.close()
		g._mongoClient = undefined
		g._mongoDb = undefined
	}
}

export type { Db, MongoClient, Collection }

