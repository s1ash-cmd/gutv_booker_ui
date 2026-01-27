import { UserRole } from '@/app/models/user/user'
import { getUserFromToken, requireRole } from '@/lib/authUtils'
import { UserService } from '@/services/userService'
import { NextRequest, NextResponse } from 'next/server'

const userService = new UserService()

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request)
    requireRole(user.role, UserRole.Admin)

    const { id: idParam } = await params
    const id = parseInt(idParam, 10)

    if (id <= 0 || id === user.id) {
      return NextResponse.json(
        { error: 'Некорректный ID пользователя' },
        { status: 400 }
      )
    }

    const success = await userService.grantRonin(id)

    if (!success) {
      return NextResponse.json(
        { error: `Пользователь с ID ${id} не найден` },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: `Пользователь с ID ${id} получил разрешение на Ronin` })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}