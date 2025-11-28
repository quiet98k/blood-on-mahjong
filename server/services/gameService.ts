import { getCollection } from '../utils/mongo';
import type { MahjongGame, GamePlayer, StoredTile, GameAction } from '../types/database';
import { randomUUID } from 'crypto';
import { createDeck, shuffleTiles } from '../utils/tiles';
import type { Tile } from '../types/game';

export class GameService {
  private static COLLECTION_NAME = 'mahjongGames';

  /**
   * Create a new game from a room
   */
  static async createGame(roomId: string, players: Array<{ userId: string; name: string }>): Promise<MahjongGame> {
    const collection = await getCollection<MahjongGame>(this.COLLECTION_NAME);
    
    // Shuffle and deal tiles
    const deck = createDeck();
    const shuffledDeck = shuffleTiles(deck);
    
    // Create players with initial hands
    const gamePlayers: GamePlayer[] = players.map((player, index) => ({
      userId: player.userId,
      name: player.name,
      position: index,
      hand: {
        concealedTiles: shuffledDeck.splice(0, 13).map(this.tileToStored),
        exposedMelds: [],
        discardedTiles: []
      },
      status: 'playing',
      isDealer: index === 0,
      isTing: false,
      missingSuit: null,
      windScore: 0,
      rainScore: 0,
      wonFan: 0,
      winOrder: null,
      winRound: null,
      winTimestamp: null,
      score: 0
    }));

    // Dealer draws 14th tile
    gamePlayers[0].hand.concealedTiles.push(this.tileToStored(shuffledDeck.shift()!));

    const game: MahjongGame = {
      gameId: randomUUID(),
      roomId,
      phase: 'playing',
      players: gamePlayers,
      wall: shuffledDeck.map(this.tileToStored),
      currentPlayerIndex: 0,
      dealerIndex: 0,
      discardPile: [],
      actionHistory: [],
      winnersCount: 0,
      roundNumber: 1,
      createdAt: new Date(),
      lastActionTime: new Date(),
      updatedAt: new Date()
    };

    await collection.insertOne(game);
    return game;
  }

  /**
   * Get game by ID
   */
  static async getGameById(gameId: string): Promise<MahjongGame | null> {
    const collection = await getCollection<MahjongGame>(this.COLLECTION_NAME);
    return await collection.findOne({ gameId });
  }

  /**
   * Get game by room ID
   */
  static async getGameByRoomId(roomId: string): Promise<MahjongGame | null> {
    const collection = await getCollection<MahjongGame>(this.COLLECTION_NAME);
    return await collection.findOne({ roomId, phase: { $ne: 'ended' } });
  }

  /**
   * Update game state
   */
  static async updateGame(gameId: string, updates: Partial<MahjongGame>): Promise<void> {
    const collection = await getCollection<MahjongGame>(this.COLLECTION_NAME);
    
    await collection.updateOne(
      { gameId },
      { 
        $set: { 
          ...updates, 
          updatedAt: new Date(),
          lastActionTime: new Date()
        } 
      }
    );
  }

  /**
   * Add action to history
   */
  static async addAction(gameId: string, action: GameAction): Promise<void> {
    const collection = await getCollection<MahjongGame>(this.COLLECTION_NAME);
    
    await collection.updateOne(
      { gameId },
      { 
        $push: { actionHistory: action },
        $set: { 
          lastActionTime: new Date(),
          updatedAt: new Date()
        }
      }
    );
  }

  /**
   * Update player in game
   */
  static async updatePlayer(gameId: string, userId: string, updates: Partial<GamePlayer>): Promise<void> {
    const collection = await getCollection<MahjongGame>(this.COLLECTION_NAME);
    const game = await this.getGameById(gameId);
    
    if (!game) throw new Error('Game not found');
    
    const playerIndex = game.players.findIndex(p => p.userId === userId);
    if (playerIndex === -1) throw new Error('Player not found');

    const updatedPlayers = [...game.players];
    updatedPlayers[playerIndex] = { ...updatedPlayers[playerIndex], ...updates };

    await collection.updateOne(
      { gameId },
      { 
        $set: { 
          players: updatedPlayers,
          updatedAt: new Date()
        } 
      }
    );
  }

  /**
   * Get active games for a user
   */
  static async getActiveGamesForUser(userId: string): Promise<MahjongGame[]> {
    const collection = await getCollection<MahjongGame>(this.COLLECTION_NAME);
    
    return await collection
      .find({
        'players.userId': userId,
        phase: { $in: ['playing', 'starting'] }
      })
      .sort({ lastActionTime: -1 })
      .toArray();
  }

  /**
   * Draw tile from wall
   */
  static async drawTile(gameId: string): Promise<StoredTile | null> {
    const collection = await getCollection<MahjongGame>(this.COLLECTION_NAME);
    const game = await this.getGameById(gameId);
    
    if (!game || game.wall.length === 0) return null;

    const tile = game.wall[game.wall.length - 1];
    const newWall = game.wall.slice(0, -1);

    await collection.updateOne(
      { gameId },
      { 
        $set: { 
          wall: newWall,
          updatedAt: new Date()
        } 
      }
    );

    return tile;
  }

  /**
   * Add tile to discard pile
   */
  static async discardTile(gameId: string, tile: StoredTile): Promise<void> {
    const collection = await getCollection<MahjongGame>(this.COLLECTION_NAME);
    
    await collection.updateOne(
      { gameId },
      { 
        $push: { discardPile: tile },
        $set: { updatedAt: new Date() }
      }
    );
  }

  /**
   * Clean up old games (older than 7 days)
   */
  static async cleanupOldGames(): Promise<number> {
    const collection = await getCollection<MahjongGame>(this.COLLECTION_NAME);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await collection.deleteMany({
      phase: 'ended',
      updatedAt: { $lt: sevenDaysAgo }
    });

    return result.deletedCount;
  }

  /**
   * Convert Tile to StoredTile
   */
  private static tileToStored(tile: Tile): StoredTile {
    return {
      suit: tile.suit,
      value: tile.value,
      id: tile.id
    };
  }

  /**
   * Convert StoredTile to Tile
   */
  static storedToTile(stored: StoredTile): Tile {
    return {
      suit: stored.suit as any,
      value: stored.value,
      id: stored.id
    };
  }
}
