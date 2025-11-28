/**
 * Demo script showing how to interact with the Sichuan Mahjong API
 * Run with: npx tsx server/demo.ts
 */

import { gameManager } from './utils/gameManager';
import { ActionType } from './types/game';

async function demo() {
  console.log('=== Sichuan Mahjong Backend Demo ===\n');

  // Create a game
  console.log('1. Creating game...');
  const { gameId, playerId: p1 } = await gameManager.createGame('Alice');
  console.log(`   Game created: ${gameId}`);
  console.log(`   Player 1 (Alice): ${p1}\n`);

  // Join 3 more players
  console.log('2. Players joining...');
  const { playerId: p2 } = await gameManager.joinGame(gameId, 'Bob');
  console.log(`   Player 2 (Bob): ${p2}`);
  const { playerId: p3 } = await gameManager.joinGame(gameId, 'Carol');
  console.log(`   Player 3 (Carol): ${p3}`);
  const { playerId: p4 } = await gameManager.joinGame(gameId, 'Dave');
  console.log(`   Player 4 (Dave): ${p4}`);
  console.log('   Game auto-started!\n');

  // Get initial game state
  console.log('3. Getting game state...');
  const game = await gameManager.getGame(gameId);
  if (!game) {
    console.log('   Error: Game not found');
    return;
  }
  
  console.log(`   Phase: ${game.phase}`);
  console.log(`   Current player: ${game.players[game.currentPlayerIndex].name}`);
  console.log(`   Wall tiles: ${game.wall.length}`);
  console.log(`   Dealer: ${game.players[game.dealerIndex].name}\n`);

  // Show each player's hand
  console.log('4. Player hands:');
  for (const player of game.players) {
    console.log(`   ${player.name} (${player.isDealer ? 'Dealer' : 'Player'}):`);
    console.log(`   - Concealed tiles: ${player.hand.concealedTiles.length}`);
    console.log(`   - Tiles: ${player.hand.concealedTiles.map(t => `${t.suit}-${t.value}`).join(', ')}`);
    
    // Check available actions
    const actions = await gameManager.getAvailableActions(gameId, player.id);
    if (actions.length > 0) {
      console.log(`   - Available actions: ${actions.join(', ')}`);
    }
    console.log();
  }

  // Simulate first discard
  console.log('5. Alice (dealer) discards a tile...');
  const dealer = game.players[game.dealerIndex];
  const firstTile = dealer.hand.concealedTiles[0];
  console.log(`   Discarding: ${firstTile.suit}-${firstTile.value}`);
  
  try {
    await gameManager.executeAction(gameId, dealer.id, ActionType.DISCARD, firstTile.id);
    console.log('   ✓ Discard successful\n');
  } catch (error: any) {
    console.log(`   ✗ Error: ${error.message}\n`);
  }

  // Check game state after action
  const updatedGame = await gameManager.getGame(gameId);
  if (updatedGame) {
    console.log('6. Game state after discard:');
    console.log(`   Current player: ${updatedGame.players[updatedGame.currentPlayerIndex].name}`);
    console.log(`   Discard pile: ${updatedGame.discardPile.length} tiles`);
    console.log(`   Pending actions: ${updatedGame.pendingActions.length}`);
    
    if (updatedGame.pendingActions.length > 0) {
      console.log('   Players can respond:');
      for (const pa of updatedGame.pendingActions) {
        const player = updatedGame.players.find(p => p.id === pa.playerId);
        console.log(`   - ${player?.name}: ${pa.availableActions.join(', ')}`);
      }
    }
    console.log();
  }

  // Game statistics
  console.log('7. Game statistics:');
  console.log(`   Total actions taken: ${game.actionHistory.length}`);
  console.log(`   Winners so far: ${game.winnersCount}`);
  console.log(`   Round number: ${game.roundNumber}`);
  console.log(`   Game duration: ${Math.round((Date.now() - game.createdAt) / 1000)}s\n`);

  // Show game logic info
  console.log('8. Game Rules Applied:');
  console.log('   ✓ 108 tiles (3 suits × 9 values × 4 copies)');
  console.log('   ✓ No honor tiles');
  console.log('   ✓ 4 players, each with 13-14 tiles');
  console.log('   ✓ No Chi allowed (only Peng and Kong)');
  console.log('   ✓ Must be missing one suit to win');
  console.log('   ✓ Blood Battle: game continues after first win');
  console.log('   ✓ Real-time state updates via WebSocket\n');

  console.log('=== Demo Complete ===');
  console.log('\nNOTE: This is an in-memory demo. Start the Nuxt server to use HTTP API:');
  console.log('  npm run dev');
  console.log('  Then access: http://localhost:3000/api/game/list\n');
}

// Run demo
demo().catch(console.error);
