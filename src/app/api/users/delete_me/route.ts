import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/services/userService'
import { getUserFromToken } from '@/lib/authUtils'

const userService = new UserService()

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    const success = await userService.deleteUser(user.id)

    if (!success) {
      return NextResponse.json(
        { error: `Пользователь с ID ${user.id} не найден` },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: `Пользователь с ID ${user.id} успешно удалён` })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}