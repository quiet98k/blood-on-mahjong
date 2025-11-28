import { getCollection } from './mongo'
import type {
  MahjongGame,
  StoredTile,
  StoredMeld,
  GamePlayer,
  GameAction as StoredGameAction
} from '../types/database'
import {
  TileSuit,
  type GameState,
  type Player,
  type Tile,
  type Meld,
  type GameAction,
  type PendingAction
} from '../types/game'

const COLLECTION_NAME = 'mahjongGames'

type PersistedMahjongGame = MahjongGame & { pendingActions?: PendingAction[] }

const tileToStored = (tile: Tile): StoredTile => ({
  suit: tile.suit,
  value: tile.value,
  id: tile.id
})

const storedToTile = (tile: StoredTile): Tile => ({
  suit: tile.suit as TileSuit,
  value: tile.value,
  id: tile.id
})

const meldToStored = (meld: Meld): StoredMeld => ({
  type: meld.type,
  tiles: meld.tiles.map(tileToStored),
  isConcealed: meld.isConcealed
})

const storedToMeld = (meld: StoredMeld): Meld => ({
  type: meld.type,
  tiles: meld.tiles.map(storedToTile),
  isConcealed: meld.isConcealed
})

const playerToStored = (player: Player): GamePlayer => ({
  userId: player.id,
  name: player.name,
  position: player.position,
  hand: {
    concealedTiles: player.hand.concealedTiles.map(tileToStored),
    exposedMelds: player.hand.exposedMelds.map(meldToStored),
    discardedTiles: player.hand.discardedTiles.map(tileToStored)
  },
  status: player.status,
  isDealer: player.isDealer,
  isTing: player.isTing,
  missingSuit: player.missingSuit,
  windScore: player.windScore,
  rainScore: player.rainScore,
  wonFan: player.wonFan,
  winOrder: player.winOrder,
  winRound: player.winRound,
  winTimestamp: player.winTimestamp
})

const storedToPlayer = (player: GamePlayer): Player => ({
  id: player.userId,
  name: player.name,
  position: player.position,
  hand: {
    concealedTiles: player.hand.concealedTiles.map(storedToTile),
    exposedMelds: player.hand.exposedMelds.map(storedToMeld),
    discardedTiles: player.hand.discardedTiles.map(storedToTile)
  },
  status: player.status,
  isDealer: player.isDealer,
  isTing: player.isTing,
  missingSuit: player.missingSuit ?? null,
  windScore: player.windScore,
  rainScore: player.rainScore,
  wonFan: player.wonFan,
  winOrder: player.winOrder ?? null,
  winRound: player.winRound ?? null,
  winTimestamp: player.winTimestamp ?? null
})

const actionToStored = (action: GameAction): StoredGameAction => ({
  playerId: action.playerId,
  type: action.type,
  tile: action.tile ? tileToStored(action.tile) : undefined,
  tiles: action.tiles ? action.tiles.map(tileToStored) : undefined,
  timestamp: action.timestamp
})

const storedToAction = (action: StoredGameAction): GameAction => ({
  playerId: action.playerId,
  type: action.type,
  tile: action.tile ? storedToTile(action.tile) : undefined,
  tiles: action.tiles ? action.tiles.map(storedToTile) : undefined,
  timestamp: action.timestamp
})

const gameStateToDocument = (game: GameState): PersistedMahjongGame => ({
  gameId: game.gameId,
  roomId: game.gameId,
  phase: game.phase as PersistedMahjongGame['phase'],
  endReason: game.endReason,
  players: game.players.map(playerToStored),
  wall: game.wall.map(tileToStored),
  currentPlayerIndex: game.currentPlayerIndex,
  dealerIndex: game.dealerIndex,
  discardPile: game.discardPile.map(tileToStored),
  actionHistory: game.actionHistory.map(actionToStored),
  winnersCount: game.winnersCount,
  roundNumber: game.roundNumber,
  createdAt: new Date(game.createdAt),
  lastActionTime: new Date(game.lastActionTime),
  updatedAt: new Date(),
  endedAt: game.endedAt ? new Date(game.endedAt) : undefined,
  finalScores: game.finalScores,
  pendingActions: game.pendingActions
})

const documentToGameState = (doc: PersistedMahjongGame): GameState => ({
  gameId: doc.gameId,
  phase: doc.phase as GameState['phase'],
  endReason: (doc.endReason ?? null) as GameState['endReason'],
  players: doc.players.map(storedToPlayer),
  wall: doc.wall.map(storedToTile),
  currentPlayerIndex: doc.currentPlayerIndex,
  dealerIndex: doc.dealerIndex,
  discardPile: doc.discardPile.map(storedToTile),
  actionHistory: doc.actionHistory.map(storedToAction),
  winnersCount: doc.winnersCount,
  roundNumber: doc.roundNumber,
  createdAt: doc.createdAt.getTime(),
  lastActionTime: doc.lastActionTime.getTime(),
  endedAt: doc.endedAt ? doc.endedAt.getTime() : undefined,
  finalScores: doc.finalScores,
  pendingActions: doc.pendingActions ?? []
})

export const saveGameState = async (game: GameState): Promise<void> => {
  const games = await getCollection<PersistedMahjongGame>(COLLECTION_NAME)
  const doc = gameStateToDocument(game)
  await games.updateOne(
    { gameId: game.gameId },
    { $set: doc },
    { upsert: true }
  )
}

export const loadGameState = async (gameId: string): Promise<GameState | null> => {
  const games = await getCollection<PersistedMahjongGame>(COLLECTION_NAME)
  const doc = await games.findOne({ gameId })
  return doc ? documentToGameState(doc) : null
}

export const deleteGameState = async (gameId: string): Promise<void> => {
  const games = await getCollection<PersistedMahjongGame>(COLLECTION_NAME)
  await games.deleteOne({ gameId })
}

export const loadAllGameStates = async (): Promise<GameState[]> => {
  const games = await getCollection<PersistedMahjongGame>(COLLECTION_NAME)
  const docs = await games.find({}).toArray()
  return docs.map(documentToGameState)
}
