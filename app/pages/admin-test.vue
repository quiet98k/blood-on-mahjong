<template>
  <div class="mahjong-page">
    <div class="room-container">
      <header class="room-header">
        <div class="room-info">
          <h1 class="mahjong-title">Admin Test Room</h1>
          <p class="mahjong-subtitle">
            Offline Mode · UI & Logic Testing
          </p>
        </div>

        <button class="mahjong-button small" @click="backToLobby">
          Back to Lobby
        </button>
      </header>

      <main class="room-main">
        <!-- Big responsive table -->
        <div class="table-wrapper">
          <div class="mahjong-table">
            <!-- Center status message -->
            <div class="table-center">
              <p class="status">
                {{ statusMessage }}
              </p>
              <p class="hint">
                Admin Mode: Use the panel on the right to control the game state.
              </p>
            </div>

            <!-- Top player -->
            <div class="seat seat-top">
              <PlayerOtherArea
                name="Player North"
                position="top"
                :hand="northHand"
                :melds="northMelds"
                :discards="northDiscards"
                :is-winner="northIsWinner"
              />
            </div>

            <!-- Left player -->
            <div class="seat seat-left">
              <PlayerOtherArea
                name="Player West"
                position="left"
                :hand="westHand"
                :melds="westMelds"
                :discards="westDiscards"
                :is-winner="westIsWinner"
              />
            </div>

            <!-- Right player -->
            <div class="seat seat-right">
              <PlayerOtherArea
                name="Player East"
                position="right"
                :hand="eastHand"
                :melds="eastMelds"
                :discards="eastDiscards"
                :is-winner="eastIsWinner"
                :claimable-discard-tile-id="claimableDiscardTileId"
              />
            </div>

            <!-- Bottom (self) player -->
            <div class="seat seat-bottom">
              <PlayerSelfArea
                name="Admin (You)"
                :hand="playerHand"
                :melds="playerMelds"
                :discards="playerDiscards"
                :selected-tile-id="selectedTileId"
                :is-winner="playerIsWinner"
                @tileClick="handleTileClick"
              />
            </div>
          </div>
        </div>

        <!-- Side controls -->
        <div class="side-panel">
          <div class="test-controls">
            <h2 class="panel-title">Admin Controls</h2>
            
            <div class="control-group">
              <p class="panel-subtitle">Game Flow</p>
              <button class="mahjong-button panel-button" @click="initGame">
                Reset / Start New Game
              </button>
            </div>

            <!-- Self Actions -->
            <div class="control-group">
              <p class="panel-subtitle">My Actions</p>
              <div class="button-grid">
                <button class="mahjong-button panel-button" @click="drawTile">Draw</button>
                <button class="mahjong-button panel-button" @click="autoSortHand">Sort</button>
              </div>
              <div class="button-grid three-col">
                <button class="mahjong-button panel-button small" @click="simulateAction('self', 'peng')">Peng</button>
                <button class="mahjong-button panel-button small" @click="simulateAction('self', 'gang')">Gang</button>
                <button class="mahjong-button panel-button small" @click="simulateAction('self', 'hu')">Hu</button>
              </div>
            </div>

            <!-- East Actions -->
            <div class="control-group">
              <p class="panel-subtitle">East Actions</p>
              <button class="mahjong-button panel-button small" @click="simulateOtherPlay('east')">Play (Draw+Discard)</button>
              <div class="button-grid three-col">
                <button class="mahjong-button panel-button small" @click="simulateAction('east', 'peng')">Peng</button>
                <button class="mahjong-button panel-button small" @click="simulateAction('east', 'gang')">Gang</button>
                <button class="mahjong-button panel-button small" @click="simulateAction('east', 'hu')">Hu</button>
              </div>
            </div>

            <!-- North Actions -->
            <div class="control-group">
              <p class="panel-subtitle">North Actions</p>
              <button class="mahjong-button panel-button small" @click="simulateOtherPlay('north')">Play (Draw+Discard)</button>
              <div class="button-grid three-col">
                <button class="mahjong-button panel-button small" @click="simulateAction('north', 'peng')">Peng</button>
                <button class="mahjong-button panel-button small" @click="simulateAction('north', 'gang')">Gang</button>
                <button class="mahjong-button panel-button small" @click="simulateAction('north', 'hu')">Hu</button>
              </div>
            </div>

            <!-- West Actions -->
            <div class="control-group">
              <p class="panel-subtitle">West Actions</p>
              <button class="mahjong-button panel-button small" @click="simulateOtherPlay('west')">Play (Draw+Discard)</button>
              <div class="button-grid three-col">
                <button class="mahjong-button panel-button small" @click="simulateAction('west', 'peng')">Peng</button>
                <button class="mahjong-button panel-button small" @click="simulateAction('west', 'gang')">Gang</button>
                <button class="mahjong-button panel-button small" @click="simulateAction('west', 'hu')">Hu</button>
              </div>
            </div>
            
            <div class="control-group">
              <p class="panel-subtitle">Debug Info</p>
              <p style="font-size: 0.8rem; opacity: 0.7;">
                Hand Size: {{ playerHand.length }}<br>
                Selected: {{ selectedTileId || 'None' }}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PlayerSelfArea from '~/components/PlayerSelfArea.vue'
