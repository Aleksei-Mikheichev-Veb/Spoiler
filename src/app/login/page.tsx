import type { Metadata } from "next";
import { safeNext } from "@/lib/site-auth";

export const metadata: Metadata = {
  title: "Вход",
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-5 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Сайт на закрытом тесте</h1>
        <p className="text-white/60">
          Введите пароль, который вам дали. Сайт запомнит вас на год.
        </p>
      </div>
      <form action="/api/login" method="post" className="flex flex-col gap-3">
        <input type="hidden" name="next" value={safeNext(next)} />
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          placeholder="Пароль"
          aria-label="Пароль"
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base outline-none placeholder:text-white/40 focus:border-amber-400/60"
        />
        {error && <p className="text-sm text-red-400">Неверный пароль</p>}
        <button
          type="submit"
          className="rounded-xl bg-amber-400 px-5 py-3 font-semibold text-black transition hover:bg-amber-300 active:scale-[0.98]"
        >
          Войти
        </button>
      </form>
    </div>
  );
}
