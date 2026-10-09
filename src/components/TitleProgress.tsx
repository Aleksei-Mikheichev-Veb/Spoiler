"use client";

import { TimeForm } from "@/components/TimeForm";
import {
  airedEpisodes,
  describeNewEpisodes,
  describeUpcoming,
  episodeName,
  findUpcoming,
  isAfter,
  type EpisodeKey,
} from "@/lib/episodes";
import type { Season } from "@/lib/poiskkino";
import {
  removeProgress,
  saveProgress,
  useProgress,
  type TitleInfo,
} from "@/lib/progress";

// Плашка «Вы остановились…» вверху карточки
export function TitleProgress({
  title,
  seasons,
  now,
}: {
  title: TitleInfo;
  seasons: Season[];
  now: number;
}) {
  const progress = useProgress(title.id);
  const aired = airedEpisodes(seasons, now);
  const mark: EpisodeKey | null =
    progress?.season && progress?.episode
      ? [progress.season, progress.episode]
      : null;

  if (title.isSeries && !mark) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 p-4 text-white/60">
        Отметьте ниже серию, на которой вы остановились, — мы запомним её.
      </div>
    );
  }

  const resetButton = progress && (
    <button
      type="button"
      onClick={() => removeProgress(title.id)}
      className="self-start text-sm text-white/40 underline-offset-4 hover:text-white/70 hover:underline"
    >
      Сбросить метку
    </button>
  );

  if (mark && progress?.watched) {
    const newer = aired.filter((key) => isAfter(key, mark));
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
        <p>
          Вы досмотрели{" "}
          <span className="font-semibold">
            сезон {mark[0]}, серию {mark[1]}
          </span>
          .
        </p>
        {newer.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-amber-400">
              {describeNewEpisodes(newer, mark[0])}
            </span>
            <button
              type="button"
              onClick={() =>
                saveProgress(title, {
                  season: newer[0][0],
                  episode: newer[0][1],
                  episodeName: episodeName(seasons, newer[0]),
                })
              }
              className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-black transition hover:bg-amber-300"
            >
              Смотреть дальше: сезон {newer[0][0]}, серия {newer[0][1]}
            </button>
          </div>
        ) : (
          <p className="text-white/60">
            <span className="font-semibold text-white/80">
              {describeUpcoming(findUpcoming(seasons, now, mark), now)}
            </span>
            . Когда выйдут новые серии — покажем на главной.
          </p>
        )}
        {resetButton}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
      {mark && progress ? (
        <p>
          Вы остановились:{" "}
          <span className="font-semibold">
            сезон {mark[0]}, серия {mark[1]}
          </span>
          {progress.episodeName && (
            <span className="text-white/60"> «{progress.episodeName}»</span>
          )}
        </p>
      ) : (
        <p>
          {progress
            ? "Вы остановились на этом месте фильма:"
            : "Начали смотреть? Запишите, на какой минуте остановились:"}
        </p>
      )}
      <TimeForm
        // key сбрасывает поле, когда выбрана другая серия
        key={mark ? mark.join("-") : "movie"}
        seconds={progress?.seconds}
        onSave={(seconds) =>
          saveProgress(title, {
            season: progress?.season,
            episode: progress?.episode,
            episodeName: progress?.episodeName,
            seconds,
          })
        }
      />
      {resetButton}
    </div>
  );
}
