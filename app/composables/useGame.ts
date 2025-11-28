import { ref, computed } from 'vue'
import type { GameState, Player, ActionType, Tile } from '~/types/game'
import { io, type Socket } from 'socket.io-client'

export const useGame = () => {
  const gameState = ref<GameState | null>(null)
  const playerView = ref<any>(null) // Player's hand view
  const availableActions = ref<ActionType[]>([])
  const socket = ref<Socket | null>(null)
  const isConnected = ref(false)
  const error = ref<string | null>(null)

  const currentPlayer = computed(() => {
    if (!gameState.value || !playerId.value) return null
    return gameState.value.players.find(p => p.id === playerId.value)
  })

  const playerId = ref<string | null>(null)
  const gameId = ref<string | null>(null)

  const connect = async (gId: string, pId: string) => {
    gameId.value = gId
    playerId.value = pId
    const userName = useCookie('user_name').value || 'Player'

    try {
      // Fetch initial state (optional, but good for immediate render)
      const { data } = await useFetch('/api/game/state', {
        query: { gameId: gId, playerId: pId }
      })

      if (data.value?.success) {
        updateState(data.value.data)
      }

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
      socket.value.on('room:user-joined', (data) => {
        console.log('User joined:', data)
        refreshState()
      })

      socket.value.on('room:user-left', (data) => {
        console.log('User left:', data)
        refreshState()
      })

      socket.value.on('room:error', (data) => {
        console.error('Room error:', data)
        error.value = data.message
      })

      // Game Events
      socket.value.on('game:state-changed', (data) => {
        console.log('Game state update:', data)
        // Ideally data contains the full state or we fetch it
        refreshState()
      })

      socket.value.on('game:action-received', (data) => {
        console.log('Action received:', data)
        // Refresh state to see the result of the action
        refreshState()
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

    const { data } = await useFetch('/api/game/state', {
      query: { gameId: gameId.value, playerId: playerId.value }
    })

    if (data.value?.success) {
      updateState(data.value.data)
    }
  }

  const updateState = (data: any) => {
    gameState.value = data.game
    playerView.value = data.playerView
    availableActions.value = data.availableActions
  }

  const executeAction = async (action: ActionType, tileId?: string) => {
    if (!gameId.value || !playerId.value) return

    // Optimistic update or just send to server
    // We can use socket to send action for faster response
    if (socket.value && isConnected.value) {
      socket.value.emit('game:action', {
        gameId: gameId.value,
        playerId: playerId.value,
        type: action,
        tileId
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
          tileId
        }
      })

      if (apiError.value) {
        console.error('Action failed:', apiError.value)
        return
      }

      if (data.value?.success) {
        updateState(data.value.data)
      }
    } catch (e) {
      console.error('Error executing action:', e)
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
    refreshState
  }
}
