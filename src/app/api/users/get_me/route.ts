import { getUserFromToken } from '@/lib/authUtils'
import { UserService } from '@/services/userService'
import { NextRequest, NextResponse } from 'next/server'

const userService = new UserService()

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)

    const foundUser = await userService.getUserById(user.id)

    if (!foundUser) {
      return NextResponse.json(
        { error: `Пользователь с ID ${user.id} не найден` },
        { status: 404 }
      )
    }

    return NextResponse.json(foundUser)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}