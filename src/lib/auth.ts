import { AuthService } from '@/services/authService'

export const authService = new AuthService({
  key: process.env.JWT_SECRET!,
  issuer: process.env.JWT_ISSUER!,
  audience: process.env.JWT_AUDIENCE!,
  expireMinutes: parseInt(process.env.JWT_EXPIRE_MINUTES!, 10)
})