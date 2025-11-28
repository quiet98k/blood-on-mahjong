<!-- pages/login.vue -->
<template>
  <div class="mahjong-page">
    <div class="mahjong-card">
      <h1 class="mahjong-title">Mahjong Online</h1>
      <p class="mahjong-subtitle">血战到底 · 四川麻将</p>

      <p class="mahjong-text">
        Select a role to simulate login:
      </p>

      <div class="login-buttons">
        <button class="mahjong-button admin-btn" @click="handleLogin('Admin', true)">
          Login as Admin (Debug Mode)
        </button>
        
        <div class="player-buttons">
          <button class="mahjong-button" @click="handleLogin('Player 1')">
            Player 1
          </button>
          <button class="mahjong-button" @click="handleLogin('Player 2')">
            Player 2
          </button>
          <button class="mahjong-button" @click="handleLogin('Player 3')">
            Player 3
          </button>
          <button class="mahjong-button" @click="handleLogin('Player 4')">
            Player 4
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const handleLogin = (name, isAdmin = false) => {
  // Store auth token
  const token = useCookie('auth_token', { maxAge: 60 * 60 * 24 * 7 })
  token.value = 'dummy-token-' + name

  // Store user info for simulation
  const userName = useCookie('user_name')
  userName.value = name
  
  const adminCookie = useCookie('is_admin')
  adminCookie.value = isAdmin ? 'true' : 'false'

  // Redirect to main room
  return navigateTo('/')
}
</script>

<style scoped>
.login-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}

.player-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.admin-btn {
  background: linear-gradient(135deg, #8a1f1f, #c54646);
  width: 100%;
}

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
  max-width: 420px;
  width: 90%;
  text-align: center;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.mahjong-title {
  font-size: 2rem;
  margin-bottom: 4px;
  letter-spacing: 0.08em;
}

.mahjong-subtitle {
  font-size: 0.9rem;
  opacity: 0.85;
  margin-bottom: 16px;
}

.mahjong-text {
  font-size: 0.95rem;
  opacity: 0.85;
  margin-bottom: 24px;
}

.mahjong-button {
  padding: 12px 24px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  background: linear-gradient(135deg, #1f8a52, #46c574);
  color: #03100a;
  transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
}

.mahjong-button:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.45);
}

.mahjong-button:active {
  transform: translateY(1px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.4);
}
</style>