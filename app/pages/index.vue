<!-- pages/index.vue -->
<template>
  <div class="mahjong-page">
    <div class="mahjong-card">
      <h1 class="mahjong-title">Waiting Room</h1>
      <p class="mahjong-subtitle">
        Welcome back, {{ userName || 'Player' }}.
        <span v-if="isAdmin === 'true' || isAdmin === true" style="color: #ff6b6b; font-size: 0.8em;">(Admin Mode)</span>
      </p>

      <div class="mahjong-actions">
        <button class="mahjong-button primary" @click="startNewGame">
          New Game
        </button>

        <button class="mahjong-button secondary" @click="onJoinGame">
          Join Game
        </button>

        <button class="mahjong-button secondary" @click="onMatchHistory">
          Match History
        </button>

        <!-- 👇 Added logout button -->
        <button class="mahjong-button danger" @click="logout">
          Log Out
        </button>
      </div>

      <p class="mahjong-hint">
        New Game will temporarily send you to room <strong>#66666</strong>.
      </p>

    </div>
  </div>
</template>

<script setup>
const userName = useCookie('user_name')
const isAdmin = useCookie('is_admin')

const startNewGame = async () => {
  console.log('Checking Admin Status:', isAdmin.value, typeof isAdmin.value)
  
  // Check for string 'true' or boolean true
  if (isAdmin.value === 'true' || isAdmin.value === true) {
    console.log('Redirecting to Admin Test Page...')
    return navigateTo('/admin-test')
  }

  try {
    const response = await $fetch('/api/game/create', {
      method: 'POST',
      body: { playerName: userName.value || 'Player 1' },
      headers: { 'Cache-Control': 'no-cache' }
    })

    if (response && response.success) {
      const { gameId, playerId } = response.data || {}
      return navigateTo(`/gameroom/${gameId}?playerId=${playerId}`)
    }
    console.error('Unexpected response creating game:', response)
  } catch (e) {
    console.error('Error creating game:', e)
  }
}

const onJoinGame = () => navigateTo('/join-game')

const onMatchHistory = () => navigateTo('/history')

// 🔥 Logout logic: wipe auth token + redirect
const logout = () => {
  const token = useCookie('auth_token')
  token.value = null // remove cookie
  return navigateTo('/login')
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
}

.mahjong-card {
  background: rgba(7, 19, 14, 0.9);
  border-radius: 18px;
  padding: 32px 40px;
  max-width: 520px;
  width: 90%;
  text-align: center;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.mahjong-title {
  font-size: 2rem;
  margin-bottom: 4px;
  letter-spacing: 0.06em;
}

.mahjong-subtitle {
  font-size: 0.95rem;
  opacity: 0.9;
  margin-bottom: 24px;
}

.mahjong-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
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

.mahjong-button.primary {
  background: linear-gradient(135deg, #1f8a52, #46c574);
  color: #03100a;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
}

.mahjong-button.primary:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.45);
}

.mahjong-button.secondary {
  background: rgba(22, 51, 40, 0.95);
  color: #e0f2e9;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.mahjong-button.secondary:hover {
  transform: translateY(-1px);
  filter: brightness(1.04);
}

/* 🔥 Added danger/red style for logout */
.mahjong-button.danger {
  background: rgba(123, 26, 26, 0.9);
  color: #ffdada;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.mahjong-button.danger:hover {
  background: rgba(160, 38, 38, 1);
  transform: translateY(-1px);
}

.mahjong-hint {
  font-size: 0.85rem;
  opacity: 0.85;
}

</style>