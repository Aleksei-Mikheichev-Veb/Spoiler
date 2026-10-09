import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Такой страницы нет</h1>
      <p className="text-white/60">
        Возможно, ссылка устарела. Попробуйте найти фильм или сериал через
        поиск.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-amber-400 px-5 py-3 font-semibold text-black transition hover:bg-amber-300"
      >
        На главную
      </Link>
    </section>
  );
}
