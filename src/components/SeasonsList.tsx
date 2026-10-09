"use client";

import { TimeForm } from "@/components/TimeForm";
import { saveProgress, useProgress, type TitleInfo } from "@/lib/progress";
import type { Season } from "@/lib/poiskkino";

function isBefore(
  season: number,
  episode: number,
  mark: { season: number; episode: number },
) {
  return (
    season < mark.season || (season === mark.season && episode < mark.episode)
  );
}

// Список сезонов и серий с кнопкой «Я остановился здесь»
export function SeasonsList({
  title,
  seasons,
}: {
  title: TitleInfo;
  seasons: Season[];
}) {
  const progress = useProgress(title.id);
  const mark =
    progress?.season && progress?.episode
      ? { season: progress.season, episode: progress.episode }
      : null;

  return (
    <div className="flex flex-col gap-2">
      {seasons.map((season) => (
        <details
          key={season.number}
          open={mark?.season === season.number}
          className="rounded-xl border border-white/10 open:bg-white/5"
        >
          <summary className="px-4 py-3 font-semibold">
            Сезон {season.number}
            <span className="ml-2 font-normal text-white/50">
              {season.episodes?.length ?? season.episodesCount} серий
            </span>
          </summary>
          <ol className="flex flex-col px-2 pb-3">
            {season.episodes?.map((episode) => {
              const name = episode.name || episode.enName || "Без названия";
              const isCurrent =
                mark?.season === season.number &&
                mark.episode === episode.number;
              const isWatched =
                mark !== null && isBefore(season.number, episode.number, mark);
              const markHere = () =>
                saveProgress(title, {
                  season: season.number,
                  episode: episode.number,
                  episodeName: name,
                });

              if (isCurrent && progress) {
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
                    <div className="pl-9">
                      <TimeForm
                        seconds={progress.seconds}
                        onSave={(seconds) =>
                          saveProgress(title, {
                            season: season.number,
                            episode: episode.number,
                            episodeName: name,
                            seconds,
                          })
                        }
                      />
                    </div>
                  </li>
                );
              }

              return (
                <li
                  key={episode.number}
                  className="group flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5"
                >
                  <span className="w-6 shrink-0 text-right text-white/40">
                    {isWatched ? "✓" : episode.number}
                  </span>
                  <span
                    className={`min-w-0 flex-1 ${
                      isWatched ? "text-white/40" : "text-white/80"
                    }`}
                  >
                    {name}
                  </span>
                  {isWatched ? (
                    // Для исправления случайной метки: на компьютере видна
                    // только при наведении, на телефоне — всегда
                    <button
                      type="button"
                      onClick={markHere}
                      className="shrink-0 rounded-md px-2 py-1 text-xs text-white/40 transition hover:text-white focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0"
                    >
                      Перенести сюда
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={markHere}
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
