import Image from "next/image";
import Link from "next/link";
import { HomeIntro, HomeMine } from "@/components/HomeBlocks";
import { listFranchises } from "@/lib/franchises";
import { getUpcomingPremieres, TYPE_LABELS } from "@/lib/poiskkino";
import { listRecapIds } from "@/lib/recaps";

const WHERE_NOTES = {
  russia: "в кино",
  digital: "онлайн",
  world: "в мире",
} as const;

// Премьеры вместе с моментом загрузки — Date.now() нельзя вызывать
// прямо при отрисовке
async function loadPremieres() {
  // Без премьер главная всё равно полезна — ошибку не пробрасываем
  return getUpcomingPremieres(Date.now()).catch(() => []);
}

export default async function Home() {
  const [premieres, franchises, recapIds] = await Promise.all([
    loadPremieres(),
    listFranchises(),
    listRecapIds(),
  ]);
  // Премьеры, к которым у нас есть пересказ прошлых частей
  const withRecap = new Set([
    ...recapIds,
    ...franchises.flatMap((franchise) =>
      // Первый фильм вселенной пересказывать перед премьерой нечего
      franchise.films.filter((film) => film.order > 1).map((film) => film.kpId),
    ),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <HomeIntro />
      <HomeMine />

      {premieres.length > 0 && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-bold">Скоро премьеры</h2>
            <p className="text-sm text-white/50">
              Самое ожидаемое на ближайшие три месяца
            </p>
          </div>
          {/* На телефоне — лента с прокруткой вбок, на компьютере — сетка */}
          <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-8">
            {premieres.map((item) => (
              <li key={item.id} className="w-32 shrink-0 snap-start sm:w-auto">
                <Link href={`/title/${item.id}`} className="group flex flex-col gap-1.5">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-white/5">
                    {item.poster?.previewUrl && (
                      <Image
                        src={item.poster.previewUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 120px, 128px"
                        className="object-cover transition group-hover:scale-105"
                      />
                    )}
                    {withRecap.has(item.id) && (
                      <span className="absolute inset-x-1.5 bottom-1.5 rounded-md bg-amber-400 px-1.5 py-1 text-center text-[11px] font-semibold leading-tight text-black">
                        Освежите память
                      </span>
                    )}
                  </div>
                  <span className="line-clamp-2 text-sm font-semibold leading-snug">
                    {item.name || item.alternativeName}
                  </span>
                  <span className="text-xs text-white/50">
                    {new Date(item.premiere.date).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      timeZone: "UTC",
                    })}{" "}
                    · {WHERE_NOTES[item.premiere.where]}
                    {item.type !== "movie" && ` · ${TYPE_LABELS[item.type].toLowerCase()}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {franchises.length > 0 && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-bold">Киновселенные</h2>
            <p className="text-sm text-white/50">
              Перед новым фильмом — пересказ всех прошлых частей
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {franchises.map((franchise) => (
              <li
                key={franchise.id}
                className="flex flex-col gap-3 rounded-xl border border-white/10 p-4"
              >
                <span className="text-lg font-semibold">«{franchise.name}»</span>
                <ol className="flex flex-wrap gap-2">
                  {franchise.films.map((film) => (
                    <li key={film.kpId}>
                      <Link
                        href={`/title/${film.kpId}`}
                        className="block rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/75 transition hover:border-amber-400/60 hover:text-white"
                      >
                        {film.order}. {film.name}{" "}
                        <span className="text-white/40">{film.year}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
