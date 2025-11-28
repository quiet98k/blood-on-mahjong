import { 
  GameState, 
  GamePhase, 
  Player, 
  PlayerStatus, 
  Tile, 
  ActionType,
  GameAction,
  Meld,
  MeldType,
  PendingAction,
  TileSuit
} from '../types/game';
import { createDeck, shuffleTiles, findTileById, removeTile, sortTiles, tilesEqual, groupTiles, isMissingOneSuit } from './tiles';
import { canWin, isTing, getListeningTiles } from './handValidator';
import { calculateFan, calculateWinningScore, calculateKongScore, calculateGameResult } from './scoring';
import { randomUUID } from 'crypto';
import { saveGameState, loadGameState, loadAllGameStates, deleteGameState } from './gamePersistence';

/**
 * In-memory game state manager
 */
class GameManager {
  private games: Map<string, GameState> = new Map();
  private playerToGame: Map<string, string> = new Map();
  private wsManager: any = null;
  private isHydrated = false;

  setWebSocketManager(manager: any) {
    this.wsManager = manager;
  }

  private async hydrateFromDatabase() {
    if (this.isHydrated) return;
    const persistedGames = await loadAllGameStates();
    for (const game of persistedGames) {
      this.games.set(game.gameId, game);
      for (const player of game.players) {
        this.playerToGame.set(player.id, game.gameId);
      }
    }
    this.isHydrated = true;
  }

  private async ensureGameLoaded(gameId: string): Promise<GameState | undefined> {
    if (this.games.has(gameId)) {
      return this.games.get(gameId);
    }

    const stored = await loadGameState(gameId);
    if (stored) {
      this.games.set(gameId, stored);
      for (const player of stored.players) {
        this.playerToGame.set(player.id, gameId);
      }
      return stored;
    }

    return undefined;
  }

  private async persistGame(game: GameState) {
    await saveGameState(game);
  }

  private broadcastGameState(gameId: string) {
    if (!this.wsManager) return;
    const game = this.games.get(gameId);
    if (!game) return;

    this.wsManager.broadcast(gameId, 'gameStateUpdate', {
      gameId,
      phase: game.phase,
      currentPlayerIndex: game.currentPlayerIndex,
      discardPile: game.discardPile,
      wallCount: game.wall.length,
      winnersCount: game.winnersCount
    });
  }

  /**
   * Create a new game
   */
  async createGame(playerName: string): Promise<{ gameId: string; playerId: string }> {
    await this.hydrateFromDatabase();

    const gameId = randomUUID();
    const playerId = randomUUID();

    const player: Player = {
      id: playerId,
      name: playerName,
      position: 0,
      hand: {
        concealedTiles: [],
        exposedMelds: [],
        discardedTiles: []
      },
      status: PlayerStatus.WAITING,
      isDealer: true,
      isTing: false,
      missingSuit: null,
      windScore: 0,
      rainScore: 0,
      wonFan: 0
    };

    const game: GameState = {
      gameId,
      phase: GamePhase.WAITING,
      players: [player],
      wall: [],
      currentPlayerIndex: 0,
      dealerIndex: 0,
      discardPile: [],
      actionHistory: [],
      winnersCount: 0,
      roundNumber: 1,
      createdAt: Date.now(),
      lastActionTime: Date.now(),
      pendingActions: []
    };

    this.games.set(gameId, game);
    this.playerToGame.set(playerId, gameId);

    await this.persistGame(game);

    return { gameId, playerId };
  }

