import { ContinueWatching } from "@/components/ContinueWatching";
import { SearchForm } from "@/components/SearchForm";

export default function Home() {
  return (
    <div className="flex flex-col gap-12">
      <section className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-16 text-center">
        <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
          Забыли, что было в прошлом сезоне?
        </h1>
        <p className="text-lg text-white/60">
          Найдите фильм или сериал, отметьте, где остановились, — и мы напомним
          всё, что было до этого места. Без спойлеров.
        </p>
        <SearchForm />
      </section>
      <ContinueWatching />
    </div>
  );
}
