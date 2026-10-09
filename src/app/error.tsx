"use client";

import Link from "next/link";

// Показывается вместо страницы, если загрузка сломалась
// (например, ПоискКино не ответил). Подробности пишутся в лог сервера.
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Не удалось загрузить страницу</h1>
      <p className="text-white/60">
        Похоже, временные проблемы со связью. Попробуйте ещё раз через
        несколько секунд.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-amber-400 px-5 py-3 font-semibold text-black transition hover:bg-amber-300"
        >
          Попробовать ещё раз
        </button>
        <Link
          href="/"
          className="rounded-xl border border-white/15 px-5 py-3 transition hover:border-amber-400/60"
        >
          На главную
        </Link>
      </div>
    </section>
  );
}
