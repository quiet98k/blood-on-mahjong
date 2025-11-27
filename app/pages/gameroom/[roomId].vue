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
                name="You"
                :hand="playerHand"
                :melds="playerMelds"
                :discards="playerDiscards"
                :selected-tile-id="selectedTileId"
                :is-winner="isWinner"
                :just-drawn-tile-id="justDrawnTileId"
                :claim-candidate-ids="claimCandidateTileIds"
                :show-claim-options="!!claimType"
                :claim-type="claimType"
                @tileClick="handleTileClick"
                @confirmClaim="confirmClaim"
                @skipClaim="skipClaim"
              />
            </div>
          </div>
        </div>

        <!-- Side test controls -->
        <div class="side-panel">
          <!-- Self test controls -->
          <div class="test-controls">
            <h2 class="panel-title">Self Test Controls</h2>
            <button class="mahjong-button panel-button" @click="startSelfClaim('pung')">
              Test Self Pung (碰)
            </button>
            <button class="mahjong-button panel-button" @click="startSelfClaim('kong')">
              Test Self Kong (杠)
            </button>
            <button class="mahjong-button panel-button" @click="testSelfHu">
              Test Self Hu (胡)
            </button>
            <button class="mahjong-button panel-button danger" @click="resetState">
              Reset All
            </button>
          </div>

          <!-- North controls -->
          <div class="test-controls">
            <h3 class="panel-subtitle">North Test</h3>
            <button class="mahjong-button panel-button" @click="testKongFor('north')">
              North Kong
            </button>
            <button class="mahjong-button panel-button" @click="testPungFor('north')">
              North Pung
            </button>
            <button class="mahjong-button panel-button" @click="testHuFor('north')">
              North Hu
            </button>
            <button class="mahjong-button panel-button" @click="testDiscardFor('north')">
              North Discard
            </button>
          </div>

          <!-- West controls -->
          <div class="test-controls">
            <h3 class="panel-subtitle">West Test</h3>
            <button class="mahjong-button panel-button" @click="testKongFor('west')">
              West Kong
            </button>
            <button class="mahjong-button panel-button" @click="testPungFor('west')">
              West Pung
            </button>
            <button class="mahjong-button panel-button" @click="testHuFor('west')">
              West Hu
            </button>
            <button class="mahjong-button panel-button" @click="testDiscardFor('west')">
              West Discard
            </button>
          </div>

          <!-- East controls -->
          <div class="test-controls">
            <h3 class="panel-subtitle">East Test</h3>
            <button class="mahjong-button panel-button" @click="testKongFor('east')">
              East Kong
            </button>
            <button class="mahjong-button panel-button" @click="testPungFor('east')">
              East Pung
            </button>
            <button class="mahjong-button panel-button" @click="testHuFor('east')">
              East Hu
            </button>
            <button class="mahjong-button panel-button" @click="testDiscardFor('east')">
              East Discard
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
  type Meld,
  type MeldType
} from '~/utils/mahjongTiles'

const route = useRoute()
const roomId = computed(() => String(route.params.roomId || ''))
const backToLobby = () => navigateTo('/')

// ---- Initial deal: 13 each, rest draw pile ----
const fullSet = createFullTileSet()
const selfHandInitial = sortTilesById(fullSet.slice(0, 13))
const northHandInitial = fullSet.slice(13, 26)
const westHandInitial = fullSet.slice(26, 39)
const eastHandInitial = fullSet.slice(39, 52)
const drawPileInitial = fullSet.slice(52)

// ---- State: self ----
const playerHand = ref<Tile[]>([...selfHandInitial])
const playerMelds = ref<Meld[]>([])
const playerDiscards = ref<Tile[]>([])
const selectedTileId = ref<number | null>(null)
const justDrawnTileId = ref<number | null>(null)
const isWinner = ref(false)
const drawPile = ref<Tile[]>([...drawPileInitial])

// claim (self pung/kong on east discard)
const claimType = ref<MeldType | null>(null)
const claimCandidateTileIds = ref<number[]>([])
const claimableDiscardTileId = ref<number | null>(null)
const claimSource = ref<'east' | null>(null)

// ---- State: other players ----
const northHand = ref<Tile[]>([...northHandInitial])
const westHand = ref<Tile[]>([...westHandInitial])
const eastHand = ref<Tile[]>([...eastHandInitial])

const northMelds = ref<Meld[]>([])
const westMelds = ref<Meld[]>([])
const eastMelds = ref<Meld[]>([])

const northDiscards = ref<Tile[]>([])
const westDiscards = ref<Tile[]>([])
const eastDiscards = ref<Tile[]>([])

const northIsWinner = ref(false)
const westIsWinner = ref(false)
const eastIsWinner = ref(false)

let drawTimeoutId: ReturnType<typeof setTimeout> | null = null

// ---- Helpers ----
const drawOneTile = () => {
  if (drawPile.value.length === 0) return
  const tile = drawPile.value.shift()
  if (!tile) return
  playerHand.value.push(tile)
  playerHand.value = sortTilesById(playerHand.value)
  justDrawnTileId.value = tile.id
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
  justDrawnTileId.value = null

  scheduleDrawAfterDiscard()
}

