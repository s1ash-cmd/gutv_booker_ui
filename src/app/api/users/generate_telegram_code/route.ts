import { type NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/authUtils";
import { UserService } from "@/services/userService";

const userService = new UserService();

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    const code = await userService.generateTelegramLinkCode(user.id);

    const botUsername = process.env.TELEGRAM_BOT_USERNAME!;
    const deepLink = userService.generateTelegramDeepLink(code, botUsername);

    return NextResponse.json({
      code: code,
      deepLink: deepLink,
      expiresIn: "10 минут",
      botUsername: botUsername,
      instruction: `Перейдите по ссылке или отправьте боту:\n/link ${code}`,
    });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Invalid token") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message === "Пользователь не найден") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message === "Telegram уже привязан к вашему аккаунту") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: error.message || "Internal error" },
      { status: 500 },
    );
  }
}
