<!-- pages/gameroom/[roomId].vue -->
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
        <!-- Big responsive table -->
        <div class="table-wrapper">
          <div class="mahjong-table">
            <!-- Center status message -->
            <div class="table-center">
              <p class="status">
                {{ isWinner ? 'You Won! (Test Hu)' : 'Waiting / Testing Layout' }}
              </p>
              <p class="hint">
                Click tiles to select; click again to discard.
                1s after discarding, a new tile is drawn.
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
                :is-winner="false"
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
                :is-winner="false"
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
                :is-winner="false"
              />
            </div>

            <!-- Bottom (self) player -->
            <div class="seat seat-bottom">
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

        <!-- Side test controls -->
        <div class="side-panel">
          <div class="test-controls">
            <h2 class="panel-title">Test Controls</h2>
            <button class="mahjong-button panel-button" @click="testPung">
              Test Pung (碰)
            </button>
            <button class="mahjong-button panel-button" @click="testKong">
              Test Kong (杠)
            </button>
            <button class="mahjong-button panel-button" @click="testHu">
              Test Hu (胡)
            </button>
            <button class="mahjong-button panel-button danger" @click="resetState">
              Reset
            </button>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import PlayerSelfArea from '~/components/PlayerSelfArea.vue'
import PlayerOtherArea from '~/components/PlayerOtherArea.vue'
import {
  createFullTileSet,
  sortTilesById,
  type Tile,
  type Meld
} from '~/utils/mahjongTiles'

const route = useRoute()

const roomId = computed(() => String(route.params.roomId || ''))
const backToLobby = () => navigateTo('/')

// ---- Deal tiles: 13 each for 4 players, rest is draw pile ----
const fullSet = createFullTileSet()
// fullSet is already ordered by id (0..107)

//: self is South, others: North, West, East
const selfHandInitial = sortTilesById(fullSet.slice(0, 13))
const northHandInitial = fullSet.slice(13, 26)
const westHandInitial = fullSet.slice(26, 39)
const eastHandInitial = fullSet.slice(39, 52)
const drawPileInitial = fullSet.slice(52)

// ---- State ----
const playerHand = ref<Tile[]>([...selfHandInitial])
const playerMelds = ref<Meld[]>([])
const playerDiscards = ref<Tile[]>([])
const selectedTileId = ref<number | null>(null)
const isWinner = ref(false)
const drawPile = ref<Tile[]>([...drawPileInitial])

// other players (static for now)
const northHand = ref<Tile[]>([...northHandInitial])
const westHand = ref<Tile[]>([...westHandInitial])
const eastHand = ref<Tile[]>([...eastHandInitial])
const northMelds = ref<Meld[]>([])
const westMelds = ref<Meld[]>([])
const eastMelds = ref<Meld[]>([])
const northDiscards = ref<Tile[]>([])
const westDiscards = ref<Tile[]>([])
const eastDiscards = ref<Tile[]>([])

let drawTimeoutId: ReturnType<typeof setTimeout> | null = null

// ---- Helpers ----
const drawOneTile = () => {
  if (drawPile.value.length === 0) return
  const tile = drawPile.value.shift()
  if (!tile) return
  playerHand.value.push(tile)
  playerHand.value = sortTilesById(playerHand.value)
}

const scheduleDrawAfterDiscard = () => {
  if (drawTimeoutId) {
    clearTimeout(drawTimeoutId)
    drawTimeoutId = null
  }
  drawTimeoutId = setTimeout(() => {
    drawOneTile()
    drawTimeoutId = null
  }, 1000)
}

const discardTile = (tile: Tile) => {
  if (isWinner.value) return

  const idx = playerHand.value.findIndex((t) => t.id === tile.id)
  if (idx === -1) return

  const [removed] = playerHand.value.splice(idx, 1)
  playerDiscards.value.push(removed)
  selectedTileId.value = null

  scheduleDrawAfterDiscard()
}

// ---- Hand interaction ----
const handleTileClick = (tile: Tile) => {
  if (isWinner.value) return

  if (selectedTileId.value !== tile.id) {
    selectedTileId.value = tile.id
  } else {
    // second click => discard
    discardTile(tile)
  }
}

// ---- Test buttons ----
const testPung = () => {
  if (playerHand.value.length < 3) return
  const taken = playerHand.value.splice(playerHand.value.length - 3, 3)
  playerMelds.value.push({ type: 'pung', tiles: taken })
  playerHand.value = sortTilesById(playerHand.value)
}

const testKong = () => {
  if (playerHand.value.length < 4) return
  const taken = playerHand.value.splice(playerHand.value.length - 4, 4)
  playerMelds.value.push({ type: 'kong', tiles: taken })
  playerHand.value = sortTilesById(playerHand.value)
}

const testHu = () => {
  isWinner.value = true
}

const resetState = () => {
  if (drawTimeoutId) {
    clearTimeout(drawTimeoutId)
    drawTimeoutId = null
  }

  playerHand.value = [...selfHandInitial]
  playerMelds.value = []
  playerDiscards.value = []
  selectedTileId.value = null
  isWinner.value = false
  drawPile.value = [...drawPileInitial]

  // other players back to default (static for now)
  northHand.value = [...northHandInitial]
  westHand.value = [...westHandInitial]
  eastHand.value = [...eastHandInitial]
  northMelds.value = []
  westMelds.value = []
  eastMelds.value = []
  northDiscards.value = []
  westDiscards.value = []
  eastDiscards.value = []
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
  flex: 0 0 220px;
}

@media (max-width: 899px) {
  .side-panel {
    flex: 0 0 auto;
  }
}

.test-controls {
  padding: 10px 12px 12px;
  border-radius: 14px;
  background: rgba(5, 14, 10, 0.9);
}

.panel-title {
  font-size: 0.95rem;
  margin-bottom: 8px;
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
</style>