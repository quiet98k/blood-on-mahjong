import { Tile, Meld, MeldType, WinType, FanCalculation, Player } from '../types/game';
import { isFullFlush, isTerminal, isJiangValue, getSuits } from './tiles';
import { countRoots, extractMelds } from './handValidator';

/**
 * Calculate fan for a winning hand
 */
export function calculateFan(
  tiles: Tile[],
  exposedMelds: Meld[],
  winType: WinType,
  isSelfDrawn: boolean,
  isKongFlower: boolean,
  isRobbingKong: boolean,
  isKongDiscard: boolean,
  isHeaven: boolean,
  isEarth: boolean
): FanCalculation {
  let baseFan = 0;
  const additionalFans: string[] = [];
  let handTypeFan: string | null = null;

  // Base fan: must be missing one suit (缺门)
  baseFan = 1;

  // Additional fans
  const roots = countRoots(tiles, exposedMelds);
  if (roots > 0) {
    for (let i = 0; i < roots; i++) {
      additionalFans.push('Root (有根)');
    }
    baseFan += roots;
  }

  if (isRobbingKong) {
    additionalFans.push('Robbing the Kong (抢杠)');
    baseFan += 1;
  }

  if (isKongDiscard) {
    additionalFans.push('Kong Discard (杠上炮)');
    baseFan += 1;
  }

  if (isKongFlower) {
    additionalFans.push('Kong Flower (杠上花)');
    baseFan += 1;
  }

  if (isHeaven) {
    additionalFans.push('Heaven Win (天和)');
    baseFan += 4;
  }

  if (isEarth) {
    additionalFans.push('Earth Win (地和)');
    baseFan += 4;
  }

  // Hand-type fans
  const allTiles = [...tiles];
  for (const meld of exposedMelds) {
    allTiles.push(...meld.tiles);
  }

  // Check for various hand patterns
  const isFlush = isFullFlush(allTiles);
  const hasSequence = checkHasSequence(tiles, exposedMelds);
  const allTerminals = checkAllTerminals(tiles, exposedMelds);
  const allJiang = checkAllJiang(tiles, exposedMelds);

  // Highest fan patterns
  if (isFlush && winType === WinType.SEVEN_PAIRS) {
    handTypeFan = 'Pure Seven Pairs (清七对)';
    baseFan += 4;
  } else if (isFlush && !hasSequence && winType === WinType.STANDARD) {
    handTypeFan = 'Pure Pungs (清对)';
    baseFan += 4;
  } else if (isFlush && allTerminals) {
    handTypeFan = 'Pure Terminals (清带幺)';
    baseFan += 4;
  } else if (allJiang && !hasSequence) {
    handTypeFan = 'Jiang Pungs (将对)';
    baseFan += 4;
  } else if (isFlush) {
    handTypeFan = 'Full Flush (清一色)';
    baseFan += 3;
  } else if (winType === WinType.SEVEN_PAIRS) {
    handTypeFan = 'Seven Pairs (暗七对)';
    baseFan += 3;
  } else if (allTerminals) {
    handTypeFan = 'All Terminals (全带幺)';
    baseFan += 3;
  } else if (!hasSequence) {
    handTypeFan = 'All Pungs (对对和)';
    baseFan += 2;
  } else {
    handTypeFan = 'Pure Win (素番)';
    // baseFan already 1
  }

  // Cap at maximum 5 fan (Extreme)
  const totalFan = Math.min(baseFan, 5);
  const fanName = getFanName(totalFan);

  return {
    baseFan,
    additionalFans,
    handTypeFan,
    totalFan,
    fanName
  };
}

/**
 * Check if hand has any sequences
 */
