import { UserService } from '../../services/userService'
import { resolveUserIdFromEvent } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const userId = await resolveUserIdFromEvent(event)

  const user = await UserService.getUserById(userId)
  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  return {
    success: true,
    data: {
      userId: user.userId,
      name: user.name,
      email: user.email,
      address: user.address ?? '',
      dateOfBirth: user.dateOfBirth ?? '',
      gender: user.gender ?? ''
    }
  }
})

