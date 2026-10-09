"use client";

import { TimeForm } from "@/components/TimeForm";
import {
  airedEpisodes,
  episodeName,
  formatAirDate,
  isAfter,
  createAiredCheck,
  displayEpisodeName,
  type EpisodeKey,
} from "@/lib/episodes";
import { saveProgress, useProgress, type TitleInfo } from "@/lib/progress";
import type { Season } from "@/lib/poiskkino";

// Список сезонов и серий с кнопкой «Я остановился здесь»
export function SeasonsList({
  title,
  seasons,
  now,
}: {
  title: TitleInfo;
  seasons: Season[];
  // Время рендера на сервере — чтобы сервер и браузер одинаково
  // решили, какие серии уже вышли
  now: number;
}) {
  const progress = useProgress(title.id);
  const mark: EpisodeKey | null =
    progress?.season && progress?.episode
      ? [progress.season, progress.episode]
      : null;
  const aired = airedEpisodes(seasons, now);
  const isAired = createAiredCheck(seasons, now);

  // «10 серий», «выйдет 12 ноября» или «анонсирован»
  function seasonLabel(season: Season): string {
    const episodes = season.episodes ?? [];
    if (episodes.some((episode) => isAired(season.number, episode))) {
      return `${episodes.length || season.episodesCount} серий`;
    }
    const airDate = episodes.find((episode) => episode.airDate)?.airDate;
    return airDate
      ? `выйдет ${formatAirDate(airDate, now)}`
      : "анонсирован, дата пока неизвестна";
  }

  function markEpisode(key: EpisodeKey) {
    saveProgress(title, {
      season: key[0],
      episode: key[1],
      episodeName: episodeName(seasons, key),
    });
  }

  // «Досмотрел» переносит метку на следующую вышедшую серию.
  // Если её нет — сериал ждёт новый сезон.
  function finishEpisode(current: EpisodeKey) {
    const next = aired.find((key) => isAfter(key, current));
    if (next) {
      markEpisode(next);
    } else {
      saveProgress(title, {
        season: current[0],
        episode: current[1],
        episodeName: episodeName(seasons, current),
        watched: true,
      });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {seasons.map((season) => (
        <details
          key={season.number}
          open={mark?.[0] === season.number}
          className="rounded-xl border border-white/10 open:bg-white/5"
        >
          <summary className="px-4 py-3 font-semibold">
            Сезон {season.number}
            <span className="ml-2 font-normal text-white/50">
              {seasonLabel(season)}
            </span>
          </summary>
          <ol className="flex flex-col px-2 pb-3">
            {season.episodes?.map((episode) => {
              const key: EpisodeKey = [season.number, episode.number];
              const name = displayEpisodeName(episode);
              const isCurrent =
                mark !== null && mark[0] === key[0] && mark[1] === key[1];
              const isWatched =
                mark !== null &&
                (isAfter(mark, key) || (isCurrent && progress?.watched));
              const released = isAired(season.number, episode);

              if (isCurrent && progress && !progress.watched) {
                return (
                  <li
                    key={episode.number}
                    className="my-1 flex flex-col gap-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-2 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 shrink-0 text-right text-white/40">
                        {episode.number}
                      </span>
                      <span className="min-w-0 flex-1 font-semibold">
                        {name}
                      </span>
                      <span className="shrink-0 rounded-md bg-amber-400 px-2 py-1 text-xs font-semibold text-black">
                        Вы здесь
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-9">
                      <TimeForm
                        seconds={progress.seconds}
                        onSave={(seconds) =>
                          saveProgress(title, {
                            season: key[0],
                            episode: key[1],
                            episodeName: name,
                            seconds,
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => finishEpisode(key)}
                        className="rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:border-amber-400/60"
                      >
                        ✓ Досмотрел серию
                      </button>
                    </div>
                  </li>
                );
              }

              return (
                <li
                  key={episode.number}
                  className={`group flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5 ${
                    isCurrent ? "bg-amber-400/10" : ""
                  }`}
                >
                  <span className="w-6 shrink-0 text-right text-white/40">
                    {isWatched ? "✓" : episode.number}
                  </span>
                  <span
                    className={`min-w-0 flex-1 ${
                      isWatched || !released ? "text-white/40" : "text-white/80"
                    }`}
                  >
                    {name}
                  </span>
                  {!released ? (
                    <span className="shrink-0 text-xs text-white/40">
                      {episode.airDate
                        ? `выйдет ${formatAirDate(episode.airDate, now)}`
                        : "ещё не вышла"}
                    </span>
                  ) : isCurrent ? (
                    <span className="shrink-0 rounded-md bg-amber-400/20 px-2 py-1 text-xs font-semibold text-amber-300">
                      Досмотрено
                    </span>
                  ) : isWatched ? (
                    // Для исправления случайной метки: на компьютере видна
                    // только при наведении, на телефоне — всегда
                    <button
                      type="button"
                      onClick={() => markEpisode(key)}
                      className="shrink-0 rounded-md px-2 py-1 text-xs text-white/40 transition hover:text-white focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0"
                    >
                      Перенести сюда
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => markEpisode(key)}
                      className="shrink-0 rounded-md border border-white/15 px-2 py-1 text-xs text-white/60 transition hover:border-amber-400/60 hover:text-white"
                    >
                      Я остановился здесь
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </details>
      ))}
    </div>
  );
}
