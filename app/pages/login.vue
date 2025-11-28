<!-- pages/login.vue -->
<template>
  <div class="mahjong-page">
    <div class="mahjong-card">
      <h1 class="mahjong-title">Mahjong Online</h1>
      <p class="mahjong-subtitle">血战到底 · 四川麻将</p>

      <p class="mahjong-text">
        Sign in with your account from the database or through Google OAuth:
      </p>

      <div class="login-buttons">
        <div class="section">
          <div class="section-header">
            <span>Google OAuth</span>
          </div>
          <button
            class="mahjong-button oauth-btn"
            type="button"
            @click="handleGoogleOAuth"
            :disabled="isRedirecting"
          >
            <span v-if="!isRedirecting">Continue with Google</span>
            <span v-else>Redirecting…</span>
          </button>
          <p v-if="oauthError" class="status-text error">{{ oauthError }}</p>
        </div>

        <div class="section">
          <div class="section-header">
            <span>Players</span>
            <button class="link-btn" type="button" @click="refreshUsers" :disabled="usersPending">
              Refresh
            </button>
          </div>
          <div v-if="usersPending" class="status-text">Loading users…</div>
          <div v-else-if="usersError" class="status-text error">Failed to load users. Try refreshing.</div>
          <div v-else-if="playerUsers.length === 0" class="status-text">No players found.</div>
          <div class="player-buttons">
            <button
              v-for="user in playerUsers"
              :key="user.userId"
              class="mahjong-button"
              @click="handleLogin(user)"
              :disabled="isSubmitting"
            >
              {{ user.name }}
            </button>
          </div>
        </div>

        <div class="section" v-if="adminUsers.length">
          <div class="section-header">
            <span>Admins</span>
          </div>
          <button
            v-for="user in adminUsers"
            :key="user.userId"
            class="mahjong-button admin-btn"
            @click="handleLogin(user)"
            :disabled="isSubmitting"
          >
            {{ user.name }}
          </button>
        </div>

        <p v-if="loginError" class="status-text error">{{ loginError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
const { data: usersData, pending: usersPending, error: usersError, refresh } = await useFetch('/api/auth/users')

const handleGoogleOAuth = async () => {
  if (isRedirecting.value) return
  oauthError.value = ''
  isRedirecting.value = true

  try {
    const response = await $fetch('/api/auth/google/login')
    if (!response?.authUrl) throw new Error('Missing Google auth URL')
    window.location.href = response.authUrl
  } catch (error) {
    console.error('Failed to start Google OAuth', error)
    oauthError.value = error?.data?.message || error?.message || 'Unable to start Google login.'
    isRedirecting.value = false
  }
}

const playerUsers = computed(() => (usersData.value?.users || []).filter((u) => !u.isAdmin))
const adminUsers = computed(() => (usersData.value?.users || []).filter((u) => u.isAdmin))

const isSubmitting = ref(false)
const loginError = ref('')
const oauthError = ref('')
const isRedirecting = ref(false)

const refreshUsers = () => {
  loginError.value = ''
  refresh()
}

const handleLogin = async (user) => {
  if (isSubmitting.value) return
  loginError.value = ''
  isSubmitting.value = true

  try {
    const response = await $fetch('/api/auth/debug-login', {
      method: 'POST',
      body: { userId: user.userId }
    })

    const token = useCookie('auth_token', { maxAge: 60 * 60 * 24 * 7 })
    token.value = response.token || `session-${response.user.userId}`

    const userName = useCookie('user_name')
    userName.value = response.user.name

    const adminCookie = useCookie('is_admin')
    adminCookie.value = response.user.isAdmin ? 'true' : 'false'

    await navigateTo('/')
  } catch (error) {
    console.error('Login failed', error)
    loginError.value = error?.data?.message || error?.message || 'Failed to login. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.login-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 0.95rem;
  color: #d4f8d3;
}

.link-btn {
  background: none;
  border: none;
  color: #8dd8ff;
  cursor: pointer;
  font-size: 0.85rem;
  text-decoration: underline;
}

.link-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.player-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.status-text {
  font-size: 0.85rem;
  opacity: 0.85;
}

.status-text.error {
  color: #ff9f9f;
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

.oauth-btn {
  background: linear-gradient(135deg, #ffffff, #d4d4d4);
  color: #0d1b12;
}
</style>