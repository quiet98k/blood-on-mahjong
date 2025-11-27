import { Tile, TileSuit } from '../types/game';

/**
 * Create a full deck of Sichuan Mahjong tiles (108 tiles)
 * 3 suits × 9 values × 4 copies = 108 tiles
 */
export function createDeck(): Tile[] {
  const tiles: Tile[] = [];
  const suits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  
  for (const suit of suits) {
    for (let value = 1; value <= 9; value++) {
      for (let copy = 0; copy < 4; copy++) {
        tiles.push({
          suit,
          value,
          id: `${suit}-${value}-${copy}`
        });
      }
    }
  }
  
  return tiles;
}

/**
 * Shuffle tiles using Fisher-Yates algorithm
 */
export function shuffleTiles(tiles: Tile[]): Tile[] {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Compare two tiles (ignoring id, just suit and value)
 */
export function tilesEqual(tile1: Tile, tile2: Tile): boolean {
  return tile1.suit === tile2.suit && tile1.value === tile2.value;
}

/**
 * Find tile by id
 */
export function findTileById(tiles: Tile[], tileId: string): Tile | undefined {
  return tiles.find(t => t.id === tileId);
}

/**
 * Remove tile from array
 */
export function removeTile(tiles: Tile[], tileId: string): Tile[] {
  return tiles.filter(t => t.id !== tileId);
}

/**
 * Sort tiles by suit and value
 */
export function sortTiles(tiles: Tile[]): Tile[] {
  const suitOrder = { [TileSuit.DOTS]: 0, [TileSuit.CHARACTERS]: 1, [TileSuit.BAMBOOS]: 2 };
  return [...tiles].sort((a, b) => {
    if (a.suit !== b.suit) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return a.value - b.value;
  });
}

/**
 * Group tiles by suit and value
 */
export function groupTiles(tiles: Tile[]): Map<string, Tile[]> {
  const groups = new Map<string, Tile[]>();
  
  for (const tile of tiles) {
    const key = `${tile.suit}-${tile.value}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(tile);
  }
  
  return groups;
}

/**
 * Check which suits are present in tiles
 */
export function getSuits(tiles: Tile[]): Set<TileSuit> {
  return new Set(tiles.map(t => t.suit));
}

/**
 * Check if hand is missing one suit (缺门)
 */
export function isMissingOneSuit(tiles: Tile[]): { missing: boolean; missingSuit: TileSuit | null } {
  const suits = getSuits(tiles);
  
  if (suits.size === 2) {
    // Find the missing suit
    const allSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
    const missingSuit = allSuits.find(s => !suits.has(s)) || null;
    return { missing: true, missingSuit };
  }
  
  return { missing: false, missingSuit: null };
}

/**
 * Check if all tiles are from one suit (清一色)
 */
export function isFullFlush(tiles: Tile[]): boolean {
  const suits = getSuits(tiles);
  return suits.size === 1;
}

/**
 * Check if tile is terminal (1 or 9)
 */
export function isTerminal(tile: Tile): boolean {
  return tile.value === 1 || tile.value === 9;
}

/**
 * Check if tile is a special value (2, 5, or 8) for Jiang
 */
export function isJiangValue(tile: Tile): boolean {
  return tile.value === 2 || tile.value === 5 || tile.value === 8;
}

/**
 * Count occurrences of each tile type
 */
export function countTiles(tiles: Tile[]): Map<string, number> {
  const counts = new Map<string, number>();
  
  for (const tile of tiles) {
    const key = `${tile.suit}-${tile.value}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  
  return counts;
}

/**
 * Get tile key for grouping
 */
export function getTileKey(tile: Tile): string {
  return `${tile.suit}-${tile.value}`;
}

/**
 * Check if three tiles form a sequence
 */
export function isSequence(tiles: Tile[]): boolean {
  if (tiles.length !== 3) return false;
  
  const sorted = sortTiles(tiles);
  return sorted[0].suit === sorted[1].suit &&
         sorted[1].suit === sorted[2].suit &&
         sorted[0].value + 1 === sorted[1].value &&
         sorted[1].value + 1 === sorted[2].value;
}

/**
 * Check if tiles form a triplet
 */
export function isTriplet(tiles: Tile[]): boolean {
  if (tiles.length !== 3) return false;
  return tilesEqual(tiles[0], tiles[1]) && tilesEqual(tiles[1], tiles[2]);
}

/**
 * Check if tiles form a pair
 */
export function isPair(tiles: Tile[]): boolean {
  return tiles.length === 2 && tilesEqual(tiles[0], tiles[1]);
}

/**
 * Check if tiles form a kong (4 identical)
 */
export function isKong(tiles: Tile[]): boolean {
  if (tiles.length !== 4) return false;
  return tilesEqual(tiles[0], tiles[1]) && 
         tilesEqual(tiles[1], tiles[2]) && 
         tilesEqual(tiles[2], tiles[3]);
}
