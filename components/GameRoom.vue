<script setup lang="ts">
// Example Vue component demonstrating Socket.IO integration for multiplayer Mahjong

const {
  connect,
  disconnect,
  authenticate,
  joinRoom,
  leaveRoom,
  isConnected,
  roomId,
  roomUsers,
  chatMessages,
  sendGameAction,
  sendChatMessage,
  updateGameState,
  setPlayerReady,
  onGameAction,
  onGameStateChange,
  onPlayerReady
} = useSocket()

// Game state
const gameId = ref('')
const currentUser = ref({
  userId: 'user-123',
  userName: 'Player 1'
})
const gameState = ref<any>(null)
const myHand = ref<any>(null)
const selectedTile = ref<string | null>(null)
const isReady = ref(false)
const chatInput = ref('')

// Initialize Socket.IO on component mount
onMounted(async () => {
  // 1. Connect to Socket.IO server
  connect()
  
  // 2. Authenticate
  authenticate(currentUser.value.userId, currentUser.value.userName)
  
  // 3. Create or join game via REST API
  try {
    const response = await $fetch('/api/game/create', {
      method: 'POST',
      body: {
        playerName: currentUser.value.userName
      }
    })
    
    gameId.value = response.gameId
    
    // 4. Join Socket.IO room (use gameId as roomId)
    joinRoom(gameId.value, currentUser.value.userId, currentUser.value.userName)
    
    // 5. Set up event listeners
    setupGameListeners()
    
  } catch (error) {
    console.error('Failed to create game:', error)
  }
})

// Clean up on unmount
onUnmounted(() => {
  leaveRoom()
  disconnect()
})

// Set up Socket.IO event listeners
function setupGameListeners() {
  // Listen for other players' actions
  onGameAction((data) => {
    console.log(`${data.playerName} performed action:`, data)
    
    // Handle different action types
    if (data.type === 'discard') {
      console.log(`${data.playerName} discarded tile ${data.data.tileId}`)
      // Update UI to show discarded tile
    } else if (data.type === 'peng') {
      console.log(`${data.playerName} declared Peng!`)
      // Show peng animation
    } else if (data.type === 'hu') {
      console.log(`${data.playerName} won!`)
      // Show win animation
    }
  })
  
  // Listen for game state updates (from any player's action)
  onGameStateChange((data) => {
    console.log('Game state updated:', data)
    gameState.value = data
    
    // Check if it's my turn
    const myPlayerIndex = data.players.findIndex(
      (p: any) => p.id === currentUser.value.userId
    )
    
    if (data.currentPlayerIndex === myPlayerIndex) {
      console.log("It's your turn!")
      // Enable action buttons
    }
  })
  
  // Listen for player ready status
  onPlayerReady((data) => {
    console.log(`${data.userName} is ${data.isReady ? 'ready' : 'not ready'}`)
  })
}

// Game actions
async function drawTile() {
  try {
    // Call REST API to draw tile
    const response = await $fetch('/api/game/action', {
      method: 'POST',
      body: {
        gameId: gameId.value,
        playerId: currentUser.value.userId,
        action: 'draw'
      }
    })
    
    // Update local hand
    myHand.value = response.data.playerView
    
    // Game state is automatically broadcast via Socket.IO
    // All clients will receive 'game:state-changed' event
    
  } catch (error: any) {
    console.error('Failed to draw tile:', error.data?.message || error)
  }
}

async function discardTile(tileId: string) {
  try {
    await $fetch('/api/game/action', {
      method: 'POST',
      body: {
        gameId: gameId.value,
        playerId: currentUser.value.userId,
        action: 'discard',
        tileId
      }
    })
    
    selectedTile.value = null
    
  } catch (error: any) {
    console.error('Failed to discard tile:', error.data?.message || error)
  }
}

async function performPeng(tileIds: string[]) {
  try {
    await $fetch('/api/game/action', {
      method: 'POST',
      body: {
        gameId: gameId.value,
        playerId: currentUser.value.userId,
        action: 'peng',
        tileIds
      }
    })
    
  } catch (error: any) {
    console.error('Failed to perform peng:', error.data?.message || error)
  }
}

async function declareWin() {
  try {
    await $fetch('/api/game/action', {
      method: 'POST',
      body: {
        gameId: gameId.value,
        playerId: currentUser.value.userId,
        action: 'hu'
      }
    })
    
  } catch (error: any) {
    console.error('Failed to declare win:', error.data?.message || error)
  }
}

// Ready status
function toggleReady() {
  isReady.value = !isReady.value
  setPlayerReady(isReady.value)
}

