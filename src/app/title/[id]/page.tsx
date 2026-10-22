import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CharacterGrid } from "@/components/Characters";
import { ListControls } from "@/components/ListControls";
import { RatingControl } from "@/components/RatingControl";
import { RecapPanel } from "@/components/RecapPanel";
import { SeasonsList } from "@/components/SeasonsList";
import { TitleProgress } from "@/components/TitleProgress";
import { airedEpisodes } from "@/lib/episodes";
import { formatMinutes, plural } from "@/lib/plural";
import {
  getRoles,
  getSeasons,
  getTitle,
  TYPE_LABELS,
  type Season,
  type Title,
} from "@/lib/poiskkino";
import { getRecap } from "@/lib/recaps";

type Props = { params: Promise<{ id: string }> };

async function loadTitle(params: Props["params"]) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return getTitle(id);
}

// «Фильм · 2 ч 46 мин» или «Сериал · 3 сезона · серия ~50 мин» —
// чтобы в списках сразу было видно, что это и сколько смотреть
function describeLength(title: Title, seasons: Season[], now: number) {
  if (!title.isSeries) {
    return title.movieLength
      ? `Фильм · ${formatMinutes(title.movieLength)}`
      : "Фильм";
  }
  const count = new Set(airedEpisodes(seasons, now).map(([season]) => season))
    .size;
  return [
    "Сериал",
    count && `${count} ${plural(count, ["сезон", "сезона", "сезонов"])}`,
    title.seriesLength && `серия ~${title.seriesLength} мин`,
  ]
    .filter(Boolean)
    .join(" · ");
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
  const [{ seasons, now }, roles, recap] = await Promise.all([
    loadSeasons(title),
    // Без ролей страница всё равно полезна, поэтому ошибку не пробрасываем
    getRoles(
      title.id,
      actors.map((actor) => actor.id),
    ).catch(() => ({}) as Record<number, string>),
    title.isSeries ? getRecap(title.id) : null,
  ]);
  const titleInfo = {
    id: title.id,
    name: title.name || title.alternativeName || "Без названия",
    year: title.year,
    posterUrl: title.poster?.previewUrl,
    isSeries: Boolean(title.isSeries),
  };
  const summary = describeLength(title, seasons, now);

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
          <p className="text-sm text-white/50">{summary}</p>
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
          <RatingControl title={titleInfo} summary={summary} />
          <ListControls title={titleInfo} summary={summary} />
        </div>
      </section>

      <TitleProgress title={titleInfo} seasons={seasons} now={now} />

      {recap && (
        <RecapPanel
          title={titleInfo}
          recap={recap}
          seasons={seasons}
          now={now}
        />
      )}

      {/* Для сериалов с нашей базой героев — список без спойлеров */}
      {recap?.characters?.length ? (
        <CharacterGrid
          titleId={title.id}
          characters={recap.characters}
          seasons={seasons}
          now={now}
        />
      ) : actors.length > 0 && (
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
