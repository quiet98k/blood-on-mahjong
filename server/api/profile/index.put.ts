import { UserService } from '../../services/userService'
import { resolveUserIdFromEvent } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const userId = await resolveUserIdFromEvent(event)
  const body = await readBody(event)

  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const address = typeof body?.address === 'string' ? body.address.trim() : undefined
  const dateOfBirth = typeof body?.dateOfBirth === 'string' ? body.dateOfBirth.trim() : undefined
  const gender = typeof body?.gender === 'string' ? body.gender.trim() : undefined

  if (!name) {
    throw createError({
      statusCode: 400,
      message: 'Name is required'
    })
  }

  if (dateOfBirth && Number.isNaN(Date.parse(dateOfBirth))) {
    throw createError({
      statusCode: 400,
      message: 'Invalid date of birth'
    })
  }

  const updatedUser = await UserService.updateProfile(userId, {
    name,
    address,
    dateOfBirth,
    gender
  })

  if (!updatedUser) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  return {
    success: true,
    data: {
      userId: updatedUser.userId,
      name: updatedUser.name,
      email: updatedUser.email,
      address: updatedUser.address ?? '',
      dateOfBirth: updatedUser.dateOfBirth ?? '',
      gender: updatedUser.gender ?? ''
    }
  }
})
