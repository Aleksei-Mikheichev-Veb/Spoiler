// Закрытый тест: если на сервере задан SITE_PASSWORD, без входа видна
// только страница /login. Без переменной сайт открыт — как локально.
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, authToken, publicBase } from "@/lib/site-auth";

export async function proxy(request: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname === "/login" || pathname === "/api/login") {
    return NextResponse.next();
  }
  if (request.cookies.get(AUTH_COOKIE)?.value === (await authToken(password))) {
    return NextResponse.next();
  }

  // Запросы данных со страниц — просто «нет доступа», без перехода
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Нужен вход" }, { status: 401 });
  }
  const login = new URL("/login", publicBase(request));
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

// Картинки и служебные файлы пускаем без пароля: в них нет ничего
// секретного, а уменьшатель картинок Next.js запрашивает фото у этого же
// сервера без cookie. Описание приложения и иконки телефон тоже
// запрашивает без cookie
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|recaps/|favicon.ico|manifest.webmanifest|pwa-icon/|apple-icon).*)",
  ],
};
