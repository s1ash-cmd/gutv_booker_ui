interface TelegramMethod {
  sendMessage: (params: {
    chat_id: number | bigint;
    text: string;
    parse_mode?: "HTML" | "Markdown";
    reply_markup?: any;
  }) => Promise<void>;

  answerCallbackQuery: (params: {
    callback_query_id: string;
    text?: string;
    show_alert?: boolean;
  }) => Promise<void>;
}

export class TelegramClient implements TelegramMethod {
  private token: string;
  private baseUrl: string;

  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN!;
    this.baseUrl = `https://api.telegram.org/bot${this.token}`;
  }

  async sendMessage(params: {
    chat_id: number | bigint;
    text: string;
    parse_mode?: "HTML" | "Markdown";
    reply_markup?: any;
  }) {
    await fetch(`${this.baseUrl}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params, (_, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    });
  }

  async answerCallbackQuery(params: {
    callback_query_id: string;
    text?: string;
    show_alert?: boolean;
  }) {
    await fetch(`${this.baseUrl}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  }
}