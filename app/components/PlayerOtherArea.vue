<!-- components/PlayerOtherArea.vue -->
<template>
  <div class="player-other" :class="[`player-other--${position}`, { 'player-other--winner': isWinner }]">
    <div class="player-other-header">
      <span class="player-other-name">
        {{ name }}
        <span v-if="isWinner" class="winner-tag">胡</span>
      </span>
    </div>

    <div class="player-other-melds" v-if="melds.length">
      <div
        v-for="(meld, i) in melds"
        :key="i"
        class="other-meld"
        :class="`other-meld--${meld.type}`"
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

    <div
      class="player-other-hand"
      :class="{
        'player-other-hand--vertical': position === 'left' || position === 'right'
      }"
    >
      <MahjongTile
        v-for="tile in hand"
        :key="tile.id"
        :tile="tile"
        :small="true"
        :back="true"
        :dimmed="isWinner"
      />
    </div>

    <div class="player-other-discards" v-if="discards.length">
      <div class="discards-label">Discards</div>
      <div class="discards-row">
        <MahjongTile
          v-for="tile in discards"
          :key="tile.id"
          :tile="tile"
          :small="true"
          :dimmed="isWinner && tile.id !== discards[discards.length - 1]?.id"
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
  position: 'top' | 'left' | 'right'
  hand: Tile[]
  melds: Meld[]
  discards: Tile[]
  isWinner: boolean
}>()
</script>

<style scoped>
.player-other {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
  color: #f5f5f5;
}

.player-other-header {
  display: flex;
  justify-content: center;
  opacity: 0.9;
}

.player-other-name {
  font-weight: 600;
  letter-spacing: 0.04em;
}

.winner-tag {
  margin-left: 4px;
  padding: 0 4px;
  border-radius: 999px;
  background: #f44336;
  color: #fff;
  font-size: 0.7rem;
}

.player-other-melds {
  display: flex;
  justify-content: center;
  gap: 4px;
}

.other-meld {
  display: inline-flex;
  padding: 2px 4px;
  border-radius: 8px;
  background: rgba(17, 43, 33, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.other-meld--kong {
  box-shadow: 0 0 8px rgba(255, 214, 0, 0.4);
}

.player-other-hand {
  display: flex;
  justify-content: center;
}

.player-other-hand--vertical {
  flex-direction: column;
  align-items: center;
}

.player-other-discards {
  margin-top: 2px;
}

.discards-label {
  text-align: center;
  opacity: 0.7;
  font-size: 0.7rem;
  margin-bottom: 2px;
}

.discards-row {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 2px;
}
</style>