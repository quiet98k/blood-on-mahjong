import type { Peer } from 'crossws';

interface GameSubscription {
  gameId: string;
  playerId: string;
  peer: Peer;
}

class WebSocketManager {
  private subscriptions: Map<string, GameSubscription[]> = new Map();

  subscribe(gameId: string, playerId: string, peer: Peer) {
    if (!this.subscriptions.has(gameId)) {
      this.subscriptions.set(gameId, []);
    }

    const subs = this.subscriptions.get(gameId)!;
    
    // Remove existing subscription for this player
    const existingIndex = subs.findIndex(s => s.playerId === playerId);
    if (existingIndex !== -1) {
      subs.splice(existingIndex, 1);
    }

    // Add new subscription
    subs.push({ gameId, playerId, peer });

    console.log(`Player ${playerId} subscribed to game ${gameId}`);
  }

  unsubscribe(peer: Peer) {
    for (const [gameId, subs] of this.subscriptions.entries()) {
      const index = subs.findIndex(s => s.peer === peer);
      if (index !== -1) {
        const sub = subs[index];
        subs.splice(index, 1);
        console.log(`Player ${sub.playerId} unsubscribed from game ${gameId}`);
        
        if (subs.length === 0) {
          this.subscriptions.delete(gameId);
        }
        break;
      }
    }
  }

  broadcast(gameId: string, event: string, data: any) {
    const subs = this.subscriptions.get(gameId);
    if (!subs) return;

    const message = JSON.stringify({ event, data });

    for (const sub of subs) {
      try {
        sub.peer.send(message);
      } catch (error) {
        console.error(`Failed to send to player ${sub.playerId}:`, error);
      }
    }

    console.log(`Broadcast ${event} to ${subs.length} players in game ${gameId}`);
  }

  send(gameId: string, playerId: string, event: string, data: any) {
    const subs = this.subscriptions.get(gameId);
    if (!subs) return;

    const sub = subs.find(s => s.playerId === playerId);
    if (!sub) return;

    const message = JSON.stringify({ event, data });

    try {
      sub.peer.send(message);
      console.log(`Sent ${event} to player ${playerId}`);
    } catch (error) {
      console.error(`Failed to send to player ${playerId}:`, error);
    }
  }
}

export const wsManager = new WebSocketManager();

export default defineWebSocketHandler({
  open(peer) {
    console.log('WebSocket connection opened:', peer.id);
  },

  message(peer, message) {
    try {
      const data = JSON.parse(message.text());
      const { type, gameId, playerId, payload } = data;

      console.log('WebSocket message received:', { type, gameId, playerId });

      switch (type) {
        case 'subscribe':
          if (gameId && playerId) {
            wsManager.subscribe(gameId, playerId, peer);
            peer.send(JSON.stringify({ 
              event: 'subscribed', 
              data: { gameId, playerId } 
            }));
          }
          break;

        case 'ping':
          peer.send(JSON.stringify({ event: 'pong', data: { timestamp: Date.now() } }));
          break;

        default:
          console.warn('Unknown message type:', type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  },

  close(peer) {
    console.log('WebSocket connection closed:', peer.id);
    wsManager.unsubscribe(peer);
  },

  error(peer, error) {
    console.error('WebSocket error:', error);
  }
});
