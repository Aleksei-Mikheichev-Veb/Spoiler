"use client";

import { useState } from "react";
import { setRating, useLibraryEntry } from "@/lib/library";
import type { TitleInfo } from "@/lib/progress";

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Цвет оценки как на Кинопоиске: плохо — красный, средне — серый, хорошо — зелёный
export function ratingColor(rating: number): string {
  if (rating >= 7) return "text-emerald-400";
  if (rating >= 5) return "text-white/70";
  return "text-red-400";
}

// «Ваша оценка» на карточке фильма или сериала
export function RatingControl({
  title,
  summary,
}: {
  title: TitleInfo;
  summary: string;
}) {
  const entry = useLibraryEntry(title.id);
  const rating = entry?.rating;
  // Подсветка при наведении — чтобы было видно, какую оценку поставишь
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered ?? rating;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2 text-sm">
        <span className="text-white/50">Ваша оценка:</span>
        {rating ? (
          <>
            <span className={`text-lg font-bold ${ratingColor(rating)}`}>
              {rating}
            </span>
            <button
              type="button"
              onClick={() => setRating(title, summary, undefined)}
              className="text-xs text-white/40 underline-offset-4 hover:text-white/70 hover:underline"
            >
              убрать
            </button>
          </>
        ) : (
          <span className="text-white/40">ещё не оценено</span>
        )}
      </div>
      <div
        role="radiogroup"
        aria-label="Ваша оценка от 1 до 10"
        className="flex flex-wrap gap-1"
        onMouseLeave={() => setHovered(null)}
      >
        {SCORES.map((score) => {
          const active = shown !== undefined && score <= shown;
          return (
            <button
              key={score}
              type="button"
              role="radio"
              aria-checked={rating === score}
              aria-label={`Оценка ${score}`}
              onMouseEnter={() => setHovered(score)}
              onFocus={() => setHovered(score)}
              onBlur={() => setHovered(null)}
              // Повторное нажатие на ту же оценку убирает её
              onClick={() =>
                setRating(title, summary, rating === score ? undefined : score)
              }
              className={`h-8 w-8 rounded-lg text-sm font-semibold transition ${
                active
                  ? "bg-amber-400 text-black"
                  : "border border-white/15 text-white/50 hover:text-white"
              }`}
            >
              {score}
            </button>
          );
        })}
      </div>
    </div>
  );
}
