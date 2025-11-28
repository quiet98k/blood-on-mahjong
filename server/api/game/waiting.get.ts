import { getCollection } from '../../utils/mongo'
import type { MahjongGame } from '../../types/database'

interface WaitingGameSummary {
  gameId: string
  playerCount: number
  updatedAt: string
  createdAt: string
  dealerName: string | null
}

export default defineEventHandler(async () => {
  const gamesCollection = await getCollection<MahjongGame>('mahjongGames')

  const waitingGames = await gamesCollection
    .find({ phase: 'waiting' })
    .sort({ updatedAt: -1 })
    .limit(25)
    .toArray()

  const summaries: WaitingGameSummary[] = waitingGames.map((game) => ({
    gameId: game.gameId,
    playerCount: game.players.length,
    createdAt: game.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
    updatedAt: game.updatedAt?.toISOString?.() ?? new Date(0).toISOString(),
    dealerName: game.players.find((p) => p.isDealer)?.name ?? null
  }))

  return {
    success: true,
    data: {
      games: summaries
    }
  }
})
