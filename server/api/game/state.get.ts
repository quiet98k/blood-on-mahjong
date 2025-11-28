import { gameManager } from '../../utils/gameManager';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const { gameId, playerId } = query;

  if (!gameId || !playerId) {
    throw createError({
      statusCode: 400,
      message: 'Game ID and player ID are required'
    });
  }

  const game = await gameManager.getGame(gameId as string);
  
  if (!game) {
    throw createError({
      statusCode: 404,
      message: 'Game not found'
    });
  }

  const player = game.players.find(p => p.id === playerId);
  
  if (!player) {
    throw createError({
      statusCode: 404,
      message: 'Player not found'
    });
  }

  const availableActions = await gameManager.getAvailableActions(gameId as string, playerId as string);

  // Ensure isDealer is correctly passed
  const isDealer = player.isDealer;

  return {
    success: true,
    data: {
      game: {
        ...game,
        // For debugging/testing: Show all tiles so we can control other players
        // In production, we should uncomment the hiding logic below
        /*
        players: game.players.map(p => ({
          ...p,
          hand: {
            ...p.hand,
            concealedTiles: p.id === playerId ? p.hand.concealedTiles : []
          },
          isDealer: p.isDealer
        }))
        */
      },
      playerView: player.hand,
      availableActions
    }
  };
});
