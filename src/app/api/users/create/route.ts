import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/services/userService'

const userService = new UserService()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.login || !body.password || !body.name || body.password.length < 8) {
      return NextResponse.json(
        { error: 'Логин и имя обязательны. Пароль обязателен и минимум 8 символов.' },
        { status: 400 }
      )
    }

    const user = await userService.createUser(body)
    return NextResponse.json(user)
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}