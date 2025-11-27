import { getCollection } from '../utils/mongo';
import type { GameHistory, HistoryPlayer, FanDetail } from '../types/database';
import type { MahjongGame } from '../types/database';
import { UserService } from './userService';

export class GameHistoryService {
  private static COLLECTION_NAME = 'gameHistory';

  /**
   * Save completed game to history
   */
  static async saveGameHistory(game: MahjongGame, finalScores: Record<string, number>): Promise<GameHistory> {
    const collection = await getCollection<GameHistory>(this.COLLECTION_NAME);
    
    // Prepare player history
    const historyPlayers: HistoryPlayer[] = await Promise.all(
      game.players.map(async (player) => {
        const user = await UserService.getUserById(player.userId);
        return {
          userId: player.userId,
          name: player.name,
          avatar: user?.avatar,
          position: player.position,
          finalScore: finalScores[player.userId] || 0,
          wins: player.status === 'won' ? 1 : 0,
          highestFan: player.wonFan
        };
      })
    );

    // Find winners
    const winners = game.players
      .filter(p => p.status === 'won')
      .map(p => p.userId);

    // Extract fan details from game actions
    const fanDetails: Record<string, FanDetail[]> = {};
    game.players.forEach(player => {
      if (player.wonFan > 0) {
        fanDetails[player.userId] = [{
          round: game.roundNumber,
          fan: player.wonFan,
          fanName: this.getFanName(player.wonFan),
          fanTypes: [], // TODO: Extract from action history
          score: Math.pow(2, player.wonFan - 1),
          isSelfDrawn: false // TODO: Extract from action history
        }];
      }
    });

    const history: GameHistory = {
      gameId: game.gameId,
      roomId: game.roomId,
      roomName: 'Game Room', // TODO: Get from room service
      players: historyPlayers,
      winners,
      totalRounds: game.roundNumber,
      finalScores,
      fanDetails,
      duration: new Date().getTime() - game.createdAt.getTime(),
      completedAt: new Date(),
      actionCount: game.actionHistory.length
    };

    await collection.insertOne(history);

    // Update player stats
    for (const player of historyPlayers) {
      await UserService.updateStats(player.userId, {
        gamesPlayed: 1,
        gamesWon: player.wins,
        scoreChange: player.finalScore,
        highestFan: player.highestFan
      });
    }

    return history;
  }

  /**
   * Get game history by ID
   */
  static async getHistoryById(gameId: string): Promise<GameHistory | null> {
    const collection = await getCollection<GameHistory>(this.COLLECTION_NAME);
    return await collection.findOne({ gameId });
  }

  /**
   * Get user's game history
   */
  static async getUserHistory(userId: string, limit: number = 20): Promise<GameHistory[]> {
    const collection = await getCollection<GameHistory>(this.COLLECTION_NAME);
    
    return await collection
      .find({ 'players.userId': userId })
      .sort({ completedAt: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Get user stats summary
   */
  static async getUserStatsSummary(userId: string): Promise<{
    totalGames: number;
    wins: number;
    winRate: number;
    averageScore: number;
    highestFan: number;
    totalPlayTime: number;
  }> {
    const collection = await getCollection<GameHistory>(this.COLLECTION_NAME);
    
    const games = await collection
      .find({ 'players.userId': userId })
      .toArray();

    const stats = {
      totalGames: games.length,
      wins: 0,
      winRate: 0,
      averageScore: 0,
      highestFan: 0,
      totalPlayTime: 0
    };

    if (games.length === 0) return stats;

    let totalScore = 0;
    
    for (const game of games) {
      const player = game.players.find(p => p.userId === userId);
      if (!player) continue;

      if (game.winners.includes(userId)) {
        stats.wins++;
      }
      
      totalScore += player.finalScore;
      
      if (player.highestFan > stats.highestFan) {
        stats.highestFan = player.highestFan;
      }
      
      stats.totalPlayTime += game.duration;
    }

    stats.winRate = stats.wins / stats.totalGames;
    stats.averageScore = totalScore / stats.totalGames;

    return stats;
  }

  /**
   * Get recent games
   */
  static async getRecentGames(limit: number = 10): Promise<GameHistory[]> {
    const collection = await getCollection<GameHistory>(this.COLLECTION_NAME);
    
    return await collection
      .find({})
      .sort({ completedAt: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Get top players by various metrics
   */
  static async getTopPlayers(metric: 'wins' | 'score' | 'fan', limit: number = 10): Promise<any[]> {
    const collection = await getCollection<GameHistory>(this.COLLECTION_NAME);
    
    const pipeline: any[] = [
      { $unwind: '$players' },
      {
        $group: {
          _id: '$players.userId',
          name: { $first: '$players.name' },
          avatar: { $first: '$players.avatar' },
          totalGames: { $sum: 1 },
          totalWins: { $sum: '$players.wins' },
          totalScore: { $sum: '$players.finalScore' },
          highestFan: { $max: '$players.highestFan' }
        }
      }
    ];

    switch (metric) {
      case 'wins':
        pipeline.push({ $sort: { totalWins: -1 } });
        break;
      case 'score':
        pipeline.push({ $sort: { totalScore: -1 } });
        break;
      case 'fan':
        pipeline.push({ $sort: { highestFan: -1 } });
        break;
    }

    pipeline.push({ $limit: limit });

    return await collection.aggregate(pipeline).toArray();
  }

  /**
   * Clean up old history (older than 90 days)
   */
  static async cleanupOldHistory(): Promise<number> {
    const collection = await getCollection<GameHistory>(this.COLLECTION_NAME);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const result = await collection.deleteMany({
      completedAt: { $lt: ninetyDaysAgo }
    });

    return result.deletedCount;
  }

  private static getFanName(fan: number): string {
    switch (fan) {
      case 1: return 'One-Fan Win (一番和)';
      case 2: return 'Two-Fan Win (两番和)';
      case 3: return 'Small Grand Slam (小满贯)';
      case 4: return 'Big Grand Slam (大满贯)';
      case 5: return 'Extreme (极品)';
      default: return 'One-Fan Win (一番和)';
    }
  }
}
