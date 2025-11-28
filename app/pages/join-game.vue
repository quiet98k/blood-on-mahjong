<template>
  <div class="mahjong-page">
    <div class="mahjong-card join-card">
      <header class="join-header">
        <div>
          <h1 class="mahjong-title">Join a Game</h1>
          <p class="mahjong-subtitle">Pick an open table below or enter a room ID manually.</p>
        </div>
        <button class="mahjong-button secondary" @click="backToLobby">Back</button>
      </header>

      <section class="manual-join">
        <label for="manual-id">Enter Game ID</label>
        <div class="manual-controls">
          <input
            id="manual-id"
            v-model="manualGameId"
            type="text"
            placeholder="e.g. 1234-5678"
          />
          <button
            class="mahjong-button primary"
            :disabled="isJoining || !manualGameId.trim()"
            @click="joinById"
          >
            {{ isJoining ? 'Joining…' : 'Join' }}
          </button>
        </div>
        <p v-if="joinError" class="available-error">{{ joinError }}</p>
      </section>

      <section class="mahjong-available">
        <div class="available-header">
          <h2>Open Tables</h2>
          <button class="mahjong-button small" :disabled="isWaitingLoading" @click="fetchWaitingGames">
            {{ isWaitingLoading ? 'Loading…' : 'Refresh' }}
          </button>
        </div>

        <p v-if="waitingGamesError" class="available-error">{{ waitingGamesError }}</p>
        <p v-else-if="!isWaitingLoading && waitingGames.length === 0" class="available-empty">
          No waiting games right now. Start one from the lobby!
        </p>

        <ul v-else class="available-list">
          <li v-for="game in waitingGames" :key="game.gameId" class="available-item">
            <div class="available-details">
              <span class="available-id">{{ game.gameId }}</span>
              <span class="available-meta">{{ game.playerCount }}/4 players · Dealer: {{ game.dealerName || 'TBD' }}</span>
            </div>
            <button class="mahjong-button secondary join" @click="joinExistingGame(game.gameId)">
              Join
            </button>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

const userName = useCookie('user_name')
const waitingGames = ref<any[]>([])
const waitingGamesError = ref<string | null>(null)
const isWaitingLoading = ref(false)
const manualGameId = ref('')
const joinError = ref<string | null>(null)
const isJoining = ref(false)

const backToLobby = () => navigateTo('/')

const fetchWaitingGames = async () => {
  isWaitingLoading.value = true
  waitingGamesError.value = null
  try {
    const { data, error } = await useFetch('/api/game/waiting', {
      method: 'GET',
      cache: 'no-cache'
    })

    if (error.value) {
      waitingGamesError.value = error.value.message || 'Failed to load games'
      waitingGames.value = []
      return
    }

    waitingGames.value = data.value?.data?.games || []
  } catch (err) {
    waitingGamesError.value = err instanceof Error ? err.message : 'Failed to load games'
    waitingGames.value = []
  } finally {
    isWaitingLoading.value = false
  }
}

const joinExistingGame = (gameId: string) => {
  manualGameId.value = gameId
  joinById()
}

const joinById = () => {
  if (!manualGameId.value.trim()) {
    joinError.value = 'Please enter a game ID'
    return
  }
  joinGame(manualGameId.value.trim())
}

const joinGame = async (gameId: string) => {
  joinError.value = null
  isJoining.value = true
  try {
    const { data, error } = await useFetch('/api/game/join', {
      method: 'POST',
      body: { gameId, playerName: userName.value || 'Player ' + Math.floor(Math.random() * 1000) }
    })

    if (error.value) {
      console.error('Failed to join game:', error.value)
      joinError.value = error.value.message || 'Failed to join game'
      return
    }

    if (data.value?.success) {
      const { playerId } = data.value.data
      await navigateTo(`/gameroom/${gameId}?playerId=${playerId}`)
    } else {
      joinError.value = 'Unable to join game. Please try again.'
    }
  } catch (err) {
    console.error('Error joining game:', err)
    joinError.value = err instanceof Error ? err.message : 'Failed to join game'
  } finally {
    isJoining.value = false
  }
}

onMounted(() => {
  fetchWaitingGames()
})
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
}

.mahjong-card.join-card {
  background: rgba(7, 19, 14, 0.94);
  border-radius: 20px;
  padding: 32px 36px;
  max-width: 640px;
  width: 90%;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.join-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.manual-join label {
  display: block;
  font-size: 0.9rem;
  margin-bottom: 6px;
  opacity: 0.9;
}

.manual-controls {
  display: flex;
  gap: 12px;
}

.manual-controls input {
  flex: 1;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(18, 43, 33, 0.9);
  color: #f5f5f5;
  padding: 12px 16px;
  font-size: 1rem;
}

.mahjong-available {
  text-align: left;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 16px;
}

.available-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.available-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.available-item {
  background: rgba(18, 43, 33, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.available-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.available-id {
  font-weight: 600;
  letter-spacing: 0.02em;
}

.available-meta {
  font-size: 0.85rem;
  opacity: 0.85;
}

.available-empty,
.available-error {
  font-size: 0.9rem;
  opacity: 0.85;
}

.mahjong-button {
  padding: 12px 24px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
}

.mahjong-button.small {
  padding: 6px 16px;
  font-size: 0.85rem;
}

.mahjong-button.join {
  min-width: 80px;
}

.mahjong-button.primary {
  background: linear-gradient(135deg, #1f8a52, #46c574);
  color: #03100a;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
}

.mahjong-button.secondary {
  background: rgba(22, 51, 40, 0.95);
  color: #e0f2e9;
  border: 1px solid rgba(255, 255, 255, 0.06);
}
</style>
