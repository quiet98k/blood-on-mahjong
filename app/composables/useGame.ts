import { ref, computed } from 'vue'
import type { GameState, Player, ActionType, Tile } from '~/types/game'

export const useGame = () => {
  const gameState = ref<GameState | null>(null)
  const playerView = ref<any>(null) // Player's hand view
  const availableActions = ref<ActionType[]>([])
  const ws = ref<WebSocket | null>(null)
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

    try {
      // Fetch initial state
      const { data } = await useFetch('/api/game/state', {
        query: { gameId: gId, playerId: pId }
      })

      if (data.value?.success) {
        updateState(data.value.data)
      }

      // Connect WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/_ws`
      
      ws.value = new WebSocket(wsUrl)

      ws.value.onopen = () => {
        console.log('WebSocket connected')
        isConnected.value = true
        // Subscribe to game updates
        ws.value?.send(JSON.stringify({
          type: 'subscribe',
          gameId: gId,
          playerId: pId
        }))
      }

      ws.value.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          if (message.event === 'gameStateUpdate') {
            // Refresh state when update received
            // Ideally the update contains the full state or diff, 
            // but for now we might need to re-fetch or use the data provided
            // The backend broadcastGameState sends partial data, so we might need to fetch full state
            // or update the backend to send full state.
            // Let's fetch full state for consistency for now.
            refreshState()
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message', e)
        }
      }

      ws.value.onclose = () => {
        console.log('WebSocket disconnected')
        isConnected.value = false
      }

      ws.value.onerror = (e) => {
        console.error('WebSocket error', e)
        error.value = 'WebSocket connection error'
      }

    } catch (e: any) {
      error.value = e.message || 'Failed to connect'
    }
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
    
    // Update the player's hand in the game state with the private view
    if (gameState.value && playerId.value) {
      const playerIndex = gameState.value.players.findIndex(p => p.id === playerId.value)
      if (playerIndex !== -1 && playerView.value) {
        gameState.value.players[playerIndex].hand = playerView.value
      }
    }
  }

  const executeAction = async (action: ActionType, tileId?: string, tileIds?: string[]) => {
    if (!gameId.value || !playerId.value) return

    try {
      const { data, error: apiError } = await useFetch('/api/game/action', {
        method: 'POST',
        body: {
          gameId: gameId.value,
          playerId: playerId.value,
          action,
          tileId,
          tileIds
        }
      })

      if (apiError.value) {
        throw new Error(apiError.value.message)
      }

      if (data.value?.success) {
        updateState(data.value.data)
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to execute action'
      console.error(e)
    }
  }

  const startGame = async () => {
    if (!gameId.value || !playerId.value) return

    try {
      const { error: apiError } = await useFetch('/api/game/start', {
        method: 'POST',
        body: {
          gameId: gameId.value,
          playerId: playerId.value
        }
      })

      if (apiError.value) {
        throw new Error(apiError.value.message)
      }
      // State update will come via WebSocket
    } catch (e: any) {
      error.value = e.message || 'Failed to start game'
      console.error(e)
    }
  }

  const disconnect = () => {
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
    isConnected.value = false
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
    refreshState,
    startGame
  }
}
