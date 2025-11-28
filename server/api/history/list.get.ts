import { MatchHistoryService } from '../../services/matchHistoryService';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const userId = typeof query.userId === 'string' ? query.userId : undefined;
  const limitParam = typeof query.limit === 'string' ? parseInt(query.limit, 10) : undefined;
  const limit = Number.isFinite(limitParam) && limitParam! > 0 ? limitParam : 20;

  const histories = await MatchHistoryService.listMatches({ userId, limit });

  return {
    success: true,
    data: histories
  };
});
