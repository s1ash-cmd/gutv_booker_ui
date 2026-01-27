import { type NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/authUtils";
import { UserService } from "@/services/userService";

const userService = new UserService();

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    await userService.unlinkTelegram(user.id);

    return NextResponse.json({ message: "Telegram успешно отвязан" });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Invalid token") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message === "Пользователь не найден") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || "Internal error" },
      { status: 500 },
    );
  }
}
