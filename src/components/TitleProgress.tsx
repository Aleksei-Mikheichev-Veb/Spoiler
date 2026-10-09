"use client";

import { TimeForm } from "@/components/TimeForm";
import {
  removeProgress,
  saveProgress,
  useProgress,
  type TitleInfo,
} from "@/lib/progress";

// Плашка «Вы остановились…» вверху карточки
export function TitleProgress({ title }: { title: TitleInfo }) {
  const progress = useProgress(title.id);
  const hasEpisode = Boolean(progress?.season && progress?.episode);

  if (title.isSeries && !hasEpisode) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 p-4 text-white/60">
        Отметьте ниже серию, на которой вы остановились, — мы запомним её.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
      {hasEpisode && progress ? (
        <p>
          Вы остановились:{" "}
          <span className="font-semibold">
            сезон {progress.season}, серия {progress.episode}
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
        key={`${progress?.season}-${progress?.episode}`}
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
      {progress && (
        <button
          type="button"
          onClick={() => removeProgress(title.id)}
          className="self-start text-sm text-white/40 underline-offset-4 hover:text-white/70 hover:underline"
        >
          Сбросить метку
        </button>
      )}
    </div>
  );
}
