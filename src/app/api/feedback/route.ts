// Отзыв с кнопки «Нашли ошибку?» — пересылаем его в Telegram владельцу.
// Токен бота и id чата хранятся только на сервере (переменные окружения).
// POST /api/feedback  { type, text, context, page }
import { NextResponse } from "next/server";

const MAX_TEXT = 2000;
const MAX_SHORT = 300;

// Защита от случайного спама: не больше 5 отзывов в минуту с одного адреса.
// Хранится в памяти сервера — для закрытого теста этого достаточно.
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;
const recent = new Map<string, number[]>();

function tooMany(ip: string): boolean {
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  times.push(now);
  recent.set(ip, times);
  return times.length > RATE_LIMIT;
}

function field(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return NextResponse.json(
      { error: "Отправка отзывов не настроена" },
      { status: 503 },
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (tooMany(ip)) {
    return NextResponse.json(
      { error: "Слишком много отзывов подряд, попробуйте через минуту" },
      { status: 429 },
    );
  }

  const body: Record<string, unknown> = await request.json().catch(() => ({}));
  const text = field(body.text, MAX_TEXT);
  if (!text) {
    return NextResponse.json({ error: "Пустое сообщение" }, { status: 400 });
  }

  const message = [
    `📝 ${field(body.type, MAX_SHORT) || "Отзыв"}`,
    field(body.context, MAX_SHORT),
    "",
    text,
    "",
    field(body.page, MAX_SHORT),
  ]
    .filter((line, index) => line || index === 2 || index === 4)
    .join("\n");

  // Связь сервера с Telegram бывает нестабильной: если соединение
  // не установилось, пробуем ещё раз (всего до трёх попыток)
  let res: Response | null = null;
  let lastCause = "нет ответа";
  for (let attempt = 1; attempt <= 3 && !res; attempt++) {
    try {
      res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Без parse_mode: текст отзыва отправляем как есть, без разметки
        body: JSON.stringify({ chat_id: chatId.trim(), text: message }),
        signal: AbortSignal.timeout(12_000),
      });
    } catch (error) {
      lastCause =
        (error as { cause?: { code?: string } }).cause?.code ??
        (error as Error).name;
      console.error(`feedback: нет связи с Telegram, попытка ${attempt}`, lastCause);
    }
  }

  if (!res) {
    return NextResponse.json(
      { error: `Сервер не смог связаться с Telegram (${lastCause})` },
      { status: 502 },
    );
  }

  if (!res.ok) {
    // Telegram ответил отказом — его описание подскажет причину
    const data = await res.json().catch(() => null);
    const reason = data?.description ?? `код ${res.status}`;
    console.error("feedback: Telegram отказал", reason);
    return NextResponse.json(
      { error: `Telegram не принял сообщение: ${reason}` },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
