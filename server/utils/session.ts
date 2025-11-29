import type { H3Event } from 'h3'
import { createError, getCookie, getQuery } from 'h3'
import { AuthService } from '../services/authService'

export async function resolveUserIdFromEvent(event: H3Event): Promise<string> {
  const sessionToken = getCookie(event, 'mahjong_session')

  if (sessionToken) {
    const sessionUserId = await AuthService.validateSession(sessionToken)
    if (sessionUserId) {
      return sessionUserId
    }
  }

  const cookieUserId = getCookie(event, 'user_id')
  if (cookieUserId) {
    return cookieUserId
  }

  const query = getQuery(event)
  if (typeof query.userId === 'string' && query.userId.length > 0) {
    return query.userId
  }

  throw createError({
    statusCode: 401,
    message: 'Not authenticated'
  })
}
