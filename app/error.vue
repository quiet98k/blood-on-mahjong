<!-- error.vue (Nuxt global error page) -->
<template>
  <div class="mahjong-page">
    <div class="room-container">
      <header class="room-header">
        <div class="room-info">
          <h1 class="mahjong-title">
            {{ is404 ? 'Room / Page Not Found' : 'Something went wrong' }}
          </h1>
          <p class="mahjong-subtitle">
            血战到底 · Mahjong Online
          </p>
        </div>

        <button class="mahjong-button small" @click="goHome">
          Back to Waiting Room
        </button>
      </header>

      <main class="room-main">
        <div class="mahjong-table not-found">
          <div class="center-message">
            <p class="status">
              {{ is404 ? 'We can’t find the room / game you are looking for.' : 'Unexpected Error' }}
            </p>
            <p class="hint">
              Please check the URL or return to the waiting room and try again.
            </p>
            <button class="mahjong-button" @click="goHome">
              Go to Waiting Room
            </button>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  error: {
    type: Object,
    default: () => ({ statusCode: 500 }),
  },
})

const is404 = computed(() => props.error?.statusCode === 404)

const goHome = () => {
  return clearError({ redirect: '/' })
}
</script>

<style scoped>
/* reuse same styles as [roomId].vue for consistent look */
.mahjong-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at top, #153b2f, #07130e);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #f5f5f5;
  padding: 24px;
}

.room-container {
  background: rgba(7, 19, 14, 0.92);
  border-radius: 20px;
  padding: 24px 24px 28px;
  max-width: 960px;
  width: 100%;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.room-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mahjong-title {
  font-size: 1.4rem;
  margin-bottom: 2px;
  letter-spacing: 0.04em;
}

.mahjong-subtitle {
  font-size: 0.9rem;
  opacity: 0.85;
}

.room-main {
  display: flex;
  justify-content: center;
  align-items: center;
}

.mahjong-table {
  width: 100%;
  max-width: 720px;
  aspect-ratio: 4 / 3;
  border-radius: 20px;
  margin: 0 auto;
  background: radial-gradient(circle at center, #5c1a1a, #340c0c);
  border: 4px solid #b55a5a;
  box-shadow:
    inset 0 0 0 4px rgba(0, 0, 0, 0.25),
    0 12px 30px rgba(0, 0, 0, 0.8);
  position: relative;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mahjong-button {
  padding: 10px 18px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  background: linear-gradient(135deg, #1f8a52, #46c574);
  color: #03100a;
  transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
  white-space: nowrap;
}

.mahjong-button.small {
  padding: 8px 14px;
  font-size: 0.85rem;
}

.mahjong-button:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.45);
}

.center-message {
  text-align: center;
  max-width: 380px;
}

.status {
  font-size: 1.4rem;
  margin-bottom: 8px;
  font-weight: 600;
}

.hint {
  font-size: 0.95rem;
  opacity: 0.9;
  line-height: 1.5;
  margin-bottom: 18px;
}
</style>