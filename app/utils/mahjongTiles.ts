// utils/mahjongTiles.ts

export type Suit = 'wan' | 'tong' | 'tiao'

export interface Tile {
  id: number        // 0..107, unique tile instance
  suit: Suit        // 'wan' | 'tong' | 'tiao'
  rank: number      // 1..9
}

export type MeldType = 'pung' | 'kong'

export interface Meld {
  type: MeldType
  tiles: Tile[]     // 3 tiles for pung, 4 tiles for kong
}

/**
 * Map a tile id [0, 107] to (suit, rank).
 *
 * Layout:
 *  - 0..35  : 万 (characters), ranks 1..9, 4 copies each
 *  - 36..71 : 筒 (dots), ranks 1..9, 4 copies each
 *  - 72..107: 条 (bamboos), ranks 1..9, 4 copies each
 *
 * Example:
 *  id 0..3   => 1万
 *  id 4..7   => 2万
 *  ...
 *  id 32..35 => 9万
 *  id 36..39 => 1筒
 *  ...
 */
export function tileFromId(id: number): Tile {
  if (id < 0 || id >= 108 || !Number.isInteger(id)) {
    throw new Error(`Invalid tile id: ${id}`)
  }

  const baseIndex = Math.floor(id / 4) // 0..26 (9 ranks * 3 suits)
  const suitIndex = Math.floor(baseIndex / 9) // 0,1,2
  const rankIndex = baseIndex % 9 // 0..8

  const suits: Suit[] = ['wan', 'tong', 'tiao']
  const suit = suits[suitIndex]
  const rank = rankIndex + 1

  return { id, suit, rank }
}

/**
 * Create a full 108-tile Sichuan Mahjong set.
 */
export function createFullTileSet(): Tile[] {
  const tiles: Tile[] = []
  for (let id = 0; id < 108; id++) {
    tiles.push(tileFromId(id))
  }
  return tiles
}

/**
 * Sort tiles by their id index [0, 107].
 */
export function sortTilesById(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => a.id - b.id)
}

/**
 * Create a fixed initial hand of 13 tiles for testing.
 * For now: just first 13 tiles from the full set.
 */
export function createInitialHand(): { hand: Tile[]; drawPile: Tile[] } {
  const fullSet = createFullTileSet()
  const hand = sortTilesById(fullSet.slice(0, 13))
  const drawPile = fullSet.slice(13) // remaining tiles for draw
  return { hand, drawPile }
}