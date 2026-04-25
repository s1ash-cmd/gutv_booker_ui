import type { NextRequest } from "next/server";
import { TelegramUpdateHandler } from "@/lib/telegram/updateHandler";

export async function POST(req: NextRequest) {
  try {
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
    if (
      expectedSecret &&
      req.headers.get("x-telegram-bot-api-secret-token") !== expectedSecret
    ) {
      return new Response("Unauthorized", { status: 401 });
    }

    const update = await req.json();

    console.log("Получен webhook от Telegram:", {
      updateId: update?.update_id,
      type: update?.message
        ? "message"
        : update?.callback_query
          ? "callback"
          : "unknown",
    });

    const handler = new TelegramUpdateHandler();
    await handler.handleUpdateAsync(update);

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return new Response("OK", { status: 200 });
  }
}

export async function GET() {
  return Response.json({ status: "Telegram webhook is ready" });
}
