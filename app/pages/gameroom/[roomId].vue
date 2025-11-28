<template>
  <div class="mahjong-page">
    <div class="room-container">
      <header class="room-header">
        <div class="room-info">
          <h1 class="mahjong-title">Mahjong Room</h1>
          <p class="mahjong-subtitle">
            血战到底 · Room #{{ roomId }}
          </p>
        </div>

        <button class="mahjong-button small" @click="backToLobby">
          Back to Waiting Room
        </button>
      </header>

      <main class="room-main">
        <div v-if="isOverlayVisible" class="game-over-overlay">
          <div class="game-over-card">
            <p class="overlay-title">{{ overlayTitle }}</p>
            <p class="overlay-message">{{ overlayMessage }}</p>
            <button class="mahjong-button primary overlay-button" @click="backToLobby">
              Exit to Lobby
            </button>
          </div>
        </div>

        <!-- Big responsive table -->
        <div class="table-wrapper">
          <div class="mahjong-table">
            <!-- Center status message -->
            <div class="table-center">
              <p class="status">
                <span v-if="isWinner">You Won! 🎉</span>
                <span v-else>{{ turnMessage }}</span>
              </p>
              <p class="hint">
                Click tiles to select; click again to discard. Draws happen automatically after each discard.
              </p>
            </div>
            <!-- Top player -->
            <div class="seat seat-top" :class="{ 'seat-active': activePosition !== null && topPlayer?.position === activePosition }">
              <PlayerOtherArea
                :name="topPlayer?.name || 'Player North'"
                position="top"
                :hand="northHand"
                :melds="northMelds"
                :discards="northDiscards"
                :is-winner="northIsWinner"
              />
            </div>

            <!-- Left player -->
            <div class="seat seat-left" :class="{ 'seat-active': activePosition !== null && leftPlayer?.position === activePosition }">
              <PlayerOtherArea
                :name="leftPlayer?.name || 'Player West'"
                position="left"
                :hand="westHand"
                :melds="westMelds"
                :discards="westDiscards"
                :is-winner="westIsWinner"
              />
            </div>

            <!-- Right player -->
            <div class="seat seat-right" :class="{ 'seat-active': activePosition !== null && rightPlayer?.position === activePosition }">
              <PlayerOtherArea
                :name="rightPlayer?.name || 'Player East'"
                position="right"
                :hand="eastHand"
                :melds="eastMelds"
                :discards="eastDiscards"
                :is-winner="eastIsWinner"
                :claimable-discard-tile-id="claimableDiscardTileId"
              />
            </div>

            <!-- Bottom (self) player -->
            <div class="seat seat-bottom" :class="{ 'seat-active': activePosition !== null && currentPlayer?.position === activePosition }">
              <PlayerSelfArea
                name="You"
                :hand="playerHand"
                :melds="playerMelds"
                :discards="playerDiscards"
                :selected-tile-id="selectedTileId"
                :is-winner="isWinner"
                @tileClick="handleTileClick"
              />
            </div>
          </div>
        </div>

        <!-- Side controls -->
        <div class="side-panel">
          <!-- Admin / Dealer Controls -->
          <div class="test-controls" v-if="canStartGame">
            <h2 class="panel-title">Room Controls</h2>
            <button class="mahjong-button panel-button" @click="startGame" :disabled="isInteractionLocked">
              Start Game ({{ gameState?.players.length }}/4 Players)
            </button>
          </div>

          <div class="test-controls" v-if="isAdmin === 'true'">
            <h2 class="panel-title">Admin Debug</h2>
            <p class="panel-subtitle">Game Phase: {{ gameState?.phase }}</p>
            <p class="panel-subtitle">Players: {{ gameState?.players.length }}</p>
            
            <!-- Setup Test Game -->
            <div v-if="gameState?.phase === 'waiting'">
              <button 
                class="mahjong-button panel-button" 
                @click="setupTestGame"
                v-if="(gameState?.players.length || 0) < 4"
                :disabled="isInteractionLocked"
              >
                Add Bots & Start
              </button>
            </div>

            <!-- Manual Refresh -->
            <button class="mahjong-button panel-button small" @click="refreshState" :disabled="isInteractionLocked">
              Force Refresh State
            </button>

            <!-- Control Other Players -->
            <div v-if="gameState?.phase === 'playing'" style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
              <p class="panel-subtitle">Control Others:</p>
              
              <div v-for="p in otherPlayers" :key="p.id" style="margin-bottom: 8px;">
                <p style="font-size: 0.8rem; margin-bottom: 4px;">{{ p.name }} ({{ p.position }})</p>
                <button 
                  class="mahjong-button panel-button small"
                  @click="forceDiscard(p)"
                  :disabled="isInteractionLocked || gameState?.currentPlayerIndex !== p.position"
                  :style="gameState?.currentPlayerIndex !== p.position ? { opacity: 0.5 } : {}"
                >
                  Discard Random
                </button>
              </div>
            </div>
          </div>

          <div class="test-controls" v-if="isConnected">
            <h2 class="panel-title">Game Actions</h2>
            
            <div v-if="showPeng">
              <button class="mahjong-button panel-button" @click="onPeng" :disabled="isInteractionLocked">
                Pung (碰)
              </button>
            </div>

            <div v-if="showKong">
              <button class="mahjong-button panel-button" @click="onKong" :disabled="isInteractionLocked">
                Kong (杠)
              </button>
            </div>

            <div v-if="showConcealedKong">
              <button class="mahjong-button panel-button" @click="onConcealedKong" :disabled="isInteractionLocked">
                Concealed Kong (暗杠)
              </button>
            </div>

            <div v-if="showExtendedKong">
              <button class="mahjong-button panel-button" @click="onExtendedKong" :disabled="isInteractionLocked">
                Extended Kong (续杠)
              </button>
            </div>

            <div v-if="showHu">
              <button class="mahjong-button panel-button" @click="onHu" :disabled="isInteractionLocked">
                Hu (胡)
              </button>
            </div>

            <div v-if="showPass">
              <button class="mahjong-button panel-button danger" @click="onPass" :disabled="isInteractionLocked">
                Pass (过)
              </button>
            </div>

            <div v-if="!showPeng && !showKong && !showHu && !showPass && !showConcealedKong && !showExtendedKong">
              <p class="panel-subtitle">Waiting for others...</p>
            </div>
          </div>
          <div class="test-controls" v-else>
             <p class="panel-subtitle">Connecting...</p>
             <p v-if="error" class="panel-subtitle" style="color: red">{{ error }}</p>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import PlayerSelfArea from '~/components/PlayerSelfArea.vue'
