import { gameManager } from '../../utils/gameManager';

export default defineEventHandler((event) => {
  const games = gameManager.listGames();
  
  return {
    success: true,
    data: {
      games: games.map(g => ({
        gameId: g.gameId,
        phase: g.phase,
        playerCount: g.players.length,
        roundNumber: g.roundNumber,
        createdAt: g.createdAt
      }))
    }
  };
});
