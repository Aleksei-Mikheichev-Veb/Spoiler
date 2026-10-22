// Закрытый тест: если на сервере задан SITE_PASSWORD, браузер спрашивает
// логин и пароль (логин любой). Без переменной сайт открыт — как локально.
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next();

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    // «логин:пароль» в base64; пароль — всё после первого двоеточия
    const decoded = atob(header.slice("Basic ".length));
    if (decoded.slice(decoded.indexOf(":") + 1) === password) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Сайт пока закрыт для тестирования. Нужен пароль.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="spoiler", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
