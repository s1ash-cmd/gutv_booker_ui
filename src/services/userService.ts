import { CreateUserRequestDto, UserResponseDto, UserRole } from '@/app/models/user/user'
import { User } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export class UserService {
  private async createDtoToUser(request: CreateUserRequestDto) {
    const salt = crypto.randomBytes(16).toString('base64')
    const passwordHash = crypto
      .createHash('sha256')
      .update(request.password + salt)
      .digest('base64')

    return {
      login: request.login,
      passwordHash,
      salt,
      name: request.name,
      role: request.ronin ? UserRole.Ronin : UserRole.User,
      joinYear: request.joinYear,
      telegramChatId: null,
      telegramUsername: null,
      banned: false,
    }
  }

  static userToResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      login: user.login,
      telegramChatId: user.telegramChatId,
      telegramUsername: user.telegramUsername,
      isTelegramLinked: user.telegramChatId !== null,
      role: UserRole[user.role],
      banned: user.banned
    }
  }


  async saveRefreshToken(userId: number, refreshToken: string) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken,
        refreshTokenExpiryTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    })
  }

  async getByRefreshToken(refreshToken: string): Promise<User | null> {
    return await prisma.user.findFirst({
      where: {
        refreshToken,
        refreshTokenExpiryTime: {
          gt: new Date(),
        },
      },
    })
  }

  async getByLogin(login: string): Promise<User | null> {
    return await prisma.user.findFirst({
      where: {
        login: {
          equals: login,
          mode: 'insensitive'
        }
      }
    })
  }

  async updateUser(user: User) {
    await prisma.user.update({
      where: { id: user.id },
      data: user,
    })
  }

  async createUser(request: CreateUserRequestDto): Promise<UserResponseDto> {
    const existingUser = await prisma.user.findFirst({
      where: {
        login: {
          equals: request.login,
          mode: 'insensitive'
        }
      }
    })

    if (existingUser) {
      throw new Error("Пользователь с таким логином уже существует")
    }

    const userData = await this.createDtoToUser(request)

    const userCount = await prisma.user.count()
    if (userCount === 0) { userData.role = UserRole.Admin }

    const user = await prisma.user.create({ data: userData })

    return UserService.userToResponseDto(user)
  }

  async getAllUsers(): Promise<UserResponseDto[]> {
    const users = await prisma.user.findMany()
    return users.map(UserService.userToResponseDto)
  }

  async getUserById(id: number): Promise<UserResponseDto | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    })
    return user ? UserService.userToResponseDto(user) : null
  }

  async getUsersByName(namePart: string): Promise<UserResponseDto[] | null> {
    const users = await prisma.user.findMany({
      where: {
        name: {
          contains: namePart,
          mode: 'insensitive',
        },
      },
    })
    return users.length > 0 ? users.map(UserService.userToResponseDto) : null
  }

  async getUserByTelegramChatId(chatId: bigint): Promise<User | null> {
    return await prisma.user.findFirst({
      where: { telegramChatId: chatId },
    })
  }

  async generateTelegramLinkCode(userId: number): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('Пользователь не найден')
    }

    if (user.telegramChatId) {
      throw new Error('Telegram уже привязан к вашему аккаунту')
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()

    await prisma.user.update({
      where: { id: userId },
      data: {
        telegramLinkCode: code,
        telegramLinkCodeExpiry: new Date(Date.now() + 10 * 60 * 1000),
      },
    })

    return code
  }

  async linkTelegramByCode(
    code: string,
    chatId: bigint,
    username: string | null
  ): Promise<User> {
    const user = await prisma.user.findFirst({
      where: { telegramLinkCode: code },
    })

    if (!user) {
      throw new Error('Неверный код привязки')
    }

    if (!user.telegramLinkCodeExpiry || user.telegramLinkCodeExpiry < new Date()) {
      throw new Error('Срок действия кода истек. Сгенерируйте новый код в личном кабинете')
    }

    const existingLink = await prisma.user.findFirst({
      where: { telegramChatId: chatId },
    })

    if (existingLink) {
      if (existingLink.id === user.id) {
        throw new Error('Этот Telegram уже привязан к вашему аккаунту')
      } else {
        throw new Error('Этот Telegram уже привязан к другому аккаунту. Обратитесь к администратору')
      }
    }

    return await prisma.user.update({
      where: { id: user.id },
      data: {
        telegramChatId: chatId,
        telegramUsername: username,
        telegramLinkCode: null,
        telegramLinkCodeExpiry: null,
      },
    })
  }

  async unlinkTelegram(userId: number): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('Пользователь не найден')
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        telegramChatId: null,
        telegramUsername: null,
        telegramLinkCode: null,
        telegramLinkCodeExpiry: null,
      },
    })

    return true
  }

  async updateTelegramUsername(chatId: bigint, newUsername: string | null) {
    const user = await prisma.user.findFirst({
      where: { telegramChatId: chatId },
    })

    if (user && user.telegramUsername !== newUsername) {
      await prisma.user.update({
        where: { id: user.id },
        data: { telegramUsername: newUsername },
      })
    }
  }

  generateTelegramDeepLink(code: string, botUsername: string): string {
    botUsername = botUsername.replace(/^@/, '')
    return `https://t.me/${botUsername}?start=LINK_${code}`
  }

  async getUserByRole(role: UserRole): Promise<UserResponseDto[] | null> {
    const users = await prisma.user.findMany({
      where: { role },
    })
    return users.length > 0 ? users.map(UserService.userToResponseDto) : null
  }

  async banUser(userId: number): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return false

    await prisma.user.update({
      where: { id: userId },
      data: { banned: true },
    })
    return true
  }

  async unbanUser(userId: number): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return false

    await prisma.user.update({
      where: { id: userId },
      data: { banned: false },
    })
    return true
  }

  async makeAdmin(userId: number): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return false

    await prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.Admin },
    })
    return true
  }

  async grantRonin(userId: number): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return false

    await prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.Ronin },
    })
    return true
  }

  async makeUser(userId: number): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return false

    await prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.User },
    })
    return true
  }

  async deleteUser(userId: number): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return false

    await prisma.user.delete({
      where: { id: userId },
    })
    return true
  }
}