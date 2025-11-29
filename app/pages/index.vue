<!-- app/pages/index.vue -->
<template>
  <div class="mahjong-page">
    <div class="mahjong-card">
      <h1 class="mahjong-title">Waiting Room</h1>
      <p class="mahjong-subtitle">
        Welcome back, {{ userName || 'Player' }}.
        <span v-if="isAdminUser" class="admin-badge">(Admin Mode)</span>
      </p>

      <div class="mahjong-actions">
        <button
          class="mahjong-button primary"
          :disabled="isCreatingGame"
          @click="startNewGame"
        >
          New Game
        </button>

        <button
          v-if="isAdminUser"
          class="mahjong-button secondary"
          @click="goToAdminSandbox"
        >
          Admin Sandbox
        </button>

        <button class="mahjong-button secondary" @click="onJoinGame">
          Join Game
        </button>

        <button class="mahjong-button secondary" @click="onMatchHistory">
          Match History
        </button>

        <button class="mahjong-button secondary" @click="openProfileModal">
          User Profile
        </button>

        <button class="mahjong-button danger" @click="logout">
          Log Out
        </button>
      </div>

      <p class="mahjong-hint">
        New Game will temporarily send you to room <strong>#66666</strong>.
      </p>
    </div>

    <!-- Proper Nuxt UI v4 modal usage -->
    <UModal
      v-model:open="isProfileModalOpen"
      title="Player Profile"
      description="Share your details so friends know who is at the table."
      :close="{
        color: 'neutral',
        variant: 'ghost',
        class: 'profile-close-btn'
      }"
    >
      <template #body>
        <div class="profile-modal-shell">
          <div v-if="profileError">
            <UAlert color="red" variant="soft" icon="i-heroicons-exclamation-triangle">
              {{ profileError?.data?.message || profileError?.message || 'Unable to load your profile.' }}
            </UAlert>
            <div class="profile-actions">
              <UButton color="emerald" variant="solid" @click="refreshProfile">
                Retry
              </UButton>
            </div>
          </div>
          <div v-else>
            <div v-if="profilePending && !profileHasLoaded" class="profile-skeletons">
              <USkeleton
                class="skeleton-row"
                v-for="i in 3"
                :key="i"
                height="48px"
                :ui="{ rounded: 'rounded-lg' }"
              />
            </div>

            <UForm
              v-else
              :state="profileForm"
              class="profile-form"
              @submit.prevent="saveProfile"
            >
              <div class="profile-grid">
                <UFormField label="Full Name" name="name" required>
                  <UInput
                    v-model="profileForm.name"
                    :disabled="!isEditingProfile || profileSaving"
                    placeholder="Enter your name"
                  />
                </UFormField>

                <UFormField label="Date of Birth" name="dateOfBirth">
                  <UInput
                    v-model="profileForm.dateOfBirth"
                    type="date"
                    :disabled="!isEditingProfile || profileSaving"
                  />
                </UFormField>

                <UFormField label="Gender" name="gender">
                  <UInput
                    v-model="profileForm.gender"
                    :disabled="!isEditingProfile || profileSaving"
                    placeholder="Enter gender"
                  />
                </UFormField>

                <UFormField label="Address" name="address" class="profile-full-row">
                  <UTextarea
                    v-model="profileForm.address"
                    :disabled="!isEditingProfile || profileSaving"
                    placeholder="City, Country"
                    :rows="3"
                  />
                </UFormField>
              </div>

              <UAlert
                v-if="profileStatus.message"
                :color="profileStatus.type === 'error' ? 'red' : 'emerald'"
                :variant="profileStatus.type === 'error' ? 'soft' : 'subtle'"
                icon="i-heroicons-information-circle"
              >
                {{ profileStatus.message }}
              </UAlert>

              <div class="profile-actions">
                <UButton
                  v-if="!isEditingProfile"
                  color="emerald"
                  icon="i-heroicons-pencil-square"
                  @click="startEditingProfile"
                  :disabled="profilePending || !profileHasLoaded"
                >
                  Edit Profile
                </UButton>

                <template v-else>
                  <UButton
                    type="submit"
                    color="emerald"
                    icon="i-heroicons-check"
                    :loading="profileSaving"
                  >
                    Save
                  </UButton>
                  <UButton
                    type="button"
                    color="gray"
                    variant="ghost"
                    icon="i-heroicons-x-mark"
                    @click="cancelEditingProfile"
                    :disabled="profileSaving"
                  >
                    Cancel
                  </UButton>
                </template>
              </div>
            </UForm>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup>
