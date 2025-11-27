// Tile definitions
export enum TileSuit {
  DOTS = 'dots',      // 筒
  CHARACTERS = 'wan', // 万
  BAMBOOS = 'tiao'    // 条
}

export interface Tile {
  suit: TileSuit;
  value: number; // 1-9
  id: string; // Unique identifier for each physical tile
}

// Meld types
export enum MeldType {
  SEQUENCE = 'sequence',    // 顺子
  TRIPLET = 'triplet',      // 坎
  KONG = 'kong',            // 杠
  CONCEALED_KONG = 'concealed_kong', // 暗杠
  PAIR = 'pair'             // 对子
}

export interface Meld {
  type: MeldType;
  tiles: Tile[];
  isConcealed: boolean;
}

// Player hand
export interface PlayerHand {
  concealedTiles: Tile[];
  exposedMelds: Meld[];
  discardedTiles: Tile[];
}

// Player state
export enum PlayerStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  WON = 'won',
  LOST = 'lost'
}

export interface Player {
  id: string;
  name: string;
  position: number; // 0-3
  hand: PlayerHand;
  status: PlayerStatus;
  isDealer: boolean;
  isTing: boolean; // Listening/ready to win
  missingSuit: TileSuit | null; // Which suit is missing (缺门)
  windScore: number; // Kong scores (刮风)
  rainScore: number; // Concealed kong scores (下雨)
  wonFan: number; // Fan count when won
}

// Game actions
export enum ActionType {
  DRAW = 'draw',
  DISCARD = 'discard',
  PENG = 'peng',
  KONG = 'kong',
  EXTENDED_KONG = 'extended_kong', // 续杠
  CONCEALED_KONG = 'concealed_kong',
  HU = 'hu',
  PASS = 'pass'
}

export interface GameAction {
  playerId: string;
  type: ActionType;
  tile?: Tile;
  tiles?: Tile[];
  timestamp: number;
}

// Winning hand types
export enum WinType {
  STANDARD = 'standard',           // 4 melds + 1 pair
  SEVEN_PAIRS = 'seven_pairs'      // 七对
}

// Fan types
export interface FanCalculation {
  baseFan: number;
  additionalFans: string[]; // Names of additional fans
  handTypeFan: string | null;
  totalFan: number;
  fanName: string;
}

// Game state
export enum GamePhase {
  WAITING = 'waiting',     // Waiting for players
  STARTING = 'starting',   // Initializing game
  PLAYING = 'playing',     // Active game
  CHA_JIAO = 'cha_jiao',  // Checking ting
  ENDED = 'ended'
}

export interface GameState {
  gameId: string;
  phase: GamePhase;
  players: Player[];
  wall: Tile[];
  currentPlayerIndex: number;
  dealerIndex: number;
  discardPile: Tile[];
  actionHistory: GameAction[];
  winnersCount: number;
  roundNumber: number;
  createdAt: number;
  lastActionTime: number;
  pendingActions: PendingAction[];
}

export interface PendingAction {
  playerId: string;
  availableActions: ActionType[];
  tile: Tile;
  expiresAt: number;
}