import PlayerOtherArea from '~/components/PlayerOtherArea.vue'
import { TileSuit } from '~/types/game'

// Types locally defined for simplicity or imported
interface Tile {
  suit: string;
  value: number;
  id: string;
}

// State
const statusMessage = ref('Admin Test Mode')
const selectedTileId = ref<string | null>(null)
const claimableDiscardTileId = ref<string | null>(null)

// Hands & Status
const playerHand = ref<Tile[]>([])
const playerMelds = ref<any[]>([])
const playerDiscards = ref<Tile[]>([])
const playerIsWinner = ref(false)

const northHand = ref<Tile[]>([])
const northMelds = ref<any[]>([])
const northDiscards = ref<Tile[]>([])
const northIsWinner = ref(false)

const westHand = ref<Tile[]>([])
const westMelds = ref<any[]>([])
const westDiscards = ref<Tile[]>([])
const westIsWinner = ref(false)

const eastHand = ref<Tile[]>([])
const eastMelds = ref<any[]>([])
const eastDiscards = ref<Tile[]>([])
const eastIsWinner = ref(false)

// Navigation
const backToLobby = () => navigateTo('/')

// Logic
const generateTile = (idPrefix: string, index: number): Tile => {
  const suits = [TileSuit.DOTS, TileSuit.BAMBOOS, TileSuit.CHARACTERS]
  const suit = suits[Math.floor(Math.random() * suits.length)]
  const value = Math.floor(Math.random() * 9) + 1
  return {
    suit,
    value,
    id: `${idPrefix}-${index}-${Date.now()}`
  }
}

const initGame = () => {
  statusMessage.value = 'Game Started (Local)'
  
  // Clear all
  playerHand.value = []
  playerDiscards.value = []
  playerMelds.value = []
  playerIsWinner.value = false
  
  northHand.value = []
  northDiscards.value = []
  northMelds.value = []
  northIsWinner.value = false
  
  westHand.value = []
  westDiscards.value = []
  westMelds.value = []
  westIsWinner.value = false
  
  eastHand.value = []
  eastDiscards.value = []
  eastMelds.value = []
  eastIsWinner.value = false

  // Deal 13 tiles to everyone
  for (let i = 0; i < 13; i++) {
    playerHand.value.push(generateTile('self', i))
    northHand.value.push(generateTile('north', i))
    westHand.value.push(generateTile('west', i))
    eastHand.value.push(generateTile('east', i))
  }
  
  // Sort self hand
  autoSortHand()
}

const drawTile = () => {
  if (playerHand.value.length >= 14) {
    statusMessage.value = 'Hand full, cannot draw'
    return
  }
  const newTile = generateTile('draw', playerHand.value.length)
  playerHand.value.push(newTile)
  statusMessage.value = `Drawn ${newTile.suit} ${newTile.value}`
}

