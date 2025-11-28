import { UserService } from '../../services/userService'
import { AuthService } from '../../services/authService'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { userId } = body

  if (!userId) {
    throw createError({ statusCode: 400, message: 'userId is required' })
  }

  const user = await UserService.getUserById(userId)

  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const session = await AuthService.createSession(user.userId)

  setCookie(event, 'mahjong_session', session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/'
  })

  return {
    success: true,
    token: session.token,
    user: {
      userId: user.userId,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      isAdmin: user.isAdmin ?? false,
      stats: user.stats
    }
  }
})
