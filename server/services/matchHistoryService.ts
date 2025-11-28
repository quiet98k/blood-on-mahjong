import { getCollection } from '../utils/mongo';
import type { MatchHistory } from '../types/database';
import { calculateGameResult } from '../utils/scoring';
import { PlayerStatus, type GameState, type GameEndReason } from '../types/game';

export class MatchHistoryService {
  private static COLLECTION_NAME = 'matchHistory';

  static async recordMatch(
    game: GameState,
    finalScores: Record<string, number>,
    reason: GameEndReason
  ): Promise<void> {
    const collection = await getCollection<MatchHistory>(this.COLLECTION_NAME);
    const completedAtMs = game.endedAt ?? Date.now();

    const winners = game.players.filter(player => player.status === PlayerStatus.WON);

    const computedScores:
      | Record<string, number>
      | undefined = game.customScoringMode === 'cheat'
        ? game.players.reduce<Record<string, number>>((acc, player) => {
            acc[player.id] = winners.some(w => w.id === player.id) ? 1 : -1;
            return acc;
          }, {})
        : calculateGameResult(game.players, winners);

    const history: MatchHistory = {
      gameId: game.gameId,
      roomId: game.gameId,
      endReason: reason,
      winnersCount: game.winnersCount,
      roundNumber: game.roundNumber,
      completedAt: new Date(completedAtMs),
      durationMs: Math.max(completedAtMs - game.createdAt, 0),
      finalScores: finalScores ?? computedScores,
      results: game.players.map((player) => ({
        playerId: player.id,
        name: player.name,
        position: player.position,
        status: player.status,
        winOrder: player.winOrder ?? null,
        winRound: player.winRound ?? null,
        winTimestamp: player.winTimestamp ?? null,
        wonFan: player.wonFan,
        windScore: player.windScore,
        rainScore: player.rainScore,
        finalScore:
          player.score ?? finalScores[player.id] ?? computedScores?.[player.id] ?? 0
      }))
    };

    await collection.updateOne(
      { gameId: game.gameId },
      { $set: history },
      { upsert: true }
    );
  }

  static async listMatches(options?: { userId?: string; limit?: number }): Promise<MatchHistory[]> {
    const collection = await getCollection<MatchHistory>(this.COLLECTION_NAME);
    const { userId, limit = 20 } = options || {};

    const query = userId
      ? { 'results.playerId': userId }
      : {};

    return collection
      .find(query)
      .sort({ completedAt: -1 })
      .limit(limit)
      .toArray();
  }
}
