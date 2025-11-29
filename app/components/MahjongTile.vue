<template>
  <div
    class="tile"
    :class="[
      `tile--${tile.suit}`,
      {
        'tile--selected': selected,
        'tile--just-drawn': justDrawn,
        'tile--claim': claimHighlight,
        'tile--dimmed': dimmed,
        'tile--small': small
      }
    ]"
    @click="onClick"
  >
    <template v-if="!back">
      <div class="tile-rank">{{ tile.value }}</div>
      <div class="tile-suit">
        <span v-if="tile.suit === 'wan'">萬</span>
        <span v-else-if="tile.suit === 'dots'">筒</span>
        <span v-else>條</span>
      </div>
    </template>
    <template v-else>
      <div class="tile-back-pattern" />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Tile } from '~/types/game'

const props = defineProps<{
  tile: Tile
  selected?: boolean
  dimmed?: boolean
  small?: boolean
  back?: boolean
  justDrawn?: boolean
  claimHighlight?: boolean
}>()

const emit = defineEmits<{
  (e: 'click', tile: Tile): void
}>()

const onClick = () => {
  emit('click', props.tile)
}
</script>

<style scoped>
.tile {
  width: 40px;
  height: 60px;
  border-radius: 6px;
  background: #fdfaf3;
  border: 1px solid #e1d4b8;
  box-shadow: 0 3px 7px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 1px;
  cursor: pointer;
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease,
    background 0.12s ease,
    opacity 0.12s ease,
    border-color 0.12s ease;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  user-select: none;
}

.tile--small {
  width: 32px;
  height: 48px;
  font-size: 0.8rem;
}

.tile-rank {
  font-size: 1rem;
  font-weight: 700;
}

.tile-suit {
  font-size: 0.85rem;
}

.tile--wan .tile-rank,
.tile--wan .tile-suit {
  color: #d32f2f;
}

.tile--dots .tile-rank,
.tile--dots .tile-suit {
  color: #1565c0;
}


.tile--tiao .tile-rank,
.tile--tiao .tile-suit {
  color: #2e7d32;
}

/* user-selected tile: raised */
.tile--selected {
  transform: translateY(-6px);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.45);
}

/* newly drawn tile: yellow glow */
.tile--just-drawn {
  border-color: #ffc107;
  box-shadow: 0 0 0 3px rgba(255, 193, 7, 0.7);
}

/* pung/kong candidate or claimable discard: orange glow */
.tile--claim {
  border-color: #ff9800;
  box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.7);
}

.tile--dimmed {
  opacity: 0.4;
  cursor: default;
}

.tile-back-pattern {
  width: 70%;
  height: 70%;
  border-radius: 4px;
  background: repeating-linear-gradient(
    45deg,
    #00897b,
    #00897b 4px,
    #004d40 4px,
    #004d40 8px
  );
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.2);
}

@media (max-width: 1300px) {
  .tile {
    width: 25px;
    height: 30px;
  }

  .tile--small {
    width: 25px;
    height: 30px;
  }

  .tile-rank {
    font-size: 0.7rem;
    line-height: 1
  }

  .tile-suit {
    font-size: 0.7rem;
    line-height: 1
  }
}

@media (max-width: 900px) {
  .tile {
    width: 20px;
    height: 25px;
  }

  .tile--small {
    width: 20px;
    height: 25px;
  }

  .tile-rank {
    font-size: 0.5rem;
  }

  .tile-suit {
    font-size: 0.5rem;
  }
}

</style>