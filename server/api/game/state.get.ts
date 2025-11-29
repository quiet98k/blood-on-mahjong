import { gameManager } from '../../utils/gameManager';
import { TileSuit } from '../../types/game';
import { isAdminFromEvent } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const { gameId, playerId } = query;

  if (!gameId || !playerId) {
    throw createError({
      statusCode: 400,
      message: 'Game ID and player ID are required'
    });
  }

  const normalizedGameId = gameId as string;
  const normalizedPlayerId = playerId as string;

  const game = await gameManager.getGame(normalizedGameId);
  
  if (!game) {
    throw createError({
      statusCode: 404,
      message: 'Game not found'
    });
  }

  const player = game.players.find(p => p.id === normalizedPlayerId);
  
  if (!player) {
    throw createError({
      statusCode: 404,
      message: 'Player not found'
    });
  }

  const availableActions = await gameManager.getAvailableActions(normalizedGameId, normalizedPlayerId);

  const isAdminUser = await isAdminFromEvent(event);

  const maskedPlayers = game.players.map((p) => {
    const shouldReveal = isAdminUser || p.id === normalizedPlayerId;

    return {
      ...p,
      hand: {
        ...p.hand,
        concealedTiles: shouldReveal
          ? p.hand.concealedTiles
          : p.hand.concealedTiles.map((_, index) => ({
              id: `hidden-${p.id}-${index}`,
              suit: TileSuit.WAN,
              value: 0
            }))
      }
    };
  });

  // Ensure isDealer is correctly passed
  const isDealer = player.isDealer;

  return {
    success: true,
    data: {
      game: {
        ...game,
        players: maskedPlayers
      },
      playerView: player.hand,
      availableActions
    }
  };
});
