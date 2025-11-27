<!-- pages/login.vue -->
<template>
  <div class="mahjong-page">
    <div class="mahjong-card">
      <h1 class="mahjong-title">Mahjong Online</h1>
      <p class="mahjong-subtitle">血战到底 · 四川麻将</p>

      <p class="mahjong-text">
        For now, click the button below to simulate login. We’ll plug in GitHub OAuth later.
      </p>

      <button class="mahjong-button" @click="handleLogin">
        Login (Test User)
      </button>
    </div>
  </div>
</template>

<script setup>
const handleLogin = () => {
  // Store a dummy auth token in a cookie (Nuxt-idiomatic way)
  const token = useCookie('auth_token', { maxAge: 60 * 60 * 24 * 7 }) // 7 days
  token.value = 'dummy-token'

  // Redirect to main room after login
  return navigateTo('/')
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