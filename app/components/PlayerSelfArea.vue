<!-- components/PlayerSelfArea.vue -->
<template>
  <div class="player-area" :class="{ 'player-area--winner': isWinner }">
    <div class="player-header">
      <div class="player-name">
        {{ name }}
        <span v-if="isWinner" class="winner-tag">胡</span>
      </div>
      <div class="player-status">
        <span v-if="isWinner">Game Over (You Won)</span>
        <span v-else>Playing</span>
      </div>
    </div>

    <!-- Melds (Pung / Kong) -->
    <div class="player-melds" v-if="melds.length">
      <div
        v-for="(meld, i) in melds"
        :key="i"
        class="meld"
        :class="`meld--${meld.type}`"
      >
        <MahjongTile
          v-for="tile in meld.tiles"
          :key="tile.id"
          :tile="tile"
          :small="true"
          :dimmed="isWinner"
        />
      </div>
    </div>

    <!-- Hand -->
    <div class="player-hand">
      <MahjongTile
        v-for="tile in hand"
        :key="tile.id"
        :tile="tile"
        :selected="selectedTileId === tile.id"
        :dimmed="isWinner"
        @click="onTileClick(tile)"
      />
    </div>

    <!-- Discards -->
    <div class="player-discards">
      <div class="discards-label">Discards</div>
      <div class="discards-row">
        <MahjongTile
          v-for="(tile, i) in discards"
          :key="tile.id"
          :tile="tile"
          :small="true"
          :dimmed="isWinner && i !== discards.length - 1"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MahjongTile from '~/components/MahjongTile.vue'
import type { Tile, Meld } from '~/utils/mahjongTiles'

const props = defineProps<{
  name: string
  hand: Tile[]
  melds: Meld[]
  discards: Tile[]
  selectedTileId: number | null
  isWinner: boolean
}>()

const emit = defineEmits<{
  (e: 'tileClick', tile: Tile): void
}>()

const onTileClick = (tile: Tile) => {
  emit('tileClick', tile)
}
</script>

<style scoped>
.player-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px 16px;
  border-radius: 14px;
  background: rgba(5, 14, 10, 0.8);
}

.player-area--winner {
  background: rgba(3, 8, 6, 0.8);
}

.player-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-size: 0.9rem;
}

.player-name {
  font-weight: 600;
  letter-spacing: 0.04em;
}

.player-status {
  opacity: 0.8;
  font-size: 0.85rem;
}

.winner-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  padding: 1px 6px;
  border-radius: 999px;
  background: #f44336;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
}

.player-melds {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 56px;
}

.meld {
  display: inline-flex;
  padding: 4px 6px;
  border-radius: 8px;
  background: rgba(17, 43, 33, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.meld--kong {
  box-shadow: 0 0 10px rgba(255, 214, 0, 0.4);
}

.player-hand {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  min-height: 72px;
  padding: 4px;
  border-radius: 10px;
  background: rgba(9, 30, 22, 0.9);
}

.player-discards {
  margin-top: 4px;
}

.discards-label {
  font-size: 0.8rem;
  opacity: 0.75;
  margin-bottom: 2px;
}

.discards-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>