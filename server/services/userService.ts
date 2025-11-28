import { getCollection } from '../utils/mongo';
import type { User } from '../types/database';
import { randomUUID } from 'crypto';

export class UserService {
  private static COLLECTION_NAME = 'users';

  /**
   * Create a new user (for local registration)
   */
  static async createUser(data: {
    email: string;
    name: string;
    avatar?: string;
    isAdmin?: boolean;
  }): Promise<User> {
    const collection = await getCollection<User>(this.COLLECTION_NAME);
    
    const user: User = {
      userId: randomUUID(),
      email: data.email,
      name: data.name,
      avatar: data.avatar,
      oauthProvider: 'local',
      isAdmin: data.isAdmin ?? false,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
        highestFan: 0,
        winRate: 0
      }
    };

    await collection.insertOne(user);
    return user;
  }

  /**
   * Create or update user from Google OAuth
   */
  static async upsertGoogleUser(profile: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
  }): Promise<User> {
    const collection = await getCollection<User>(this.COLLECTION_NAME);
    
    // Check if user exists
    const existingUser = await collection.findOne({ 
      oauthProvider: 'google',
      oauthId: profile.googleId 
    });

    if (existingUser) {
      // Update last login and profile
      await collection.updateOne(
        { userId: existingUser.userId },
        { 
          $set: { 
            lastLoginAt: new Date(),
            name: profile.name,
            avatar: profile.avatar,
            email: profile.email
          } 
        }
      );
      return { ...existingUser, lastLoginAt: new Date() };
    }

    // Create new user
    const newUser: User = {
      userId: randomUUID(),
      email: profile.email,
      name: profile.name,
      avatar: profile.avatar,
      oauthProvider: 'google',
      oauthId: profile.googleId,
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
    };

    await collection.insertOne(newUser);
    return newUser;
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<User | null> {
    const collection = await getCollection<User>(this.COLLECTION_NAME);
    return await collection.findOne({ userId });
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    const collection = await getCollection<User>(this.COLLECTION_NAME);
    return await collection.findOne({ email });
  }

  /**
   * Update user stats after game
   */
  static async updateStats(userId: string, updates: {
    gamesPlayed?: number;
    gamesWon?: number;
    scoreChange?: number;
    highestFan?: number;
  }): Promise<void> {
    const collection = await getCollection<User>(this.COLLECTION_NAME);
    
    const user = await this.getUserById(userId);
    if (!user) return;

    const newStats = { ...user.stats };
    if (updates.gamesPlayed) newStats.gamesPlayed += updates.gamesPlayed;
    if (updates.gamesWon) newStats.gamesWon += updates.gamesWon;
    if (updates.scoreChange) newStats.totalScore += updates.scoreChange;
    if (updates.highestFan && updates.highestFan > newStats.highestFan) {
      newStats.highestFan = updates.highestFan;
    }
    newStats.winRate = newStats.gamesPlayed > 0 
      ? newStats.gamesWon / newStats.gamesPlayed 
      : 0;

    await collection.updateOne(
      { userId },
      { $set: { stats: newStats } }
    );
  }

  /**
   * Get leaderboard
   */
  static async getLeaderboard(limit: number = 10): Promise<User[]> {
    const collection = await getCollection<User>(this.COLLECTION_NAME);
    return await collection
      .find({})
      .sort({ 'stats.totalScore': -1 })
      .limit(limit)
      .toArray();
  }
}