const handleTileClick = (tile: Tile) => {
  if (playerIsWinner.value) return

  if (selectedTileId.value === tile.id) {
    // Discard
    const index = playerHand.value.findIndex(t => t.id === tile.id)
    if (index !== -1) {
      const discarded = playerHand.value.splice(index, 1)[0]
      playerDiscards.value.push(discarded)
      selectedTileId.value = null
      statusMessage.value = `Discarded ${discarded.suit} ${discarded.value}`
      
      // Auto sort after discard (optional, usually we sort after draw)
      autoSortHand()
    }
  } else {
    selectedTileId.value = tile.id
  }
}

const autoSortHand = () => {
  playerHand.value.sort((a, b) => {
    if (a.suit !== b.suit) return a.suit.localeCompare(b.suit)
    return a.value - b.value
  })
}

const simulateOtherPlay = (position: 'north' | 'west' | 'east') => {
  let targetHand, targetDiscards
  if (position === 'north') { targetHand = northHand; targetDiscards = northDiscards }
  else if (position === 'west') { targetHand = westHand; targetDiscards = westDiscards }
  else { targetHand = eastHand; targetDiscards = eastDiscards }
  
  // Simple logic: Draw then Discard
  const newTile = generateTile(position, targetHand.value.length)
  targetHand.value.push(newTile)
  
  setTimeout(() => {
    const discardIndex = Math.floor(Math.random() * targetHand.value.length)
    const discarded = targetHand.value.splice(discardIndex, 1)[0]
    targetDiscards.value.push(discarded)
    statusMessage.value = `${position} played ${discarded.suit} ${discarded.value}`
    claimableDiscardTileId.value = discarded.id
  }, 500)
}

const simulateAction = (position: 'self' | 'north' | 'west' | 'east', action: 'peng' | 'gang' | 'hu') => {
  let targetHand, targetMelds, targetWinner
  
  if (position === 'self') {
    targetHand = playerHand
    targetMelds = playerMelds
    targetWinner = playerIsWinner
  } else if (position === 'north') {
    targetHand = northHand
    targetMelds = northMelds
    targetWinner = northIsWinner
  } else if (position === 'west') {
    targetHand = westHand
    targetMelds = westMelds
    targetWinner = westIsWinner
  } else {
    targetHand = eastHand
    targetMelds = eastMelds
    targetWinner = eastIsWinner
  }

  if (action === 'hu') {
    targetWinner.value = !targetWinner.value // Toggle
    statusMessage.value = `${position} declared HU!`
    return
  }

  // For Peng/Gang, we need to remove tiles and add a meld
  const countToRemove = action === 'peng' ? 2 : 3 // Usually 2 from hand for Peng (plus discard), 3 for Gang (plus discard) or 4 from hand
  
  // Just remove random tiles to simulate
  if (targetHand.value.length >= countToRemove) {
    const removed = targetHand.value.splice(0, countToRemove)
    
    // Create a dummy meld
    const meldTile = removed[0] || generateTile('meld', 0)
    const meldTiles = Array(action === 'peng' ? 3 : 4).fill(null).map((_, i) => ({
      ...meldTile,
      id: `meld-${Date.now()}-${i}`
    }))

    targetMelds.value.push({
      type: action === 'peng' ? 'triplet' : 'kong',
      tiles: meldTiles,
      isConcealed: false
    })
    
    statusMessage.value = `${position} performed ${action.toUpperCase()}`
  } else {
    statusMessage.value = `${position} cannot ${action} (not enough tiles)`
  }
}

// Init on mount
initGame()

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
  max-width: 1600px; /* Increased max-width */
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
  /* Updated size constraints */
  width: min(95vw, 1400px);
  max-height: 90vh;
  aspect-ratio: 1 / 1; /* Square table */
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
  flex: 0 0 260px; /* Slightly wider for buttons */
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  max-height: 90vh;
}

@media (max-width: 899px) {
  .side-panel {
    flex: 0 0 auto;
    max-height: none;
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
  color: #81c784;
}

.control-group {
  margin-bottom: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 8px;
}

.control-group:last-child {
  border-bottom: none;
}

.button-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 6px;
}

.button-grid.three-col {
  grid-template-columns: 1fr 1fr 1fr;
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
  padding: 6px 10px;
  font-size: 0.8rem;
}

.mahjong-button:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.45);
}

.panel-button {
  display: block;
  width: 100%;
  text-align: center;
  margin-bottom: 6px;
}
</style>