import PlayerOtherArea from '~/components/PlayerOtherArea.vue'
import { useGame } from '~/composables/useGame'
import { ActionType, GamePhase, GameEndReason, type Tile, type Meld, type Player } from '~/types/game'

const route = useRoute()
const roomId = computed(() => String(route.params.roomId || ''))
const playerId = computed(() => String(route.query.playerId || ''))

const { 
  gameState, 
  currentPlayer, 
  availableActions, 
  isConnected, 
  error, 
  connect, 
  disconnect, 
  executeAction,
  startGame,
  refreshState,
  roomDismissedReason
} = useGame()

const backToLobby = () => navigateTo('/')
const isAdmin = useCookie('is_admin')

onMounted(() => {
  if (roomId.value && playerId.value) {
    connect(roomId.value, playerId.value)
  }
})

onUnmounted(() => {
  disconnect()
})

// ---- Computed Players ----
const getPlayerByRelativePos = (offset: number) => {
  if (!gameState.value || !currentPlayer.value) return null
  const selfPos = currentPlayer.value.position
  const targetPos = (selfPos + offset) % 4
  return gameState.value.players.find(p => p.position === targetPos)
}

const rightPlayer = computed(() => getPlayerByRelativePos(1))
const topPlayer = computed(() => getPlayerByRelativePos(2))
const leftPlayer = computed(() => getPlayerByRelativePos(3))

