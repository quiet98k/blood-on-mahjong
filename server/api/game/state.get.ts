import { gameManager } from '../../utils/gameManager';

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const { gameId, playerId } = query;

  if (!gameId || !playerId) {
    throw createError({
      statusCode: 400,
      message: 'Game ID and player ID are required'
    });
  }

  const game = gameManager.getGame(gameId as string);
  
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

  const availableActions = gameManager.getAvailableActions(gameId as string, playerId as string);

  return {
    success: true,
    data: {
      game: {
        ...game,
        // Hide other players' concealed tiles
        players: game.players.map(p => ({
          ...p,
          hand: {
            ...p.hand,
            concealedTiles: p.id === playerId ? p.hand.concealedTiles : []
          }
        }))
      },
      playerView: player.hand,
      availableActions
    }
  };
});
