<!-- components/PlayerOtherArea.vue -->
<template>
  <div
    class="player-other"
    :class="[`player-other--${position}`, { 'player-other--winner': isWinner }]"
  >
    <div class="player-other-header">
      <span class="player-other-name">
        {{ name }}
        <span v-if="isWinner" class="winner-tag">胡</span>
      </span>
    </div>

    <!-- Melds (Pung / Kong) -->
    <div
      class="player-other-melds"
      :class="{
        'player-other-melds--vertical': position === 'left' || position === 'right'
      }"
      v-if="melds.length"
    >
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

    <!-- SIDE PLAYERS (West/East): hand + vertical discards side-by-side -->
    <div
      v-if="position === 'left' || position === 'right'"
      class="side-layout"
      :class="`side-layout--${position}`"
    >
      <!-- Hand -->
      <div class="player-other-hand player-other-hand--vertical">
        <MahjongTile
          v-for="tile in hand"
          :key="tile.id"
          :tile="tile"
          :small="true"
          :back="true"
          :dimmed="isWinner"
        />
      </div>

      <!-- Discards toward table center, stacked vertically -->
      <div
        v-if="discards.length"
        class="player-other-discards player-other-discards--vertical"
      >
        <div class="discards-label">Discards</div>
        <div class="discards-row discards-row--vertical">
          <MahjongTile
            v-for="tile in discards"
            :key="tile.id"
            :tile="tile"
            :small="true"
            :dimmed="isWinner && tile.id !== discards[discards.length - 1]?.id"
            :claim-highlight="claimableDiscardTileId === tile.id"
          />
        </div>
      </div>
    </div>

    <!-- TOP PLAYER: horizontal hand, horizontal discards below -->
    <template v-else>
      <div class="player-other-hand">
        <MahjongTile
          v-for="tile in hand"
          :key="tile.id"
          :tile="tile"
          :small="true"
          :back="true"
          :dimmed="isWinner"
        />
      </div>

      <div v-if="discards.length" class="player-other-discards">
        <div class="discards-label">Discards</div>
        <div class="discards-row">
          <MahjongTile
            v-for="tile in discards"
            :key="tile.id"
            :tile="tile"
            :small="true"
            :dimmed="isWinner && tile.id !== discards[discards.length - 1]?.id"
            :claim-highlight="claimableDiscardTileId === tile.id"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import MahjongTile from '~/components/MahjongTile.vue'
import type { Tile, Meld } from '~/utils/mahjongTiles'

defineProps<{
  name: string
  position: 'top' | 'left' | 'right'
  hand: Tile[]
  melds: Meld[]
  discards: Tile[]
  isWinner: boolean
  claimableDiscardTileId?: number | null
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

/* Melds */

.player-other-melds {
  display: flex;
  justify-content: center;
  gap: 4px;
}

/* For West/East: stack meld groups vertically */
.player-other-melds--vertical {
  flex-direction: column;
  align-items: center;
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

/* Side layout for West/East (hand + discards) */

.side-layout {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
}

/* Left seat: [hand][discards] so discards are toward center (right side) */
.side-layout--left {
  flex-direction: row;
}

/* Right seat: [discards][hand] so discards are toward center (left side) */
.side-layout--right {
  flex-direction: row-reverse;
}

/* Hand */

.player-other-hand {
  display: flex;
  justify-content: center;
}

.player-other-hand--vertical {
  flex-direction: column;
  align-items: center;
}

/* Discards */

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

/* Vertical discards for side players */
.player-other-discards--vertical {
  margin-top: 0;
}

.discards-row--vertical {
  flex-direction: column;
  align-items: center;
  flex-wrap: nowrap;
}
</style>