// ---- Self State ----
const playerHand = computed(() => currentPlayer.value?.hand.concealedTiles || [])
const playerMelds = computed(() => currentPlayer.value?.hand.exposedMelds || [])
const playerDiscards = computed(() => currentPlayer.value?.hand.discardedTiles || [])
const isWinner = computed(() => currentPlayer.value?.status === 'won')
const isDealer = computed(() => currentPlayer.value?.isDealer)
const isGameEnded = computed(() => gameState.value?.phase === GamePhase.ENDED)
const overlayReason = computed(() => roomDismissedReason.value || gameState.value?.endReason || null)
const isOverlayVisible = computed(() => isGameEnded.value || !!roomDismissedReason.value)
const overlayTitle = computed(() => {
  if (roomDismissedReason.value === GameEndReason.OWNER_LEFT) {
    return 'Room Closed'
  }
  return 'Game Over'
})
const overlayMessage = computed(() => {
  const reason = overlayReason.value
  switch (reason) {
    case GameEndReason.WALL_EXHAUSTED:
      return 'The wall is empty. No more tiles to draw.'
    case GameEndReason.LAST_PLAYER:
      return 'Only one player remains. Round complete.'
    case GameEndReason.OWNER_LEFT:
      return 'The host left the room. This game has been dismissed.'
    case GameEndReason.EMPTY_ROOM:
      return 'All players left the room. This game has ended.'
    default:
      return 'This round has ended. Please exit to the lobby.'
  }
})
const isInteractionLocked = computed(() => isOverlayVisible.value)
const canStartGame = computed(() => {
  // Debug log to see why button might not show
  console.log('canStartGame check:', {
    isDealer: isDealer.value,
    phase: gameState.value?.phase,
    playerCount: gameState.value?.players.length
  })
  
  return isDealer.value && 
         gameState.value?.phase === 'waiting' && 
         (gameState.value?.players.length || 0) >= 2
})

// ---- Other Players State ----
const northHand = computed(() => topPlayer.value?.hand.concealedTiles || []) // Will be empty/hidden by backend usually
const northMelds = computed(() => topPlayer.value?.hand.exposedMelds || [])
const northDiscards = computed(() => topPlayer.value?.hand.discardedTiles || [])
const northIsWinner = computed(() => topPlayer.value?.status === 'won')

const activePosition = computed(() => gameState.value?.currentPlayerIndex ?? null)
const currentTurnPlayer = computed(() => {
  if (!gameState.value || activePosition.value === null) return null
  return gameState.value.players[activePosition.value] || null
})

const turnMessage = computed(() => {
  if (!gameState.value) {
    return 'Loading room…'
  }

  if (gameState.value.phase === 'waiting') {
    return 'Waiting for players to start'
  }

  const player = currentTurnPlayer.value
  if (player) {
    if (player.id === currentPlayer.value?.id) {
      return 'Your turn'
    }
    return `${player.name}'s turn`
  }

  return 'Waiting for next turn'
})

const westHand = computed(() => leftPlayer.value?.hand.concealedTiles || [])
const westMelds = computed(() => leftPlayer.value?.hand.exposedMelds || [])
const westDiscards = computed(() => leftPlayer.value?.hand.discardedTiles || [])
const westIsWinner = computed(() => leftPlayer.value?.status === 'won')

const eastHand = computed(() => rightPlayer.value?.hand.concealedTiles || [])
const eastMelds = computed(() => rightPlayer.value?.hand.exposedMelds || [])
const eastDiscards = computed(() => rightPlayer.value?.hand.discardedTiles || [])
const eastIsWinner = computed(() => rightPlayer.value?.status === 'won')

// ---- Interaction ----
const selectedTileId = ref<string | null>(null)
const claimableDiscardTileId = ref<string | null>(null)

const handleTileClick = (tile: Tile) => {
  if (isWinner.value || isInteractionLocked.value) return
  
  // If it's our turn and we can discard
  const canDiscard = availableActions.value.includes(ActionType.DISCARD)
  
  if (selectedTileId.value === tile.id) {
    if (canDiscard) {
      executeAction(ActionType.DISCARD, tile.id)
      selectedTileId.value = null
    }
  } else {
    selectedTileId.value = tile.id
  }
}

