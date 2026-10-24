import { BackupControls } from "@/components/BackupControls";
import { FeedbackButton } from "@/components/FeedbackButton";
import { HomeHero, Library } from "@/components/Library";
import { SearchForm } from "@/components/SearchForm";
import { parseHomeTab } from "@/lib/home-tab";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const tab = parseHomeTab((await searchParams).tab);

  return (
    <div className="flex flex-col gap-12">
      <HomeHero tab={tab}>
        <section className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-6 text-center sm:py-16">
          <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
            Забыли, что было в прошлом сезоне?
          </h1>
          <p className="text-lg text-white/60">
            Найдите фильм или сериал, отметьте, где остановились, — и мы
            напомним всё, что было до этого места. Без спойлеров.
          </p>
          <SearchForm />
        </section>
      </HomeHero>
      <Library tab={tab} />
      {/* На телефоне — вкладка «Ещё», на компьютере — внизу главной */}
      <section
        className={`flex-col gap-6 ${tab === "more" ? "flex" : "hidden sm:flex"}`}
      >
        <h2 className="text-2xl font-bold sm:hidden">Ещё</h2>
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 p-4 sm:hidden">
          <div>
            <h2 className="font-semibold">Обратная связь</h2>
            <p className="text-sm text-white/50">
              Нашли ошибку в пересказе или есть идея — напишите, мы прочитаем.
            </p>
          </div>
          <FeedbackButton context="вкладка «Ещё»" />
        </div>
        <BackupControls />
      </section>
    </div>
  );
}
