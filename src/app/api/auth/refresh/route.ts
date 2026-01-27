import { RefreshRequest } from '@/app/models/auth/auth'
import { authService } from '@/lib/auth'
import { UserService } from '@/services/userService'
import { NextRequest, NextResponse } from 'next/server'

const userService = new UserService()

export async function POST(request: NextRequest) {
  try {
    const body: RefreshRequest = await request.json()

    const user = await userService.getByRefreshToken(body.refreshToken)

    if (!user) {
      return NextResponse.json(
        { error: 'Недействительный refresh токен' },
        { status: 401 }
      )
    }

    const newAccessToken = await authService.generateAccessToken(user)
    const newRefreshToken = authService.generateRefreshToken()

    await userService.saveRefreshToken(user.id, newRefreshToken)

    return NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    })
  } catch (error) {
    console.error('Refresh error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}