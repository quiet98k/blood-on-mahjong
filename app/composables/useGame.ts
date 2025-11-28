import { ref, computed } from 'vue'
import type { GameState, Player, ActionType, Tile } from '~/types/game'
import { GamePhase } from '~/types/game'
import { io, type Socket } from 'socket.io-client'

export const useGame = () => {
  const gameState = ref<GameState | null>(null)
  const playerView = ref<any>(null) // Player's hand view
  const availableActions = ref<ActionType[]>([])
  const socket = ref<Socket | null>(null)
  const isConnected = ref(false)
  const error = ref<string | null>(null)
  const isActionPending = ref(false)
  const roomDismissedReason = ref<string | null>(null)

  const currentPlayer = computed(() => {
    if (!gameState.value || !playerId.value) return null
    return gameState.value.players.find(p => p.id === playerId.value)
  })

  const playerId = ref<string | null>(null)
  const gameId = ref<string | null>(null)

  const fetchGameState = async (gId: string, pId: string) => {
    try {
      const response = await $fetch('/api/game/state', {
        query: { gameId: gId, playerId: pId },
        cache: 'no-cache'
      })

      if ((response as any)?.success) {
        updateState((response as any).data)
      }
    } catch (e) {
      console.error('Failed to fetch game state:', e)
    }
  }

  const connect = async (gId: string, pId: string) => {
    gameId.value = gId
    playerId.value = pId
    roomDismissedReason.value = null
    const userName = useCookie('user_name').value || 'Player'

    try {
      // Fetch initial state (optional, but good for immediate render)
      await fetchGameState(gId, pId)

      // Connect Socket.IO
      // Use default transports (polling first) to avoid websocket connection errors in some envs
      socket.value = io({
        withCredentials: true
      })

      socket.value.on('connect', () => {
        console.log('Socket.IO connected:', socket.value?.id)
        isConnected.value = true
        error.value = null

        // Authenticate
        socket.value?.emit('auth:login', {
          userId: pId,
          userName: userName
        })

        // Join Room
        socket.value?.emit('room:join', {
          roomId: gId,
          userId: pId,
          userName: userName
        })
      })

      socket.value.on('connect_error', (err) => {
        console.error('Socket connection error:', err)
        error.value = 'Connection failed: ' + err.message
        isConnected.value = false
      })

      socket.value.on('disconnect', () => {
        console.log('Socket disconnected')
        isConnected.value = false
      })

      // Room Events
      socket.value.on('room:user-joined', async (data) => {
        console.log('User joined:', data)
        await refreshState()
      })

      socket.value.on('room:user-left', async (data) => {
        console.log('User left:', data)
        await refreshState()
      })

      socket.value.on('room:error', (data) => {
        console.error('Room error:', data)
        error.value = data.message
      })

      socket.value.on('room:dismissed', async (payload) => {
        console.warn('Room dismissed:', payload)
        roomDismissedReason.value = payload?.reason || 'owner_left'
        error.value = payload?.message || 'Room dismissed by host'
        await refreshState()
      })

      // Game Events
      socket.value.on('game:state-changed', async (data) => {
        console.log('Game state update:', data)
        await refreshState()
      })

      socket.value.on('game:action-received', async (data) => {
        console.log('Action received:', data)
        await refreshState()
      })

    } catch (e: any) {
      error.value = e.message || 'Failed to connect'
    }
  }

  const disconnect = () => {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
    }
    isConnected.value = false
  }

  const refreshState = async () => {
    if (!gameId.value || !playerId.value) return

    await fetchGameState(gameId.value, playerId.value)
  }

  const updateState = (data: any) => {
    gameState.value = data.game
    playerView.value = data.playerView
    availableActions.value = data.availableActions
  }

  const executeAction = async (action: ActionType, tileId?: string, tileIds?: string[]) => {
    if (!gameId.value || !playerId.value) return
    if (gameState.value?.phase === GamePhase.ENDED) return
    if (isActionPending.value) return
    isActionPending.value = true

    // Optimistic update or just send to server
    // We can use socket to send action for faster response
    if (socket.value && isConnected.value) {
      socket.value.emit('game:action', {
        gameId: gameId.value,
        playerId: playerId.value,
        type: action,
        tileId,
        tileIds
      })
    }

    // Also call API as backup or primary (depending on backend logic)
    // Since socket.ts seems to just broadcast, we might still need the API 
    // to actually update the game state in GameManager.
    // However, the user asked to use socket.ts functions.
    // If socket.ts only broadcasts, it doesn't update state.
    // So we MUST call the API to update state, and let the API (or socket) broadcast the update.
    
    try {
      const { data, error: apiError } = await useFetch('/api/game/action', {
        method: 'POST',
        body: {
          gameId: gameId.value,
          playerId: playerId.value,
          type: action,
          tileId,
          tileIds
        }
      })

      if (apiError.value) {
        console.error('Action failed:', apiError.value)
        return
      }

      if (data.value?.success) {
        updateState(data.value.data)
        await refreshState()
      }
    } catch (e) {
      console.error('Error executing action:', e)
    } finally {
      isActionPending.value = false
    }
  }

  const startGame = async () => {
    if (!gameId.value || !playerId.value) return
    
    try {
      const { data } = await useFetch('/api/game/start', {
        method: 'POST',
        body: { gameId: gameId.value, playerId: playerId.value }
      })
      
      if (data.value?.success) {
        await refreshState()
        // Notify others via socket
        socket.value?.emit('game:state-update', { gameId: gameId.value })
      }
    } catch (e) {
      console.error('Failed to start game:', e)
    }
  }

  return {
    gameState,
    currentPlayer,
    availableActions,
    isConnected,
    error,
    connect,
    disconnect,
    executeAction,
    startGame,
    refreshState,
    isActionPending,
    roomDismissedReason
  }
}