// ---- Claims ----
// Check if we have pending actions that require user input (like Pung/Kong/Hu)
// The backend sends availableActions. If we have PENG/KONG/HU, we show buttons.
// For PENG/KONG, we might need to select tiles if there are multiple options, 
// but usually PENG is unique for a given discard. KONG might be unique too.
// The backend `executeAction` for PENG doesn't require tileId if it's obvious, 
// but `gameManager.ts` implementation of `handlePeng` finds matching tiles automatically.

const showPeng = computed(() => availableActions.value.includes(ActionType.PENG))
const showKong = computed(() => availableActions.value.includes(ActionType.KONG))
const showHu = computed(() => availableActions.value.includes(ActionType.HU))
const showPass = computed(() => availableActions.value.includes(ActionType.PASS))

const onPeng = () => executeAction(ActionType.PENG)
const onKong = () => executeAction(ActionType.KONG)
const onHu = () => executeAction(ActionType.HU)
const onPass = () => executeAction(ActionType.PASS)

// For self-drawn Kong (Concealed or Extended)
const showConcealedKong = computed(() => availableActions.value.includes(ActionType.CONCEALED_KONG))
const showExtendedKong = computed(() => availableActions.value.includes(ActionType.EXTENDED_KONG))

const onConcealedKong = () => {
  // We need to know which tiles to kong. 
  // If there's only one set of 4, we can auto-select.
  // For now, let's assume the backend handles it or we need UI for it.
  // The backend `handleConcealedKong` expects `tileIds`.
  // We can find the group of 4 in hand.
  if (!currentPlayer.value) return
  const counts: Record<string, Tile[]> = {}
  for (const t of currentPlayer.value.hand.concealedTiles) {
    const key = `${t.suit}-${t.value}`
    if (!counts[key]) counts[key] = []
    counts[key].push(t)
  }
  
  for (const key in counts) {
    const group = counts[key]
    if (group && group.length === 4) {
      executeAction(ActionType.CONCEALED_KONG, undefined, group.map(t => t.id))
      return // Just do the first one for now
    }
  }
}

const onExtendedKong = () => {
  // Find the tile in hand that matches an exposed triplet
  if (!currentPlayer.value) return
  for (const meld of currentPlayer.value.hand.exposedMelds) {
    if (meld.type === 'triplet' && meld.tiles.length) { // MeldType.TRIPLET
      const baseTile = meld.tiles[0]!
      const match = currentPlayer.value.hand.concealedTiles.find(t => 
        t.suit === baseTile.suit && t.value === baseTile.value
      )
      if (match) {
        executeAction(ActionType.EXTENDED_KONG, match.id)
        return
      }
    }
  }
}

// ---- Admin / Debug Functions ----
const otherPlayers = computed(() => {
  if (!gameState.value || !currentPlayer.value) return []
  return gameState.value.players.filter(p => p.id !== currentPlayer.value!.id)
})

const setupTestGame = async () => {
  if (!roomId.value) return
  
  // Join 3 bots
  // We need to know how many players are currently in
  const currentCount = gameState.value?.players.length || 1
  
  for (let i = currentCount + 1; i <= 4; i++) {
    await useFetch('/api/game/join', {
      method: 'POST',
      body: { gameId: roomId.value, playerName: `Bot ${i}` }
    })
  }
  
  // Refresh to see them
  await refreshState()
  
  // Start Game
  await startGame()
  
  // Refresh again
  await refreshState()
}

const forceDiscard = async (p: Player) => {
  if (!roomId.value || !p.hand.concealedTiles.length) {
    console.warn('Cannot force discard: No tiles found for player', p.name)
    return
  }
  
  // Pick first tile
  const firstTile = p.hand.concealedTiles.at(0)
  if (!firstTile) {
    console.warn('Cannot force discard: player has empty hand now', p.name)
    return
  }
  
  await useFetch('/api/game/action', {
    method: 'POST',
    body: {
      gameId: roomId.value,
      playerId: p.id,
      action: ActionType.DISCARD,
      tileId: firstTile.id
    }
  })
  
  await refreshState()
}
</script>

