import { gameManager } from '../../utils/gameManager';

export default defineEventHandler(async (event) => {
  const games = await gameManager.listGames();
  
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