// ---- self hand click ----
const handleTileClick = (tile: Tile) => {
  if (isWinner.value) return

  if (selectedTileId.value !== tile.id) {
    selectedTileId.value = tile.id
    justDrawnTileId.value = null
  } else {
    discardTile(tile)
  }
}

// ---- claim flow (self Pung/Kong on East discard) ----
const ensureEastHasDiscard = () => {
  if (eastDiscards.value.length > 0) return
  if (eastHand.value.length === 0) return
  const tile = eastHand.value.pop()
  if (!tile) return
  eastDiscards.value.push(tile)
}

const startSelfClaim = (type: MeldType) => {
  if (type !== 'pung' && type !== 'kong') return
  ensureEastHasDiscard()
  const lastDiscard = eastDiscards.value[eastDiscards.value.length - 1]
  if (!lastDiscard) return

  claimSource.value = 'east'
  claimType.value = type
  claimableDiscardTileId.value = lastDiscard.id

  const need = type === 'pung' ? 2 : 3
  const candidates = playerHand.value.slice(-need).map((t) => t.id)
  claimCandidateTileIds.value = candidates
  selectedTileId.value = null
  justDrawnTileId.value = null
}

const clearClaimState = () => {
  claimType.value = null
  claimCandidateTileIds.value = []
  claimableDiscardTileId.value = null
  claimSource.value = null
}

const confirmClaim = () => {
  if (!claimType.value || !claimSource.value || claimableDiscardTileId.value == null) {
    clearClaimState()
    return
  }

  // take discard from east (only source implemented now)
  const sourceDiscards = claimSource.value === 'east' ? eastDiscards.value : null
  if (!sourceDiscards) {
    clearClaimState()
    return
  }

  const discardIdx = sourceDiscards.findIndex((t) => t.id === claimableDiscardTileId.value)
  if (discardIdx === -1) {
    clearClaimState()
    return
  }
  const [claimedTile] = sourceDiscards.splice(discardIdx, 1)

  // take tiles from self hand
  const takenFromHand: Tile[] = []
  claimCandidateTileIds.value.forEach((id) => {
    const idx = playerHand.value.findIndex((t) => t.id === id)
    if (idx !== -1) {
      const [removed] = playerHand.value.splice(idx, 1)
      takenFromHand.push(removed)
    }
  })

  // combine into meld (taken + claimed discard)
  const meldTiles = [...takenFromHand, claimedTile]
  playerMelds.value.push({
    type: claimType.value,
    tiles: meldTiles
  })

  playerHand.value = sortTilesById(playerHand.value)
  clearClaimState()
}

const skipClaim = () => {
  clearClaimState()
}

// ---- self Test Hu ----
const testSelfHu = () => {
  isWinner.value = true
}

// ---- other players tests ----
type Seat = 'north' | 'west' | 'east'

const getSeatState = (seat: Seat) => {
  if (seat === 'north') {
    return {
      hand: northHand,
      melds: northMelds,
      discards: northDiscards,
      isWinner: northIsWinner
    }
  }
  if (seat === 'west') {
    return {
      hand: westHand,
      melds: westMelds,
      discards: westDiscards,
      isWinner: westIsWinner
    }
  }
  return {
    hand: eastHand,
    melds: eastMelds,
    discards: eastDiscards,
    isWinner: eastIsWinner
  }
}

const testKongFor = (seat: Seat) => {
  const s = getSeatState(seat)
  if (s.hand.value.length < 4) return
  const taken = s.hand.value.splice(s.hand.value.length - 4, 4)
  s.melds.value.push({ type: 'kong', tiles: taken })
}

const testPungFor = (seat: Seat) => {
  const s = getSeatState(seat)
  if (s.hand.value.length < 3) return
  const taken = s.hand.value.splice(s.hand.value.length - 3, 3)
  s.melds.value.push({ type: 'pung', tiles: taken })
}

const testHuFor = (seat: Seat) => {
  const s = getSeatState(seat)
  s.isWinner.value = true
}

const testDiscardFor = (seat: Seat) => {
  const s = getSeatState(seat)
  if (s.hand.value.length === 0) return
  const tile = s.hand.value.pop()
  if (!tile) return
  s.discards.value.push(tile)
}

// ---- reset ----
const resetState = () => {
  if (drawTimeoutId) {
    clearTimeout(drawTimeoutId)
    drawTimeoutId = null
  }

  playerHand.value = [...selfHandInitial]
  playerMelds.value = []
  playerDiscards.value = []
  selectedTileId.value = null
  justDrawnTileId.value = null
  isWinner.value = false
  drawPile.value = [...drawPileInitial]

  northHand.value = [...northHandInitial]
  westHand.value = [...westHandInitial]
  eastHand.value = [...eastHandInitial]

  northMelds.value = []
  westMelds.value = []
  eastMelds.value = []

  northDiscards.value = []
  westDiscards.value = []
  eastDiscards.value = []

  northIsWinner.value = false
  westIsWinner.value = false
  eastIsWinner.value = false

  clearClaimState()
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