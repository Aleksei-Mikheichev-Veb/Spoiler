// Обычная форма: отправляет ?q=... на /search, JavaScript не нужен.
export function SearchForm({
  defaultValue = "",
  compact = false,
}: {
  defaultValue?: string;
  compact?: boolean;
}) {
  return (
    <form action="/search" className="flex w-full gap-2">
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={
          compact ? "Найти фильм или сериал" : "Фильм или сериал, например «Дюна»"
        }
        aria-label="Поиск фильма или сериала"
        required
        className={`min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 outline-none placeholder:text-white/40 focus:border-amber-400/60 ${
          compact ? "px-3 py-2 text-sm" : "px-4 py-3 text-base"
        }`}
      />
      <button
        type="submit"
        className={`rounded-xl bg-amber-400 font-semibold text-black transition hover:bg-amber-300 ${
          compact ? "px-3 py-2 text-sm" : "px-5 py-3"
        }`}
      >
        Найти
      </button>
    </form>
  );
}
