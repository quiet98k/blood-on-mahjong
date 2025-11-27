import { getCollection } from '../utils/mongo';
import type { Session } from '../types/database';
import { UserService } from './userService';
import { randomUUID } from 'crypto';

export class AuthService {
  private static COLLECTION_NAME = 'sessions';

  /**
   * Create session for user
   */
  static async createSession(userId: string): Promise<{ sessionId: string; token: string }> {
    const collection = await getCollection<Session>(this.COLLECTION_NAME);
    
    const sessionId = randomUUID();
    const token = randomUUID(); // In production, use JWT
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const session: Session = {
      sessionId,
      userId,
      token,
      expiresAt,
      createdAt: new Date()
    };

    await collection.insertOne(session);
    return { sessionId, token };
  }

  /**
   * Validate session token
   */
  static async validateSession(token: string): Promise<string | null> {
    const collection = await getCollection<Session>(this.COLLECTION_NAME);
    
    const session = await collection.findOne({ 
      token,
      expiresAt: { $gt: new Date() }
    });

    return session?.userId || null;
  }

  /**
   * Delete session (logout)
   */
  static async deleteSession(token: string): Promise<void> {
    const collection = await getCollection<Session>(this.COLLECTION_NAME);
    await collection.deleteOne({ token });
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    const collection = await getCollection<Session>(this.COLLECTION_NAME);
    const result = await collection.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    return result.deletedCount;
  }

  /**
   * Handle Google OAuth callback
   */
  static async handleGoogleAuth(googleProfile: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  }): Promise<{ user: any; session: { sessionId: string; token: string } }> {
    // Upsert user from Google profile
    const user = await UserService.upsertGoogleUser({
      googleId: googleProfile.id,
      email: googleProfile.email,
      name: googleProfile.name,
      avatar: googleProfile.picture
    });

    // Create session
    const session = await this.createSession(user.userId);

    return { user, session };
  }
}