function checkHasSequence(tiles: Tile[], exposedMelds: Meld[]): boolean {
  // Check exposed melds
  for (const meld of exposedMelds) {
    if (meld.type === MeldType.SEQUENCE) {
      return true;
    }
  }

  // Check concealed tiles
  const melds = extractMelds(tiles);
  if (melds) {
    for (const meld of melds) {
      if (meld.type === MeldType.SEQUENCE) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if all melds contain terminals (1 or 9)
 */
function checkAllTerminals(tiles: Tile[], exposedMelds: Meld[]): boolean {
  const melds = extractMelds(tiles);
  if (!melds) return false;

  const allMelds = [...melds, ...exposedMelds];

  for (const meld of allMelds) {
    if (meld.type === MeldType.PAIR) continue; // Pairs can be anything

    const hasTerminal = meld.tiles.some(t => isTerminal(t));
    if (!hasTerminal) {
      return false;
    }
  }

  return true;
}

/**
 * Check if all sets use 2, 5, or 8
 */
function checkAllJiang(tiles: Tile[], exposedMelds: Meld[]): boolean {
  const melds = extractMelds(tiles);
  if (!melds) return false;

  const allMelds = [...melds, ...exposedMelds];

  for (const meld of allMelds) {
    // All tiles in meld must be Jiang values
    const allJiangValues = meld.tiles.every(t => isJiangValue(t));
    if (!allJiangValues) {
      return false;
    }
  }

  return true;
}

/**
 * Get fan name based on count
 */
function getFanName(fan: number): string {
  switch (fan) {
    case 1: return 'One-Fan Win (一番和)';
    case 2: return 'Two-Fan Win (两番和)';
    case 3: return 'Small Grand Slam (小满贯)';
    case 4: return 'Big Grand Slam (大满贯)';
    case 5: return 'Extreme (极品)';
    default: return 'One-Fan Win (一番和)';
  }
}

/**
 * Calculate winning score based on fan count
 * Formula: Base × 2^(FanCount - 1)
 */
export function calculateWinningScore(fan: number): number {
  return Math.pow(2, fan - 1);
}

/**
 * Calculate kong scores
 */
export function calculateKongScore(
  kongType: 'direct' | 'extended' | 'concealed',
  numNonWinners: number
): number {
  switch (kongType) {
    case 'direct': // 点杠 - discarder pays
      return 2;
    case 'extended': // 续明杠 - each non-winner pays 1
      return numNonWinners * 1;
    case 'concealed': // 暗杠 - each non-winner pays 2
      return numNonWinners * 2;
    default:
      return 0;
  }
}

/**
 * Calculate Cha Jiao penalties
 * Returns penalties for flower pigs and non-ting players
 */
export function calculateChaJiaoPenalties(
  players: Player[],
  winners: Player[]
): Record<string, number> {
  const penalties: Record<string, number> = {};
  const nonWinners = players.filter(p => !winners.find(w => w.id === p.id));

  // Find flower pigs (持三门 - holding all three suits)
  const flowerPigs = nonWinners.filter(p => {
    const allTiles = [...p.hand.concealedTiles];
    for (const meld of p.hand.exposedMelds) {
      allTiles.push(...meld.tiles);
    }
    const suits = getSuits(allTiles);
    return suits.size === 3; // Has all three suits
  });

  // Find non-ting players
  const nonTingPlayers = nonWinners.filter(p => !p.isTing);

  // Flower pig penalties - pays Extreme level (5 fan) to all non-flower-pig players
  const extremeScore = calculateWinningScore(5); // 16 points
  for (const pig of flowerPigs) {
    let totalPenalty = 0;
    const nonPigPlayers = players.filter(p => p.id !== pig.id && !flowerPigs.find(fp => fp.id === p.id));
    totalPenalty = nonPigPlayers.length * extremeScore;
    penalties[pig.id] = (penalties[pig.id] || 0) - totalPenalty;

    // Distribute to non-pig players
    for (const player of nonPigPlayers) {
      penalties[player.id] = (penalties[player.id] || 0) + extremeScore;
    }
  }

  // Non-ting penalties - compensate ting players (包大)
  for (const nonTing of nonTingPlayers) {
    if (flowerPigs.find(p => p.id === nonTing.id)) continue; // Already penalized as flower pig

    const tingPlayers = players.filter(p => p.isTing || winners.find(w => w.id === p.id));
    for (const tingPlayer of tingPlayers) {
      if (tingPlayer.id === nonTing.id) continue;

      // Full liability - pays as if the ting player won
      const fanScore = tingPlayer.wonFan > 0 ? calculateWinningScore(tingPlayer.wonFan) : 1;
      penalties[nonTing.id] = (penalties[nonTing.id] || 0) - fanScore;
      penalties[tingPlayer.id] = (penalties[tingPlayer.id] || 0) + fanScore;
    }

    // Invalidate kong scores for non-ting players
    penalties[nonTing.id] = (penalties[nonTing.id] || 0) - nonTing.windScore - nonTing.rainScore;
  }

  return penalties;
}

/**
 * Calculate total game result including all scores and penalties
 */
export function calculateGameResult(
  players: Player[],
  winners: Player[]
): Record<string, number> {
  const finalScores: Record<string, number> = {};

  // Initialize all scores
  for (const player of players) {
    finalScores[player.id] = 0;
  }

  // Add winning scores
  for (const winner of winners) {
    const winScore = calculateWinningScore(winner.wonFan);
    finalScores[winner.id] += winScore;

    // Deduct from non-winners (self-drawn means all pay)
    const nonWinners = players.filter(p => !winners.find(w => w.id === p.id));
    for (const nonWinner of nonWinners) {
      finalScores[nonWinner.id] -= winScore;
    }
  }

  // Add kong scores
  for (const player of players) {
    finalScores[player.id] += player.windScore + player.rainScore;
  }

  // Apply Cha Jiao penalties
  const chaJiaoPenalties = calculateChaJiaoPenalties(players, winners);
  for (const [playerId, penalty] of Object.entries(chaJiaoPenalties)) {
    finalScores[playerId] += penalty;
  }

  return finalScores;
}
