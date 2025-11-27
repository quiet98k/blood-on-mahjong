import { getDb } from './mongo';

/**
 * Initialize MongoDB collections and indexes
 */
export async function initializeDatabase() {
  console.log('Initializing MongoDB database...');
  
  try {
    const db = await getDb();

    // Create collections if they don't exist
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    const requiredCollections = ['users', 'rooms', 'mahjongGames', 'gameHistory', 'sessions'];

    for (const name of requiredCollections) {
      if (!collectionNames.includes(name)) {
        await db.createCollection(name);
        console.log(`✓ Created collection: ${name}`);
      }
    }

    // Create indexes for users collection
    const usersCollection = db.collection('users');
    await usersCollection.createIndex({ userId: 1 }, { unique: true });
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ oauthId: 1 }, { sparse: true });
    await usersCollection.createIndex({ 'stats.totalScore': -1 });
    console.log('✓ Created indexes for users collection');

    // Create indexes for rooms collection
    const roomsCollection = db.collection('rooms');
    await roomsCollection.createIndex({ roomId: 1 }, { unique: true });
    await roomsCollection.createIndex({ ownerId: 1 });
    await roomsCollection.createIndex({ status: 1 });
    await roomsCollection.createIndex({ currentPlayers: 1 });
    await roomsCollection.createIndex({ createdAt: -1 });
    console.log('✓ Created indexes for rooms collection');

    // Create indexes for mahjongGames collection
    const gamesCollection = db.collection('mahjongGames');
    await gamesCollection.createIndex({ gameId: 1 }, { unique: true });
    await gamesCollection.createIndex({ roomId: 1 });
    await gamesCollection.createIndex({ 'players.userId': 1 });
    await gamesCollection.createIndex({ phase: 1 });
    await gamesCollection.createIndex({ lastActionTime: -1 });
    await gamesCollection.createIndex({ updatedAt: -1 });
    console.log('✓ Created indexes for mahjongGames collection');

    // Create indexes for gameHistory collection
    const historyCollection = db.collection('gameHistory');
    await historyCollection.createIndex({ gameId: 1 }, { unique: true });
    await historyCollection.createIndex({ roomId: 1 });
    await historyCollection.createIndex({ 'players.userId': 1 });
    await historyCollection.createIndex({ winners: 1 });
    await historyCollection.createIndex({ completedAt: -1 });
    console.log('✓ Created indexes for gameHistory collection');

    // Create indexes for sessions collection
    const sessionsCollection = db.collection('sessions');
    await sessionsCollection.createIndex({ sessionId: 1 }, { unique: true });
    await sessionsCollection.createIndex({ userId: 1 });
    await sessionsCollection.createIndex({ token: 1 }, { unique: true });
    await sessionsCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
    console.log('✓ Created indexes for sessions collection');

    console.log('✅ Database initialization complete!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase()
    .then(() => {
      console.log('Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}
