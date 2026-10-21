"use client";

import { useState } from "react";
import {
  airedEpisodes,
  episodeName,
  isAfter,
  type EpisodeKey,
} from "@/lib/episodes";
import {
  knownCharacters,
  RichText,
  type KnownCharacters,
} from "@/components/Characters";
import { FeedbackButton } from "@/components/FeedbackButton";
import type { Season } from "@/lib/poiskkino";
import type { TitleInfo } from "@/lib/progress";
import { useRecapBoundary } from "@/lib/recap-boundary";
import type { Recap, SeasonRecap } from "@/lib/recaps";

type Level = "short" | "normal" | "detailed";

const LEVELS: { value: Level; label: string }[] = [
  { value: "short", label: "Кратко" },
  { value: "normal", label: "Нормально" },
  { value: "detailed", label: "Подробно" },
];

// Блок «Что было раньше»: пересказ строго до метки пользователя
export function RecapPanel({
  title,
  recap,
  seasons,
  now,
}: {
  title: TitleInfo;
  recap: Recap;
  seasons: Season[];
  now: number;
}) {
  const [level, setLevel] = useState<Level>("normal");
  const { mark, last, watched } = useRecapBoundary(title.id, seasons, now);
  const known = knownCharacters(recap.characters ?? [], last);

  if (!mark) {
    return (
      <Shell>
        <p className="text-white/60">
          Отметьте ниже серию, на которой остановились, — и здесь появится
          пересказ всего, что было до неё. Без спойлеров.
        </p>
      </Shell>
    );
  }

  if (!last) {
    return (
      <Shell>
        <p className="text-white/60">
          Вы только начинаете — пересказывать пока нечего. Приятного просмотра!
        </p>
      </Shell>
    );
  }

  const aired = airedEpisodes(seasons, now);
  const lastInSeason = (season: number) =>
    aired.filter(([s]) => s === season).at(-1)?.[1] ?? 0;

  const parts = recap.seasons
    .filter((season) => season.season <= last[0])
    .map((season) => {
      const complete =
        season.season < last[0] || last[1] >= lastInSeason(season.season);
      const episodes = complete
        ? season.episodes
        : season.episodes.filter((episode) => episode.episode <= last[1]);
      return { season, complete, episodes };
    })
    .filter((part) => part.episodes.length > 0);

  // Если остановились ровно на стыке сезонов — главное о финале сезона
  const finished = parts.at(-1);
  const ending =
    finished?.complete && finished.season.season === last[0]
      ? finished.season
      : undefined;

  const covered = parts.at(-1);
  const coveredUpTo: EpisodeKey | undefined = covered && [
    covered.season.season,
    covered.episodes.at(-1)!.episode,
  ];
  const isIncomplete = !coveredUpTo || isAfter(last, coveredUpTo);

  // «Важно помнить» — состояние дел после последней просмотренной серии
  const remember = recap.seasons
    .find((season) => season.season === last[0])
    ?.episodes.find((episode) => episode.episode === last[1])?.remember;
  const position = watched
    ? `после ${last[1]} серии ${last[0]} сезона`
    : `перед ${mark[1]} серией ${mark[0]} сезона`;

  // Пометка к сезону, который человек собирается смотреть
  // (например, «это отдельная история»)
  const upcomingSeason = watched
    ? last[1] >= lastInSeason(last[0])
      ? last[0] + 1
      : last[0]
    : mark[0];
  const note = recap.seasonNotes?.find((item) => item.season === upcomingSeason);

  return (
    <Shell>
      <p className="text-sm text-white/50">
        Пересказ до{" "}
        <span className="text-white/80">
          {watched
            ? `конца ${last[1]} серии ${last[0]} сезона`
            : `начала ${mark[1]} серии ${mark[0]} сезона`}
        </span>
        . Всё, что дальше, мы не показываем.
      </p>

      {note && (
        <div className="rounded-xl border border-sky-400/40 bg-sky-400/10 p-4">
          <h3 className="mb-1 font-semibold text-sky-300">
            {upcomingSeason} сезон — отдельная история
          </h3>
          <p className="leading-relaxed text-white/85">{note.text}</p>
          <p className="mt-2 text-sm text-white/50">
            Если всё же хочется вспомнить прошлые сезоны — пересказ ниже.
          </p>
        </div>
      )}

      <div
        role="tablist"
        aria-label="Подробность пересказа"
        className="flex w-fit gap-1 rounded-xl border border-white/10 p-1"
      >
        {LEVELS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={level === item.value}
            onClick={() => setLevel(item.value)}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              level === item.value
                ? "bg-amber-400 font-semibold text-black"
                : "text-white/60 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {remember?.length ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
          <h3 className="font-semibold text-amber-400">Важно помнить</h3>
          <p className="mb-3 text-xs text-white/45">{position}</p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 leading-relaxed text-white/85 marker:text-amber-400/70">
            {remember.map((item, index) => (
              <li key={index}>
                <RichText text={item} known={known} />
              </li>
            ))}
          </ul>
        </div>
      ) : ending && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
          <h3 className="mb-2 font-semibold text-amber-400">
            Чем закончился {ending.season} сезон
          </h3>
          <p className="leading-relaxed text-white/85">
            <RichText text={ending.ending} known={known} />
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {parts.map(({ season, complete, episodes }, index) => (
          <details
            key={season.season}
            // Последний сезон раскрыт, остальные — по клику
            open={index === parts.length - 1 || level === "short"}
            className="rounded-xl border border-white/10 open:bg-white/5"
          >
            <summary className="px-4 py-3 font-semibold">
              Сезон {season.season}
              {!complete && (
                <span className="ml-2 font-normal text-white/50">
                  серии 1–{episodes.at(-1)!.episode}
                </span>
              )}
            </summary>
            <div className="px-4 pb-4">
              {complete && level !== "detailed" ? (
                <SeasonText season={season} level={level} known={known} />
              ) : (
                <ol className="flex flex-col gap-3">
                  {episodes.map((episode) => (
                    <li key={episode.episode} className="leading-relaxed">
                      <div className="text-sm font-semibold text-white/60">
                        Серия {episode.episode} ·{" "}
                        {episodeName(seasons, [season.season, episode.episode])}
                      </div>
                      <p className="text-white/85">
                        <RichText text={episode.text} known={known} />
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </details>
        ))}
      </div>

      {isIncomplete && (
        <p className="text-sm text-white/50">
          Пересказ дальнейших серий пока не готов.
        </p>
      )}

      <FeedbackButton context={`«${title.name}» · ${position}`} />

      <p className="text-xs text-white/35">
        Пересказ подготовлен с помощью ИИ по материалам: {recap.sources.join("; ")}.
      </p>
    </Shell>
  );
}

function SeasonText({
  season,
  level,
  known,
}: {
  season: SeasonRecap;
  level: Exclude<Level, "detailed">;
  known: KnownCharacters;
}) {
  const text = level === "short" ? season.short : season.normal;
  return (
    <div className="flex flex-col gap-3 leading-relaxed text-white/85">
      {text.split("\n\n").map((paragraph, index) => (
        <p key={index}>
          <RichText text={paragraph} known={known} />
        </p>
      ))}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Что было раньше</h2>
      {children}
    </section>
  );
}