// Chat
function sendChat() {
  if (chatInput.value.trim()) {
    sendChatMessage(chatInput.value)
    chatInput.value = ''
  }
}
</script>

<template>
  <div class="game-container">
    <!-- Connection Status -->
    <div class="status-bar">
      <span :class="{ connected: isConnected, disconnected: !isConnected }">
        {{ isConnected ? '✅ Connected' : '❌ Disconnected' }}
      </span>
      <span>Game ID: {{ gameId || 'N/A' }}</span>
    </div>

    <!-- Room Info -->
    <div class="room-info">
      <h3>Players ({{ roomUsers.length }}/4)</h3>
      <ul>
        <li v-for="user in roomUsers" :key="user.socketId">
          {{ user.userName }}
          <span v-if="user.userId === currentUser.userId">(You)</span>
        </li>
      </ul>
      <button @click="toggleReady" :class="{ ready: isReady }">
        {{ isReady ? 'Ready ✓' : 'Not Ready' }}
      </button>
    </div>

    <!-- Game Board -->
    <div v-if="gameState" class="game-board">
      <h3>Current Phase: {{ gameState.phase }}</h3>
      <p>Round: {{ gameState.roundNumber }}</p>
      
      <!-- Other players -->
      <div class="other-players">
        <div 
          v-for="player in gameState.players.filter((p: any) => p.id !== currentUser.userId)" 
          :key="player.id"
          class="player-info"
        >
          <strong>{{ player.name }}</strong>
          <span>Hand: {{ player.handSize }} tiles</span>
          <span>Discarded: {{ player.discardedTiles.length }}</span>
        </div>
      </div>

      <!-- My hand -->
      <div v-if="myHand" class="my-hand">
        <h4>Your Hand</h4>
        <div class="tiles">
          <button 
            v-for="tile in myHand.concealedTiles" 
            :key="tile.id"
            @click="selectedTile = tile.id"
            :class="{ selected: selectedTile === tile.id }"
            class="tile"
          >
            {{ tile.suit }}{{ tile.value }}
          </button>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="actions">
        <button @click="drawTile">Draw Tile</button>
        <button 
          @click="discardTile(selectedTile!)" 
          :disabled="!selectedTile"
        >
          Discard Selected
        </button>
        <button @click="performPeng([])">Peng</button>
        <button @click="declareWin">Hu (Win)</button>
      </div>
    </div>

    <!-- Chat -->
    <div class="chat-section">
      <h4>Chat</h4>
      <div class="chat-messages">
        <div v-for="msg in chatMessages" :key="msg.timestamp" class="message">
          <strong>{{ msg.userName }}:</strong> {{ msg.message }}
        </div>
      </div>
      <div class="chat-input">
        <input 
          v-model="chatInput" 
          @keyup.enter="sendChat" 
          placeholder="Type a message..."
        />
        <button @click="sendChat">Send</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 5px;
  margin-bottom: 20px;
}

.connected {
  color: green;
  font-weight: bold;
}

.disconnected {
  color: red;
  font-weight: bold;
}

.room-info {
  background-color: #fff;
  padding: 15px;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.room-info ul {
  list-style: none;
  padding: 0;
}

.room-info li {
  padding: 5px;
  margin: 3px 0;
  background-color: #e8f5e9;
  border-radius: 3px;
}

button {
  padding: 8px 16px;
  margin: 5px;
  border: none;
  border-radius: 4px;
  background-color: #4CAF50;
  color: white;
  cursor: pointer;
}

button:hover {
  background-color: #45a049;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

button.ready {
  background-color: #2196F3;
}

.game-board {
  background-color: #fff;
  padding: 20px;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.other-players {
  display: flex;
  gap: 15px;
  margin: 20px 0;
}

.player-info {
  flex: 1;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 5px;
  border: 2px solid #ddd;
}

.my-hand {
  margin: 20px 0;
  padding: 15px;
  background-color: #fff3cd;
  border-radius: 5px;
}

.tiles {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.tile {
  padding: 10px 15px;
  background-color: #fff;
  border: 2px solid #333;
  border-radius: 5px;
  font-weight: bold;
  min-width: 60px;
}

.tile.selected {
  background-color: #ffc107;
  border-color: #ff9800;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.chat-section {
  background-color: #fff;
  padding: 15px;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.chat-messages {
  height: 200px;
  overflow-y: auto;
  border: 1px solid #ddd;
  padding: 10px;
  margin: 10px 0;
  background-color: #fafafa;
}

.message {
  margin: 5px 0;
  padding: 8px;
  background-color: white;
  border-radius: 4px;
}

.chat-input {
  display: flex;
  gap: 10px;
}

.chat-input input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>