const userName = useCookie('user_name')
const isAdmin = useCookie('is_admin')
const router = useRouter()

const isAdminUser = computed(() => isAdmin.value === 'true' || isAdmin.value === true)
const isCreatingGame = ref(false)

const { data: profileResponse, pending: profilePending, error: profileError, refresh: refreshProfile } =
  await useFetch('/api/profile', {
    method: 'GET',
    cache: 'no-cache'
  })

const profileForm = reactive({
  name: '',
  address: '',
  dateOfBirth: '',
  gender: ''
})

const isEditingProfile = ref(false)
const profileSaving = ref(false)
const profileStatus = ref({ type: '', message: '' })
const isProfileModalOpen = ref(false)

const profileHasLoaded = computed(() => Boolean(profileResponse.value?.data))

const hydrateProfileForm = (payload) => {
  if (!payload) return
  profileForm.name = payload.name || ''
  profileForm.address = payload.address || ''
  profileForm.dateOfBirth = payload.dateOfBirth || ''
  profileForm.gender = payload.gender || ''
}

watch(
  () => profileResponse.value?.data,
  (data) => {
    if (data) {
      hydrateProfileForm(data)
    }
  },
  { immediate: true }
)

const setProfileStatus = (type, message) => {
  profileStatus.value = { type, message }
}

const ensureProfileLoaded = async () => {
  const isLoaded = profileHasLoaded.value
  const isLoading = profilePending.value

  if (!isLoaded && !isLoading) {
    await refreshProfile()
  }
}

const openProfileModal = async () => {
  setProfileStatus('', '')
  await ensureProfileLoaded()
  isProfileModalOpen.value = true
}

const startEditingProfile = () => {
  if (!profileHasLoaded.value) return
  isEditingProfile.value = true
  setProfileStatus('', '')
}

const cancelEditingProfile = () => {
  hydrateProfileForm(profileResponse.value?.data)
  isEditingProfile.value = false
  setProfileStatus('', '')
}

watch(isProfileModalOpen, (isOpen, wasOpen) => {
  if (!isOpen && wasOpen) {
    // when modal closes, reset form + editing state
    cancelEditingProfile()
  }
})

const saveProfile = async () => {
  if (!isEditingProfile.value || profileSaving.value) return

  if (!profileForm.name.trim()) {
    setProfileStatus('error', 'Name is required.')
    return
  }

  profileSaving.value = true
  setProfileStatus('', '')

  try {
    const response = await $fetch('/api/profile', {
      method: 'PUT',
      body: {
        name: profileForm.name.trim(),
        address: profileForm.address,
        dateOfBirth: profileForm.dateOfBirth,
        gender: profileForm.gender
      },
      headers: { 'Cache-Control': 'no-cache' }
    })

    if (response?.data) {
      profileResponse.value = response
    } else {
      await refreshProfile()
    }

    setProfileStatus('success', 'Profile updated successfully.')
    isEditingProfile.value = false
  } catch (error) {
    setProfileStatus('error', error?.data?.message || error?.message || 'Failed to update profile.')
  } finally {
    profileSaving.value = false
  }
}

const startNewGame = async () => {
  if (isCreatingGame.value) return
  isCreatingGame.value = true
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
  } finally {
    isCreatingGame.value = false
  }
}

const onJoinGame = () => navigateTo('/join-game')
const onMatchHistory = () => router.push('/history')
const goToAdminSandbox = () => navigateTo('/admin-test')

const logout = () => {
  const token = useCookie('auth_token')
  token.value = null
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
  width: 90%;
  max-width: 520px;
  text-align: center;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin: 0 auto;
}

.admin-badge {
  color: #ff6b6b;
  font-size: 0.8em;
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

.profile-modal-shell {
  width: min(560px, 100%);
  margin: 0 auto;
  padding: 0 8px 8px;
  box-sizing: border-box;
}

.profile-close-btn {
  border-radius: 999px;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile-full-row {
  width: 100%;
}

.profile-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 12px;
}

.profile-skeletons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-row {
  width: 100%;
}

@media (max-width: 600px) {
  .mahjong-card {
    padding: 24px 20px;
  }

  .mahjong-title {
    font-size: 1.6rem;
  }

  .mahjong-button {
    font-size: 0.85rem;
    padding: 10px 18px;
  }
}

@media (max-width: 400px) {
  .mahjong-card {
    padding: 20px 16px;
  }

  .mahjong-button {
    font-size: 0.8rem;
    padding: 8px 14px;
  }
}
</style>