<style scoped>
.mahjong-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at top, #153b2f, #07130e);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #f5f5f5;
  padding: 16px;
}

.room-container {
  background: rgba(7, 19, 14, 0.92);
  border-radius: 20px;
  padding: 16px 16px 20px;
  max-width: 1280px;
  width: 100%;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.room-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mahjong-title {
  font-size: 1.4rem;
  margin-bottom: 2px;
  letter-spacing: 0.04em;
}

.mahjong-subtitle {
  font-size: 0.9rem;
  opacity: 0.85;
}

.room-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
}

@media (min-width: 900px) {
  .room-main {
    flex-direction: row;
    align-items: stretch;
  }
}

.table-wrapper {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mahjong-table {
  position: relative;
  width: min(80vw, 900px);
  max-height: 80vh;
  aspect-ratio: 4 / 3;
  border-radius: 20px;
  background: radial-gradient(circle at center, #1a5c3e, #0c3421);
  border: 4px solid #b59a5a;
  box-shadow:
    inset 0 0 0 4px rgba(0, 0, 0, 0.25),
    0 12px 30px rgba(0, 0, 0, 0.8);
  padding: 14px;
  overflow: hidden;
}

.table-center {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 60%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.status {
  font-size: 1.2rem;
  margin-bottom: 6px;
  font-weight: 600;
}

.hint {
  font-size: 0.9rem;
  opacity: 0.9;
  line-height: 1.4;
}

/* Seat positioning */
.seat {
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.15s ease, filter 0.15s ease;
}

.seat-active {
  transform: scale(1.03);
  filter: drop-shadow(0 0 12px rgba(255, 234, 120, 0.8));
}

.seat-top {
  top: 4%;
  left: 50%;
  transform: translateX(-50%);
  width: 75%;
}

.seat-bottom {
  bottom: 2%;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
}

.seat-left {
  left: 1.5%;
  top: 50%;
  transform: translateY(-50%);
  width: 22%;
}

.seat-right {
  right: 1.5%;
  top: 50%;
  transform: translateY(-50%);
  width: 22%;
}

/* Side panel */
.side-panel {
  flex: 0 0 230px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (max-width: 899px) {
  .side-panel {
    flex: 0 0 auto;
  }
}

.test-controls {
  padding: 8px 10px 10px;
  border-radius: 14px;
  background: rgba(5, 14, 10, 0.9);
}

.panel-title {
  font-size: 0.95rem;
  margin-bottom: 8px;
  opacity: 0.9;
}

.panel-subtitle {
  font-size: 0.85rem;
  margin-bottom: 6px;
  opacity: 0.9;
}

.mahjong-button {
  padding: 10px 18px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  background: linear-gradient(135deg, #1f8a52, #46c574);
  color: #03100a;
  transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
  white-space: nowrap;
}

.mahjong-button.small {
  padding: 8px 14px;
  font-size: 0.85rem;
}

.mahjong-button:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.45);
}

.mahjong-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.panel-button {
  display: block;
  width: 100%;
  text-align: center;
  margin-bottom: 6px;
}

.panel-button.danger {
  background: rgba(123, 26, 26, 0.9);
  color: #ffdada;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-button.danger:hover {
  background: rgba(160, 38, 38, 1);
}

.game-over-overlay {
  position: absolute;
  inset: 0;
  background: rgba(3, 10, 8, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  z-index: 10;
}

.game-over-card {
  background: rgba(4, 16, 11, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 32px;
  width: min(360px, 90%);
  text-align: center;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
}

.overlay-title {
  font-size: 1.6rem;
  margin-bottom: 12px;
}

.overlay-message {
  font-size: 1rem;
  opacity: 0.9;
  margin-bottom: 20px;
}

.overlay-button {
  width: 100%;
}
</style>