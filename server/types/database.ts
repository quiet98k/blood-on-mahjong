import { ObjectId } from 'mongodb';

/**
 * User Collection - Account + Profile + Login Info
 */
export interface User {
  _id?: ObjectId;
  userId: string; // Unique user identifier
  email: string;
  name: string;
  avatar?: string;
  oauthProvider: 'google' | 'local'; // OAuth provider
  oauthId?: string; // Google ID
  createdAt: Date;
  lastLoginAt: Date;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    totalScore: number;
    highestFan: number;
    winRate: number;
  };
}

/**
 * Room Collection - Room Settings + Owner
 */
export interface Room {
  _id?: ObjectId;
  roomId: string; // Unique room identifier
  ownerId: string; // User ID of room creator
  name: string;
  status: 'waiting' | 'playing' | 'finished';
  maxPlayers: 4;
  currentPlayers: string[]; // Array of user IDs
  settings: {
    isPrivate: boolean;
    password?: string;
    allowSpectators: boolean;
  };
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
}

/**
 * Mahjong Game Collection - Active Game State
 */
export interface MahjongGame {
  _id?: ObjectId;
  gameId: string; // Unique game identifier
  roomId: string; // Reference to room
  phase: 'starting' | 'playing' | 'cha_jiao' | 'ended';
  players: GamePlayer[];
  wall: StoredTile[];
  currentPlayerIndex: number;
  dealerIndex: number;
  discardPile: StoredTile[];
  actionHistory: GameAction[];
  winnersCount: number;
  roundNumber: number;
  createdAt: Date;
  lastActionTime: Date;
  updatedAt: Date;
}

export interface GamePlayer {
  userId: string;
  name: string;
  position: number; // 0-3
  hand: {
    concealedTiles: StoredTile[];
    exposedMelds: StoredMeld[];
    discardedTiles: StoredTile[];
  };
  status: 'waiting' | 'playing' | 'won' | 'lost';
  isDealer: boolean;
  isTing: boolean;
  missingSuit: 'dots' | 'wan' | 'tiao' | null;
  windScore: number; // Kong scores (刮风)
  rainScore: number; // Concealed kong scores (下雨)
  wonFan: number;
}

export interface StoredTile {
  suit: 'dots' | 'wan' | 'tiao';
  value: number; // 1-9
  id: string;
}

export interface StoredMeld {
  type: 'sequence' | 'triplet' | 'kong' | 'concealed_kong' | 'pair';
  tiles: StoredTile[];
  isConcealed: boolean;
}

export interface GameAction {
  playerId: string;
  type: 'draw' | 'discard' | 'peng' | 'kong' | 'extended_kong' | 'concealed_kong' | 'hu' | 'pass';
  tile?: StoredTile;
  tiles?: StoredTile[];
  timestamp: number;
}

/**
 * Game History Collection - Completed Games
 */
export interface GameHistory {
  _id?: ObjectId;
  gameId: string;
  roomId: string;
  roomName: string;
  players: HistoryPlayer[];
  winners: string[]; // Array of user IDs who won
  totalRounds: number;
  finalScores: Record<string, number>; // userId -> score
  fanDetails: Record<string, FanDetail[]>; // userId -> fan details per win
  duration: number; // Game duration in milliseconds
  completedAt: Date;
  actionCount: number;
}

export interface HistoryPlayer {
  userId: string;
  name: string;
  avatar?: string;
  position: number;
  finalScore: number;
  wins: number;
  highestFan: number;
}

export interface FanDetail {
  round: number;
  fan: number;
  fanName: string;
  fanTypes: string[];
  score: number;
  isSelfDrawn: boolean;
}

/**
 * Session Collection - For OAuth and session management
 */
export interface Session {
  _id?: ObjectId;
  sessionId: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Socket Connection Collection - For tracking connected users across servers
 */
export interface SocketConnection {
  _id?: ObjectId;
  socketId: string;
  userId: string;
  userName: string;
  roomId?: string;
  serverId?: string; // Server instance ID for multi-server setups
  connectedAt: Date;
  lastSeenAt: Date;
}

/**
 * Room State Collection - For tracking room membership across servers
 */
export interface RoomState {
  _id?: ObjectId;
  roomId: string;
  playerIds: string[]; // Array of user IDs in room
  socketIds: string[]; // Array of socket IDs in room
  maxPlayers: number;
  createdAt: Date;
  updatedAt: Date;
}
