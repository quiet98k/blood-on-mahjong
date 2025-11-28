import { getCollection } from '../utils/mongo';
import type { Room } from '../types/database';
import { randomUUID } from 'crypto';

export class RoomService {
  private static COLLECTION_NAME = 'rooms';

  /**
   * Create a new room
   */
  static async createRoom(data: {
    ownerId: string;
    name: string;
    isPrivate?: boolean;
    password?: string;
    allowSpectators?: boolean;
  }): Promise<Room> {
    const collection = await getCollection<Room>(this.COLLECTION_NAME);
    
    const room: Room = {
      roomId: randomUUID(),
      ownerId: data.ownerId,
      name: data.name,
      status: 'waiting',
      maxPlayers: 4,
      currentPlayers: [data.ownerId], // Owner is first player
      settings: {
        isPrivate: data.isPrivate || false,
        password: data.password,
        allowSpectators: data.allowSpectators || true
      },
      createdAt: new Date()
    };

    await collection.insertOne(room);
    return room;
  }

  /**
   * Get room by ID
   */
  static async getRoomById(roomId: string): Promise<Room | null> {
    const collection = await getCollection<Room>(this.COLLECTION_NAME);
    return await collection.findOne({ roomId });
  }

  /**
   * Join a room
   */
  static async joinRoom(roomId: string, userId: string, password?: string): Promise<Room> {
    const collection = await getCollection<Room>(this.COLLECTION_NAME);
    const room = await this.getRoomById(roomId);

    if (!room) {
      throw new Error('Room not found');
    }

    if (room.status !== 'waiting') {
      throw new Error('Room has already started');
    }

    if (room.currentPlayers.length >= room.maxPlayers) {
      throw new Error('Room is full');
    }

    if (room.currentPlayers.includes(userId)) {
      throw new Error('Already in room');
    }

    if (room.settings.isPrivate && room.settings.password !== password) {
      throw new Error('Invalid password');
    }

    await collection.updateOne(
      { roomId },
      { $push: { currentPlayers: userId } }
    );

    return await this.getRoomById(roomId) as Room;
  }

  /**
   * Leave a room
   */
  static async leaveRoom(roomId: string, userId: string): Promise<void> {
    const collection = await getCollection<Room>(this.COLLECTION_NAME);
    const room = await this.getRoomById(roomId);

    if (!room) {
      throw new Error('Room not found');
    }

    if (!room.currentPlayers.includes(userId)) {
      throw new Error('Not in room');
    }

    // If owner leaves, delete room if not started
    if (room.ownerId === userId && room.status === 'waiting') {
      await collection.deleteOne({ roomId });
      return;
    }

    await collection.updateOne(
      { roomId },
      { $pull: { currentPlayers: userId } }
    );
  }

  /**
   * Update room status
   */
  static async updateRoomStatus(
    roomId: string, 
    status: 'waiting' | 'playing' | 'finished',
    additionalUpdates?: Partial<Room>
  ): Promise<void> {
    const collection = await getCollection<Room>(this.COLLECTION_NAME);
    
    const updates: any = { status };
    
    if (status === 'playing' && !additionalUpdates?.startedAt) {
      updates.startedAt = new Date();
    }
    
    if (status === 'finished' && !additionalUpdates?.finishedAt) {
      updates.finishedAt = new Date();
    }

    if (additionalUpdates) {
      Object.assign(updates, additionalUpdates);
    }

    await collection.updateOne(
      { roomId },
      { $set: updates }
    );
  }

  /**
   * List available rooms
   */
  static async listAvailableRooms(includePrivate: boolean = false): Promise<Room[]> {
    const collection = await getCollection<Room>(this.COLLECTION_NAME);
    
    const query: any = { status: 'waiting' };
    if (!includePrivate) {
      query['settings.isPrivate'] = false;
    }

    return await collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
  }

  /**
   * Get rooms by user (as player or owner)
   */
  static async getRoomsByUser(userId: string): Promise<Room[]> {
    const collection = await getCollection<Room>(this.COLLECTION_NAME);
    
    return await collection
      .find({
        $or: [
          { ownerId: userId },
          { currentPlayers: userId }
        ]
      })
      .sort({ createdAt: -1 })
      .toArray();
  }

  /**
   * Delete room
   */
  static async deleteRoom(roomId: string): Promise<void> {
    const collection = await getCollection<Room>(this.COLLECTION_NAME);
    await collection.deleteOne({ roomId });
  }
}
