import crypto from "crypto";
import { jwtVerify, SignJWT } from "jose";
import type { AuthSettings } from "@/app/models/auth/auth";
import { UserRole } from "@/app/models/user/user";
import type { User } from "@/generated/prisma/client";

export class AuthService {
  private settings: AuthSettings;
  private secret: Uint8Array;

  constructor(settings: AuthSettings) {
    if (!settings.key) {
      throw new Error("JWT secret not set");
    }
    this.settings = settings;
    this.secret = new TextEncoder().encode(settings.key);
  }

  async generateAccessToken(user: User): Promise<string> {
    const roleName = UserRole[user.role as number];

    const token = await new SignJWT({
      sub: user.id.toString(),
      name: user.name,
      login: user.login,
      role: roleName,
      isTelegramLinked: !!user.telegramChatId,
    })

      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(this.settings.issuer)
      .setAudience(this.settings.audience)
      .setExpirationTime(`${this.settings.expireMinutes}m`)
      .setIssuedAt()
      .sign(this.secret);

    return token;
  }

  generateRefreshToken(): string {
    const randomBytes = crypto.randomBytes(32);
    return randomBytes.toString("base64");
  }

  async verifyToken(token: string): Promise<any> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        issuer: this.settings.issuer,
        audience: this.settings.audience,
      });
      return payload;
    } catch (error) {
      throw new Error("Invalid token");
    }
  }
}
