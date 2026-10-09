import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { SeasonsList } from "@/components/SeasonsList";
import { TitleProgress } from "@/components/TitleProgress";
import {
  getRoles,
  getSeasons,
  getTitle,
  TYPE_LABELS,
  type Title,
} from "@/lib/poiskkino";

type Props = { params: Promise<{ id: string }> };

async function loadTitle(params: Props["params"]) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return getTitle(id);
}

// Сезоны вместе с моментом загрузки: по нему сервер и браузер
// одинаково решают, какие серии уже вышли
async function loadSeasons(title: Title) {
  return {
    seasons: title.isSeries ? await getSeasons(title.id) : [],
    now: Date.now(),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const title = await loadTitle(params);
  const name = title.name || title.alternativeName || "Без названия";
  return {
    title: `${name} (${title.year}) — что было раньше`,
    description: title.shortDescription || title.description,
  };
}

export default async function TitlePage({ params }: Props) {
  const title = await loadTitle(params);
  const actors = (title.persons ?? [])
    .filter((person) => person.enProfession === "actor")
    .slice(0, 12);
  const [{ seasons, now }, roles] = await Promise.all([
    loadSeasons(title),
    // Без ролей страница всё равно полезна, поэтому ошибку не пробрасываем
    getRoles(
      title.id,
      actors.map((actor) => actor.id),
    ).catch(() => ({}) as Record<number, string>),
  ]);
  const titleInfo = {
    id: title.id,
    name: title.name || title.alternativeName || "Без названия",
    year: title.year,
    posterUrl: title.poster?.previewUrl,
    isSeries: Boolean(title.isSeries),
  };

  return (
    <article className="flex flex-col gap-10">
      <section className="flex flex-col gap-6 sm:flex-row">
        <div className="relative aspect-[2/3] w-48 shrink-0 overflow-hidden rounded-2xl bg-white/5">
          {title.poster?.url && (
            <Image
              src={title.poster.url}
              alt={title.name ?? ""}
              fill
              sizes="192px"
              className="object-cover"
              priority
            />
          )}
        </div>
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold">
            {title.name || title.alternativeName}
          </h1>
          <p className="text-white/50">
            {[
              TYPE_LABELS[title.type],
              title.year,
              title.genres?.map((genre) => genre.name).join(", "),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {title.rating?.kp ? (
            <p className="text-sm">
              Кинопоиск{" "}
              <span className="font-semibold text-amber-400">
                {title.rating.kp.toFixed(1)}
              </span>
              {title.rating.imdb ? (
                <>
                  {" "}
                  · IMDb{" "}
                  <span className="font-semibold">
                    {title.rating.imdb.toFixed(1)}
                  </span>
                </>
              ) : null}
            </p>
          ) : null}
          {title.description && (
            <p className="max-w-2xl leading-relaxed text-white/80">
              {title.description}
            </p>
          )}
        </div>
      </section>

      <TitleProgress title={titleInfo} seasons={seasons} now={now} />

      {actors.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">Персонажи</h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {actors.map((actor) => (
              <li key={actor.id} className="flex flex-col gap-2">
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-white/5">
                  {actor.photo && (
                    <Image
                      src={actor.photo}
                      alt={actor.name ?? ""}
                      fill
                      sizes="160px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="text-sm">
                  <div className="font-semibold">
                    {roles[actor.id] || actor.description || actor.name}
                  </div>
                  {(roles[actor.id] || actor.description) && (
                    <div className="text-white/50">
                      {actor.name || actor.enName}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {seasons.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">Сезоны и серии</h2>
          <SeasonsList title={titleInfo} seasons={seasons} now={now} />
        </section>
      )}
    </article>
  );
}
