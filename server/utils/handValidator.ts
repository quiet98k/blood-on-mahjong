import { Tile, Meld, MeldType, WinType } from '../types/game';
import { sortTiles, groupTiles, isSequence, isTriplet, isPair, tilesEqual } from './tiles';

/**
 * Check if a hand can win with standard pattern (4 melds + 1 pair)
 */
export function canWinStandard(tiles: Tile[]): boolean {
  if (tiles.length !== 14) return false;
  
  // Try each possible pair as the eyes
  const groups = groupTiles(tiles);
  
  for (const [key, groupTiles] of groups) {
    if (groupTiles.length >= 2) {
      // Try using this as the pair
      const remainingTiles = [...tiles];
      const pairTile1 = groupTiles[0];
      const pairTile2 = groupTiles[1];
      
      // Remove the pair
      const idx1 = remainingTiles.findIndex(t => t.id === pairTile1.id);
      remainingTiles.splice(idx1, 1);
      const idx2 = remainingTiles.findIndex(t => t.id === pairTile2.id);
      remainingTiles.splice(idx2, 1);
      
      // Check if remaining 12 tiles form 4 melds
      if (canFormMelds(remainingTiles, 4)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if tiles can form exactly n melds (sequences or triplets)
 */
function canFormMelds(tiles: Tile[], n: number): boolean {
  if (n === 0) {
    return tiles.length === 0;
  }
  
  if (tiles.length < 3) {
    return false;
  }
  
  const sorted = sortTiles(tiles);
  const firstTile = sorted[0];
  
  // Try forming a triplet with the first tile
  const tripletTiles = sorted.filter(t => tilesEqual(t, firstTile));
  if (tripletTiles.length >= 3) {
    const remaining = [...sorted];
    // Remove triplet
    for (let i = 0; i < 3; i++) {
      const idx = remaining.findIndex(t => t.id === tripletTiles[i].id);
      remaining.splice(idx, 1);
    }
    if (canFormMelds(remaining, n - 1)) {
      return true;
    }
  }
  
  // Try forming a sequence with the first tile
  const nextValue = firstTile.value + 1;
  const nextNextValue = firstTile.value + 2;
  
  if (nextValue <= 9 && nextNextValue <= 9) {
    const secondTile = sorted.find(t => t.suit === firstTile.suit && t.value === nextValue);
    const thirdTile = sorted.find(t => t.suit === firstTile.suit && t.value === nextNextValue);
    
    if (secondTile && thirdTile) {
      const remaining = [...sorted];
      // Remove sequence
      const idx1 = remaining.findIndex(t => t.id === firstTile.id);
      remaining.splice(idx1, 1);
      const idx2 = remaining.findIndex(t => t.id === secondTile.id);
      remaining.splice(idx2, 1);
      const idx3 = remaining.findIndex(t => t.id === thirdTile.id);
      remaining.splice(idx3, 1);
      
      if (canFormMelds(remaining, n - 1)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if a hand can win with seven pairs (七对)
 */
export function canWinSevenPairs(tiles: Tile[]): boolean {
  if (tiles.length !== 14) return false;
  
  const groups = groupTiles(tiles);
  
  // Must have exactly 7 groups, each with exactly 2 tiles
  if (groups.size !== 7) return false;
  
  for (const group of groups.values()) {
    if (group.length !== 2) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if hand can win (either standard or seven pairs)
 */
export function canWin(tiles: Tile[]): { canWin: boolean; winType: WinType | null } {
  if (canWinStandard(tiles)) {
    return { canWin: true, winType: WinType.STANDARD };
  }
  
  if (canWinSevenPairs(tiles)) {
    return { canWin: true, winType: WinType.SEVEN_PAIRS };
  }
  
  return { canWin: false, winType: null };
}

/**
 * Get all tiles that would complete a winning hand (listening tiles)
 */
export function getListeningTiles(tiles: Tile[]): Tile[] {
  if (tiles.length !== 13) return [];
  
  const listeningTiles: Tile[] = [];
  
  // Try adding each possible tile
  const allPossibleTiles: Array<{ suit: string; value: number }> = [];
  for (const suit of ['dots', 'wan', 'tiao']) {
    for (let value = 1; value <= 9; value++) {
      allPossibleTiles.push({ suit: suit as any, value });
    }
  }
  
  for (const { suit, value } of allPossibleTiles) {
    const testTile: Tile = { suit: suit as any, value, id: 'test' };
    const testHand = [...tiles, testTile];
    
    if (canWin(testHand).canWin) {
      // Check if not already in list
      if (!listeningTiles.some(t => t.suit === suit && t.value === value)) {
        listeningTiles.push(testTile);
      }
    }
  }
  
  return listeningTiles;
}

/**
 * Check if a player is in "Ting" (listening/ready to win)
 */
export function isTing(tiles: Tile[]): boolean {
  return getListeningTiles(tiles).length > 0;
}

/**
 * Extract melds from a winning hand
 */
export function extractMelds(tiles: Tile[]): Meld[] | null {
  if (tiles.length !== 14) return null;
  
  // Try standard win
  const groups = groupTiles(tiles);
  
  for (const [key, groupTiles] of groups) {
    if (groupTiles.length >= 2) {
      const remainingTiles = [...tiles];
      const pairTile1 = groupTiles[0];
      const pairTile2 = groupTiles[1];
      
      const idx1 = remainingTiles.findIndex(t => t.id === pairTile1.id);
      remainingTiles.splice(idx1, 1);
      const idx2 = remainingTiles.findIndex(t => t.id === pairTile2.id);
      remainingTiles.splice(idx2, 1);
      
      const melds = extractMeldsRecursive(remainingTiles);
      if (melds) {
        return [
          { type: MeldType.PAIR, tiles: [pairTile1, pairTile2], isConcealed: true },
          ...melds
        ];
      }
    }
  }
  
  // Try seven pairs
  if (canWinSevenPairs(tiles)) {
    const melds: Meld[] = [];
    const groups = groupTiles(tiles);
    for (const group of groups.values()) {
      melds.push({ type: MeldType.PAIR, tiles: group, isConcealed: true });
    }
    return melds;
  }
  
  return null;
}

function extractMeldsRecursive(tiles: Tile[]): Meld[] | null {
  if (tiles.length === 0) {
    return [];
  }
  
  if (tiles.length < 3) {
    return null;
  }
  
  const sorted = sortTiles(tiles);
  const firstTile = sorted[0];
  
  // Try triplet
  const tripletTiles = sorted.filter(t => tilesEqual(t, firstTile));
  if (tripletTiles.length >= 3) {
    const remaining = [...sorted];
    for (let i = 0; i < 3; i++) {
      const idx = remaining.findIndex(t => t.id === tripletTiles[i].id);
      remaining.splice(idx, 1);
    }
    
    const restMelds = extractMeldsRecursive(remaining);
    if (restMelds) {
      return [
        { type: MeldType.TRIPLET, tiles: tripletTiles.slice(0, 3), isConcealed: true },
        ...restMelds
      ];
    }
  }
  
  // Try sequence
  const nextValue = firstTile.value + 1;
  const nextNextValue = firstTile.value + 2;
  
  if (nextValue <= 9 && nextNextValue <= 9) {
    const secondTile = sorted.find(t => t.suit === firstTile.suit && t.value === nextValue);
    const thirdTile = sorted.find(t => t.suit === firstTile.suit && t.value === nextNextValue);
    
    if (secondTile && thirdTile) {
      const remaining = [...sorted];
      const idx1 = remaining.findIndex(t => t.id === firstTile.id);
      remaining.splice(idx1, 1);
      const idx2 = remaining.findIndex(t => t.id === secondTile.id);
      remaining.splice(idx2, 1);
      const idx3 = remaining.findIndex(t => t.id === thirdTile.id);
      remaining.splice(idx3, 1);
      
      const restMelds = extractMeldsRecursive(remaining);
      if (restMelds) {
        return [
          { type: MeldType.SEQUENCE, tiles: [firstTile, secondTile, thirdTile], isConcealed: true },
          ...restMelds
        ];
      }
    }
  }
  
  return null;
}

/**
 * Count roots (根) - sets of 4 identical tiles
 */
export function countRoots(tiles: Tile[], exposedMelds: Meld[]): number {
  let roots = 0;
  
  // Check exposed kongs
  for (const meld of exposedMelds) {
    if (meld.type === MeldType.KONG || meld.type === MeldType.CONCEALED_KONG) {
      roots++;
    }
  }
  
  // Check for 4 identical tiles in winning hand
  const groups = groupTiles(tiles);
  for (const group of groups.values()) {
    if (group.length === 4) {
      roots++;
    }
  }
  
  return roots;
}
