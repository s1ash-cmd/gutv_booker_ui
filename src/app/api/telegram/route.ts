import { NextRequest } from 'next/server';
import { TelegramUpdateHandler } from '@/lib/telegram/updateHandler';

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    console.log('Получен webhook от Telegram:', JSON.stringify(update, null, 2));

    const handler = new TelegramUpdateHandler();
    await handler.handleUpdateAsync(update);

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return new Response('OK', { status: 200 });
  }
}

export async function GET() {
  return Response.json({ status: 'Telegram webhook is ready' });
}