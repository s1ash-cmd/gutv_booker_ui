import { UserRole } from '@/app/models/user/user'
import { getUserFromToken, requireRole } from '@/lib/authUtils'
import { UserService } from '@/services/userService'
import { NextRequest, NextResponse } from 'next/server'

const userService = new UserService()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ namePart: string }> }
) {
  try {
    const user = await getUserFromToken(request)
    requireRole(user.role, UserRole.Admin)

    const { namePart } = await params
    const users = await userService.getUsersByName(namePart)

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: `Пользователи с именем, содержащим '${namePart}', не найдены` },
        { status: 404 }
      )
    }

    return NextResponse.json(users)
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