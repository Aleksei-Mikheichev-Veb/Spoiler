"use client";

import Link from "next/link";
import { useState } from "react";
import type { EpisodeKey } from "@/lib/episodes";
import {
  CharacterList,
  knownCharacters,
  RichText,
} from "@/components/Characters";
import { FeedbackButton } from "@/components/FeedbackButton";
import { LevelTabs, SeasonText, type Level } from "@/components/RecapPanel";
import type { Franchise } from "@/lib/franchises";
import { useLibraryEntry } from "@/lib/library";

// Фильм из киновселенной: пересказ прошлых фильмов перед этим.
// Если этот фильм уже отмечен как просмотренный — пересказываем и его.
export function FranchisePanel({
  franchise,
  filmId,
}: {
  franchise: Franchise;
  filmId: number;
}) {
  const [level, setLevel] = useState<Level>("normal");
  const entry = useLibraryEntry(filmId);
  const film = franchise.films.find((item) => item.kpId === filmId)!;
  const seenThis = entry?.status === "done";
  // Номер последнего фильма, который можно пересказывать
  const upTo = seenThis ? film.order : film.order - 1;
  const parts = franchise.seasons.filter((season) => season.season <= upTo);
  const lastFilm = parts.at(-1);
  // Граница спойлеров — конец последнего пересказанного фильма
  const last: EpisodeKey | undefined = lastFilm && [
    lastFilm.season,
    lastFilm.episodes.at(-1)?.episode ?? 1,
  ];
  const known = knownCharacters(franchise.characters, last);
  const filmName = (order: number) =>
    franchise.films.find((item) => item.order === order)?.name ?? "";
  const next = franchise.films.find((item) => item.order === upTo + 1);

  return (
    <>
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">Что было раньше</h2>

        <FilmChain franchise={franchise} current={filmId} />

        {!lastFilm ? (
          <p className="text-white/60">
            Это первый фильм вселенной — пересказывать пока нечего. Когда
            посмотрите, отметьте его как просмотренный, и здесь появится
            пересказ.
          </p>
        ) : (
          <>
            <p className="text-sm text-white/50">
              Пересказ{" "}
              <span className="text-white/80">
                {parts.length === 1
                  ? `фильма «${lastFilm && filmName(lastFilm.season)}»`
                  : `фильмов 1–${parts.length}`}
              </span>
              {seenThis
                ? ". Этот фильм вы отметили как просмотренный."
                : `. Всё, что в «${film.name}», мы не показываем.`}
            </p>
            {upTo > lastFilm.season && (
              <p className="text-sm text-white/50">
                Пересказ «{film.name}» пока не готов.
              </p>
            )}

            <LevelTabs level={level} onChange={setLevel} />

            <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
              <h3 className="font-semibold text-amber-400">Важно помнить</h3>
              <p className="mb-3 text-xs text-white/45">
                {next
                  ? `перед фильмом «${next.name}»`
                  : `после фильма «${filmName(lastFilm.season)}»`}
              </p>
              <p className="leading-relaxed text-white/85">
                <RichText text={lastFilm.ending} known={known} />
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {parts.map((season, index) => (
                <details
                  key={season.season}
                  open={index === parts.length - 1 || level === "short"}
                  className="rounded-xl border border-white/10 open:bg-white/5"
                >
                  <summary className="px-4 py-3 font-semibold">
                    {filmName(season.season)}
                  </summary>
                  <div className="px-4 pb-4">
                    {level !== "detailed" ? (
                      <SeasonText season={season} level={level} known={known} />
                    ) : (
                      <ol className="flex flex-col gap-3">
                        {season.episodes.map((part) => (
                          <li key={part.episode} className="leading-relaxed">
                            <div className="text-sm font-semibold text-white/60">
                              Часть {part.episode}
                              {part.title && ` · ${part.title}`}
                            </div>
                            <p className="text-white/85">
                              <RichText text={part.text} known={known} />
                            </p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </details>
              ))}
            </div>

            <FeedbackButton
              context={`вселенная «${franchise.name}», страница «${film.name}»`}
            />

            <p className="text-xs text-white/35">
              Пересказ подготовлен с помощью ИИ по материалам:{" "}
              {franchise.sources.join("; ")}.
            </p>
          </>
        )}
      </section>

      <CharacterList
        characters={franchise.characters}
        last={last}
        hint={
          last
            ? "Только те, кого вы уже видели, — без спойлеров."
            : "Главные герои начала фильма."
        }
      />
    </>
  );
}

// Все фильмы вселенной по порядку, текущий выделен
function FilmChain({
  franchise,
  current,
}: {
  franchise: Franchise;
  current: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-white/50">Вселенная «{franchise.name}»</p>
      <ol className="flex flex-wrap gap-2">
        {franchise.films.map((film) => (
          <li key={film.kpId}>
            {film.kpId === current ? (
              <span className="block rounded-xl border border-amber-400/60 bg-amber-400/10 px-3 py-1.5 text-sm">
                {film.order}. {film.name}{" "}
                <span className="text-white/45">{film.year}</span>
              </span>
            ) : (
              <Link
                href={`/title/${film.kpId}`}
                className="block rounded-xl border border-white/10 px-3 py-1.5 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
              >
                {film.order}. {film.name}{" "}
                <span className="text-white/45">{film.year}</span>
              </Link>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
