// Вход в закрытый тест: форма со страницы /login присылает пароль,
// при совпадении ставим cookie на год и возвращаем туда, откуда пришли
import { NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  AUTH_MAX_AGE,
  authToken,
  publicBase,
  safeNext,
} from "@/lib/site-auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const next = safeNext(String(form.get("next") ?? ""));
  const password = process.env.SITE_PASSWORD;
  const base = publicBase(request);

  if (password && String(form.get("password") ?? "") !== password) {
    // Пауза мешает подбирать пароль перебором
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const back = new URL("/login", base);
    back.searchParams.set("next", next);
    back.searchParams.set("error", "1");
    return NextResponse.redirect(back, 303);
  }

  const response = NextResponse.redirect(new URL(next, base), 303);
  if (password) {
    response.cookies.set(AUTH_COOKIE, await authToken(password), {
      httpOnly: true,
      sameSite: "lax",
      secure: base.startsWith("https:"),
      maxAge: AUTH_MAX_AGE,
      path: "/",
    });
  }
  return response;
}
