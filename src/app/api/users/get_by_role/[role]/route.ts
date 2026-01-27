import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/services/userService'
import { UserRole } from '@/app/models/user/user'
import { getUserFromToken, requireRole } from '@/lib/authUtils'

const userService = new UserService()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ role: string }> }
) {
  try {
    const user = await getUserFromToken(request)
    requireRole(user.role, UserRole.Admin)

    const { role: roleParam } = await params
    const roleValue = parseInt(roleParam, 10) as UserRole
    const users = await userService.getUserByRole(roleValue)

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: 'Пользователи с этой ролью не найдены' },
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