  /**
   * Join an existing game
   */
  async joinGame(gameId: string, playerName: string): Promise<{ playerId: string; position: number }> {
    await this.hydrateFromDatabase();

    const game = await this.ensureGameLoaded(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    if (game.phase !== GamePhase.WAITING) {
      throw new Error('Game already started');
    }

    if (game.players.length >= 4) {
      throw new Error('Game is full');
    }

    const playerId = randomUUID();
    const position = game.players.length;

    const player: Player = {
      id: playerId,
      name: playerName,
      position,
      hand: {
        concealedTiles: [],
        exposedMelds: [],
        discardedTiles: []
      },
      status: PlayerStatus.WAITING,
      isDealer: false,
      isTing: false,
      missingSuit: null,
      windScore: 0,
      rainScore: 0,
      wonFan: 0
    };

    game.players.push(player);
    this.playerToGame.set(playerId, gameId);

    // Auto-start removed. Use manual start.
    // if (game.players.length === 4) {
    //   this.startGame(gameId);
    // }

    // Broadcast update so lobby sees new player
    await this.persistGame(game);
    this.broadcastGameState(gameId);

    return { playerId, position };
  }

  /**
   * Start the game
   */
  public async startGame(gameId: string): Promise<void> {
    await this.hydrateFromDatabase();

    const game = await this.ensureGameLoaded(gameId);
    if (!game) return;

    if (game.players.length < 2) {
      throw new Error('Need at least 2 players to start');
    }

    game.phase = GamePhase.STARTING;

    // Create and shuffle deck
    const deck = createDeck();
    game.wall = shuffleTiles(deck);

    // Deal tiles to players (each gets 13 tiles)
    for (const player of game.players) {
      player.hand.concealedTiles = [];
      for (let i = 0; i < 13; i++) {
        const tile = game.wall.pop()!;
        player.hand.concealedTiles.push(tile);
      }
      player.hand.concealedTiles = sortTiles(player.hand.concealedTiles);
      player.status = PlayerStatus.PLAYING;
    }

    // Dealer draws first tile
    const firstTile = game.wall.pop()!;
    game.players[game.dealerIndex].hand.concealedTiles.push(firstTile);
    game.players[game.dealerIndex].hand.concealedTiles = sortTiles(game.players[game.dealerIndex].hand.concealedTiles);

    game.currentPlayerIndex = game.dealerIndex;
    game.phase = GamePhase.PLAYING;
    game.lastActionTime = Date.now();

    await this.persistGame(game);
    this.broadcastGameState(gameId);
  }

  /**
   * Get game state
   */
  async getGame(gameId: string): Promise<GameState | undefined> {
    await this.hydrateFromDatabase();
    const game = await this.ensureGameLoaded(gameId);
    return game;
  }

  /**
   * Get game by player ID
   */
  async getGameByPlayer(playerId: string): Promise<GameState | undefined> {
    await this.hydrateFromDatabase();
    const gameId = this.playerToGame.get(playerId);
    if (!gameId) return undefined;
    return this.ensureGameLoaded(gameId);
  }

  /**
   * Get available actions for a player
   */
  async getAvailableActions(gameId: string, playerId: string): Promise<ActionType[]> {
    await this.hydrateFromDatabase();
    const game = await this.ensureGameLoaded(gameId);
    if (!game || game.phase !== GamePhase.PLAYING) return [];

    const player = game.players.find(p => p.id === playerId);
    if (!player || player.status !== PlayerStatus.PLAYING) return [];

    const actions: ActionType[] = [];
    const currentPlayer = game.players[game.currentPlayerIndex];

    if (!currentPlayer) {
      // Game might still be in setup; no actions available yet
      return actions;
    }

    // If it's the player's turn and they have 14 tiles (just drew)
    if (currentPlayer.id === playerId && player.hand.concealedTiles.length === 14) {
      actions.push(ActionType.DISCARD);
      
      // Check for concealed kong
      const groups = groupTiles(player.hand.concealedTiles);
      for (const group of groups.values()) {
        if (group.length === 4) {
          actions.push(ActionType.CONCEALED_KONG);
        }
      }

      // Check for extended kong (if player has exposed triplet and draws the 4th)
      for (const meld of player.hand.exposedMelds) {
        if (meld.type === MeldType.TRIPLET) {
          const hasFourth = player.hand.concealedTiles.some(t => tilesEqual(t, meld.tiles[0]));
          if (hasFourth) {
            actions.push(ActionType.EXTENDED_KONG);
          }
        }
      }

      // Check if can win
      const winCheck = canWin(player.hand.concealedTiles);
      if (winCheck.canWin) {
        actions.push(ActionType.HU);
      }
    }

    // Check pending actions (peng, kong, hu from another player's discard)
    const pendingAction = game.pendingActions.find(pa => pa.playerId === playerId);
    if (pendingAction) {
      return pendingAction.availableActions;
    }

    return actions;
  }

  /**
   * Execute a game action
   */
  async executeAction(gameId: string, playerId: string, action: ActionType, tileId?: string, tileIds?: string[]): Promise<void> {
    await this.hydrateFromDatabase();
    const game = await this.ensureGameLoaded(gameId);
    if (!game) throw new Error('Game not found');

    const player = game.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    const gameAction: GameAction = {
      playerId,
      type: action,
      timestamp: Date.now()
    };

    switch (action) {
      case ActionType.DISCARD:
        this.handleDiscard(game, player, tileId!);
        gameAction.tile = findTileById(player.hand.concealedTiles, tileId!);
        break;

      case ActionType.DRAW:
        this.handleDraw(game, player);
        break;

      case ActionType.PENG:
        this.handlePeng(game, player);
        break;

      case ActionType.KONG:
        this.handleKong(game, player, tileId!);
        break;

      case ActionType.CONCEALED_KONG:
        this.handleConcealedKong(game, player, tileIds!);
        break;

      case ActionType.EXTENDED_KONG:
        this.handleExtendedKong(game, player, tileId!);
        break;

      case ActionType.HU:
        this.handleHu(game, player);
        break;

      case ActionType.PASS:
        this.handlePass(game, player);
        break;
    }

    game.actionHistory.push(gameAction);
    game.lastActionTime = Date.now();

    // Broadcast game state update
    await this.persistGame(game);
    this.broadcastGameState(gameId);
  }

  private handleDiscard(game: GameState, player: Player, tileId: string): void {
    const tile = findTileById(player.hand.concealedTiles, tileId);
    if (!tile) throw new Error('Tile not found');

    // Remove from hand
    player.hand.concealedTiles = removeTile(player.hand.concealedTiles, tileId);
    player.hand.discardedTiles.push(tile);
    game.discardPile.push(tile);

    // Check if player is missing one suit after discard
    const missing = isMissingOneSuit(player.hand.concealedTiles);
    if (missing.missing) {
      player.missingSuit = missing.missingSuit;
    }

    // Check for ting status
    player.isTing = isTing(player.hand.concealedTiles);

    // Check if other players can peng, kong, or hu
    this.checkPendingActions(game, tile);

    // If no pending actions, move to next player
    if (game.pendingActions.length === 0) {
      this.moveToNextPlayer(game);
    }
  }

  private handleDraw(game: GameState, player: Player): void {
    if (game.wall.length === 0) {
      this.endRound(game);
      return;
    }

    const tile = game.wall.pop()!;
    player.hand.concealedTiles.push(tile);
    player.hand.concealedTiles = sortTiles(player.hand.concealedTiles);
  }

  private handlePeng(game: GameState, player: Player): void {
    const lastDiscard = game.discardPile[game.discardPile.length - 1];
    if (!lastDiscard) return;

    // Find matching tiles in hand
    const matchingTiles = player.hand.concealedTiles.filter(t => tilesEqual(t, lastDiscard));
    if (matchingTiles.length < 2) return;

    // Remove tiles from hand
    player.hand.concealedTiles = removeTile(player.hand.concealedTiles, matchingTiles[0].id);
    player.hand.concealedTiles = removeTile(player.hand.concealedTiles, matchingTiles[1].id);

    // Create exposed meld
    const meld: Meld = {
      type: MeldType.TRIPLET,
      tiles: [lastDiscard, matchingTiles[0], matchingTiles[1]],
      isConcealed: false
    };
    player.hand.exposedMelds.push(meld);

    // Remove from discard pile
    game.discardPile.pop();

    // Clear pending actions
    game.pendingActions = [];

    // Player must discard
    game.currentPlayerIndex = game.players.findIndex(p => p.id === player.id);
  }

  private handleKong(game: GameState, player: Player, tileId: string): void {
    const lastDiscard = game.discardPile[game.discardPile.length - 1];
    if (!lastDiscard) return;

    // Find matching tiles in hand
    const matchingTiles = player.hand.concealedTiles.filter(t => tilesEqual(t, lastDiscard));
    if (matchingTiles.length < 3) return;

    // Remove tiles from hand
    for (let i = 0; i < 3; i++) {
      player.hand.concealedTiles = removeTile(player.hand.concealedTiles, matchingTiles[i].id);
    }

    // Create exposed kong
    const meld: Meld = {
      type: MeldType.KONG,
      tiles: [lastDiscard, ...matchingTiles.slice(0, 3)],
      isConcealed: false
    };
    player.hand.exposedMelds.push(meld);

    // Remove from discard pile
    game.discardPile.pop();

    // Award direct kong score (点杠) - discarder pays 2
    const discarderIndex = (game.currentPlayerIndex - 1 + game.players.length) % game.players.length;
    player.windScore += 2;

    // Clear pending actions
    game.pendingActions = [];

    // Draw supplement tile
    this.handleDraw(game, player);

    // Player must discard
    game.currentPlayerIndex = game.players.findIndex(p => p.id === player.id);
  }

  private handleConcealedKong(game: GameState, player: Player, tileIds: string[]): void {
    if (tileIds.length !== 4) return;

    const tiles = tileIds.map(id => findTileById(player.hand.concealedTiles, id)).filter(t => t) as Tile[];
    if (tiles.length !== 4) return;

    // Remove from hand
    for (const tile of tiles) {
      player.hand.concealedTiles = removeTile(player.hand.concealedTiles, tile.id);
    }

    // Create concealed kong (still exposed in Sichuan rules)
    const meld: Meld = {
      type: MeldType.CONCEALED_KONG,
      tiles,
      isConcealed: false
    };
    player.hand.exposedMelds.push(meld);

    // Award concealed kong score - each non-winner pays 2
    const nonWinners = game.players.filter(p => p.status === PlayerStatus.PLAYING && p.id !== player.id);
    player.rainScore += nonWinners.length * 2;

    // Draw supplement tile
    this.handleDraw(game, player);
  }

  private handleExtendedKong(game: GameState, player: Player, tileId: string): void {
    const tile = findTileById(player.hand.concealedTiles, tileId);
    if (!tile) return;

    // Find matching exposed triplet
    const tripletIndex = player.hand.exposedMelds.findIndex(
      m => m.type === MeldType.TRIPLET && tilesEqual(m.tiles[0], tile)
    );
    if (tripletIndex === -1) return;

    // Remove tile from hand
    player.hand.concealedTiles = removeTile(player.hand.concealedTiles, tileId);

    // Convert triplet to kong
    player.hand.exposedMelds[tripletIndex].type = MeldType.KONG;
    player.hand.exposedMelds[tripletIndex].tiles.push(tile);

    // Award extended kong score - each non-winner pays 1
    const nonWinners = game.players.filter(p => p.status === PlayerStatus.PLAYING && p.id !== player.id);
    player.windScore += nonWinners.length * 1;

    // Draw supplement tile
    this.handleDraw(game, player);
  }

  private handleHu(game: GameState, player: Player): void {
    player.status = PlayerStatus.WON;
    game.winnersCount++;

    // Calculate fan
    const winCheck = canWin(player.hand.concealedTiles);
    const isSelfDrawn = player.hand.concealedTiles.length === 14;
    const isKongFlower = false; // TODO: track if won after kong draw
    
    const fan = calculateFan(
      player.hand.concealedTiles,
      player.hand.exposedMelds,
      winCheck.winType!,
      isSelfDrawn,
      isKongFlower,
      false,
      false,
      false,
      false
    );

    player.wonFan = fan.totalFan;

    // Check if game should end
    if (game.winnersCount >= 3 || game.wall.length === 0) {
      this.endRound(game);
    } else {
      // Continue playing
      this.moveToNextPlayer(game);
    }
  }

  private handlePass(game: GameState, player: Player): void {
    // Remove player's pending action
    game.pendingActions = game.pendingActions.filter(pa => pa.playerId !== player.id);

    // If no more pending actions, move to next player
    if (game.pendingActions.length === 0) {
      this.moveToNextPlayer(game);
    }
  }

  private checkPendingActions(game: GameState, discardedTile: Tile): void {
    game.pendingActions = [];

    for (const player of game.players) {
      if (player.status !== PlayerStatus.PLAYING) continue;
      if (player.id === game.players[game.currentPlayerIndex].id) continue;

      const actions: ActionType[] = [];

      // Check for peng
      const matchingTiles = player.hand.concealedTiles.filter(t => tilesEqual(t, discardedTile));
      if (matchingTiles.length >= 2) {
        actions.push(ActionType.PENG);
      }

      // Check for kong
      if (matchingTiles.length >= 3) {
        actions.push(ActionType.KONG);
      }

      // Check for hu
      const testHand = [...player.hand.concealedTiles, discardedTile];
      if (canWin(testHand).canWin) {
        // Must be missing one suit
        const missing = isMissingOneSuit(testHand);
        if (missing.missing) {
          actions.push(ActionType.HU);
        }
      }

      if (actions.length > 0) {
        actions.push(ActionType.PASS);
        game.pendingActions.push({
          playerId: player.id,
          availableActions: actions,
          tile: discardedTile,
          expiresAt: Date.now() + 30000 // 30 seconds to respond
        });
      }
    }
  }

  private moveToNextPlayer(game: GameState): void {
    if (game.players.length === 0) {
      throw new Error('No players available to take a turn');
    }

    let rotations = 0;
    do {
      game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
      rotations++;
      if (rotations > game.players.length) {
        throw new Error('No active players remaining in the round');
      }
    } while (game.players[game.currentPlayerIndex].status !== PlayerStatus.PLAYING);

    // Draw tile for next player once we have a valid target
    const nextPlayer = game.players[game.currentPlayerIndex];
    this.handleDraw(game, nextPlayer);
  }

  private endRound(game: GameState): void {
    game.phase = GamePhase.CHA_JIAO;

    // Calculate final scores
    const winners = game.players.filter(p => p.status === PlayerStatus.WON);
    const finalScores = calculateGameResult(game.players, winners);

    // TODO: Store results and prepare for next round

    game.phase = GamePhase.ENDED;
  }

  /**
   * List all active games
   */
  async listGames(): Promise<GameState[]> {
    await this.hydrateFromDatabase();
    return Array.from(this.games.values());
  }

  /**
   * Delete a game
   */
  async deleteGame(gameId: string): Promise<void> {
    await this.hydrateFromDatabase();
    const game = await this.ensureGameLoaded(gameId);
    if (game) {
      for (const player of game.players) {
        this.playerToGame.delete(player.id);
      }
      this.games.delete(gameId);
    }
    await deleteGameState(gameId);
  }
}

// Singleton instance
// Use globalThis to persist state across HMR reloads in development
const globalGameManager = globalThis as unknown as { gameManager: GameManager };

if (!globalGameManager.gameManager) {
  globalGameManager.gameManager = new GameManager();
}

export const gameManager = globalGameManager.gameManager;
