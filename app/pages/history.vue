<template>
  <div class="history-page">
    <div class="history-shell">
      <header class="history-header">
        <button class="ghost-button" @click="goBack">← Back</button>
        <div>
          <h1>Match History</h1>
          <p class="subtitle">Recent games across all rooms</p>
        </div>
        <button class="ghost-button" @click="loadHistory" :disabled="isLoading">
          Refresh
        </button>
      </header>

      <section class="filter-bar">
        <label class="toggle">
          <input type="checkbox" v-model="showOnlyMine" :disabled="!userIdCookie" />
          <span>Show only my matches</span>
        </label>
        <span v-if="!userIdCookie" class="filter-hint">Log in to filter by your games.</span>
      </section>

      <section class="history-content">
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
        <p v-else-if="isLoading" class="loading">Loading match history…</p>
        <p v-else-if="!histories.length" class="empty">No matches recorded yet.</p>

        <div v-else class="history-list">
          <article v-for="match in histories" :key="match.gameId" class="history-card">
            <div class="card-header">
              <div>
                <p class="room-label">Room {{ match.roomId }}</p>
                <h2>{{ formatDate(match.completedAt) }}</h2>
              </div>
              <div class="meta">
                <span class="badge">{{ match.winnersCount }} Winner{{ match.winnersCount === 1 ? '' : 's' }}</span>
                <span class="badge subtle">Round {{ match.roundNumber }}</span>
              </div>
            </div>

            <ul class="player-list">
              <li
                v-for="player in match.results"
                :key="player.playerId"
                :class="['player-row', { winner: player.status === 'won', me: player.playerId === userIdCookie }]"
              >
                <div>
                  <p class="player-name">{{ player.name }}</p>
                  <p class="player-meta">
                    {{ player.status === 'won' ? 'Winner' : 'Participant' }} · Seat {{ player.position + 1 }}
                  </p>
                </div>
                <div class="player-score" :class="scoreClass(player.finalScore ?? match.finalScores?.[player.playerId] ?? 0)">
                  {{ formatScore(player.finalScore ?? match.finalScores?.[player.playerId] ?? 0) }}
                </div>
              </li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

interface MatchHistoryResult {
  playerId: string
  name: string
  position: number
  status: 'waiting' | 'playing' | 'won' | 'lost'
  winOrder: number | null
  winRound: number | null
  winTimestamp: number | null
  wonFan: number
  windScore: number
  rainScore: number
  finalScore: number
}

interface MatchHistoryItem {
  gameId: string
  roomId: string
  endReason: string | null
  winnersCount: number
  roundNumber: number
  completedAt: string | Date
  durationMs: number
  finalScores?: Record<string, number>
  results: MatchHistoryResult[]
}

const histories = ref<MatchHistoryItem[]>([])
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const showOnlyMine = ref(false)
const userIdCookie = useCookie<string | null>('user_id')

const queryUserId = computed(() => {
  if (!showOnlyMine.value) return undefined
  return userIdCookie.value || undefined
})

const loadHistory = async () => {
  isLoading.value = true
  errorMessage.value = null
  try {
    const response = await $fetch<{ success: boolean; data: MatchHistoryItem[] }>('/api/history/list', {
      query: {
        limit: 20,
        ...(queryUserId.value ? { userId: queryUserId.value } : {})
      },
      cache: 'no-cache'
    })

    if (response?.success) {
      histories.value = response.data || []
    } else {
      throw new Error('Unable to fetch match history')
    }
  } catch (err: any) {
    errorMessage.value = err?.message || 'Failed to load match history'
  } finally {
    isLoading.value = false
  }
}

watch(queryUserId, () => {
  loadHistory()
})

onMounted(() => {
  loadHistory()
})

const goBack = () => navigateTo('/')

const formatDate = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleString()
}

const formatScore = (value: number) => {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value}`
}

const scoreClass = (value: number) => {
  if (value > 0) return 'score-positive'
  if (value < 0) return 'score-negative'
  return 'score-neutral'
}
</script>

<style scoped>
.history-page {
  min-height: 100vh;
  background: radial-gradient(circle at top, #153b2f, #07130e);
  display: flex;
  justify-content: center;
  padding: 24px;
}

.history-shell {
  width: min(960px, 100%);
  background: rgba(7, 19, 14, 0.95);
  border-radius: 18px;
  padding: 24px 28px;
  color: #f5f5f5;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.5);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.history-header h1 {
  margin: 0;
  font-size: 1.4rem;
}

.subtitle {
  margin: 0;
  opacity: 0.75;
  font-size: 0.9rem;
}

.ghost-button {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  padding: 8px 16px;
  color: inherit;
  cursor: pointer;
  font-weight: 600;
}

.ghost-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 16px;
  font-size: 0.9rem;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-hint {
  opacity: 0.6;
}

.history-content {
  min-height: 200px;
}

.error,
.loading,
.empty {
  text-align: center;
  opacity: 0.8;
  margin: 40px 0;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-card {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 16px;
  padding: 16px 18px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.room-label {
  font-size: 0.8rem;
  opacity: 0.8;
  margin: 0;
}

.card-header h2 {
  margin: 2px 0 0;
  font-size: 1.1rem;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
}

.badge {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

.badge.subtle {
  opacity: 0.8;
}

.player-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.player-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 10px 12px;
}

.player-row.winner {
  border: 1px solid rgba(255, 226, 122, 0.4);
}

.player-row.me {
  box-shadow: 0 0 0 1px rgba(95, 255, 176, 0.35);
}

.player-name {
  margin: 0;
  font-weight: 600;
}

.player-meta {
  margin: 2px 0 0;
  font-size: 0.8rem;
  opacity: 0.75;
}

.player-score {
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 999px;
}

.score-positive {
  color: #5fffb0;
  background: rgba(95, 255, 176, 0.1);
}

.score-negative {
  color: #ff9d9d;
  background: rgba(255, 157, 157, 0.1);
}

.score-neutral {
  color: #f5f5f5;
  background: rgba(255, 255, 255, 0.08);
}

@media (max-width: 640px) {
  .history-shell {
    padding: 20px;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .meta {
    flex-direction: row;
  }
}
</style>
