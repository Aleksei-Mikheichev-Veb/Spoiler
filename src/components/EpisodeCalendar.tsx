"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { ScheduledEpisode, UpdatesResponse } from "@/app/api/updates/route";
import { DAY, dayLabel, startOfDay } from "@/lib/dates";
import type { TitleInfo } from "@/lib/progress";

interface SeriesRow {
  title: TitleInfo;
  // Серии по дате: вышедшие за неделю и ближайшие
  episodes: (ScheduledEpisode & { time: number })[];
  // Главная серия строки: ближайшая будущая, а если таких нет — последняя вышедшая
  main: ScheduledEpisode & { time: number };
}

// Сколько сериалов показывать сразу — чтобы раздел не занимал весь экран
const VISIBLE_SERIES = 3;

// Короткий календарь серий для главной: по строке на сериал с ближайшей
// серией, остальные серии — раскрываются
export function EpisodeCalendar({
  titles,
  updates,
  action,
}: {
  titles: TitleInfo[];
  updates: UpdatesResponse | null;
  // Ссылка справа от заголовка, например «Весь календарь →»
  action?: React.ReactNode;
}) {
  const [showAll, setShowAll] = useState(false);
  if (!updates) return null;

  // Серия «вышла», если её день уже наступил
  const tomorrow = startOfDay(updates.now) + DAY;
  const rows: SeriesRow[] = titles
    .map((title) => {
      const episodes = (updates.titles[title.id]?.schedule ?? [])
        .map((episode) => ({ ...episode, time: Date.parse(episode.airDate) }))
        .sort((a, b) => a.time - b.time);
      const next = episodes.find((episode) => episode.time >= tomorrow);
      return { title, episodes, main: next ?? episodes.at(-1)! };
    })
    .filter((row) => row.episodes.length > 0)
    // Сначала то, что выходит раньше всего
    .sort((a, b) => {
      const aNext = a.main.time >= tomorrow;
      const bNext = b.main.time >= tomorrow;
      if (aNext !== bNext) return aNext ? -1 : 1;
      return aNext ? a.main.time - b.main.time : b.main.time - a.main.time;
    });
  if (rows.length === 0) return null;

  const visible = showAll ? rows : rows.slice(0, VISIBLE_SERIES);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold">Ближайшие серии</h2>
        {action}
      </div>
      <ul className="flex flex-col gap-1.5">
        {visible.map((row) => (
          <CalendarRow
            key={row.title.id}
            row={row}
            now={updates.now}
            tomorrow={tomorrow}
          />
        ))}
      </ul>
      {rows.length > VISIBLE_SERIES && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="self-start text-sm text-white/50 underline-offset-4 hover:text-white hover:underline"
        >
          {showAll ? "Свернуть" : `Показать все (${rows.length})`}
        </button>
      )}
    </section>
  );
}

function CalendarRow({
  row,
  now,
  tomorrow,
}: {
  row: SeriesRow;
  now: number;
  tomorrow: number;
}) {
  const [open, setOpen] = useState(false);
  const { title, main } = row;
  const others = row.episodes.filter((episode) => episode !== main);
  const status = (time: number) => (time >= tomorrow ? "" : " · вышла");

  return (
    <li className="rounded-xl border border-white/10">
      <div className="flex items-center gap-3 p-2.5">
        <Link
          href={`/title/${title.id}`}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded bg-white/5">
            {title.posterUrl && (
              <Image
                src={title.posterUrl}
                alt=""
                fill
                sizes="32px"
                className="object-cover"
              />
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-semibold">{title.name}</span>
            <span className="truncate text-sm text-white/55">
              {main.season} сезон, {main.episode} серия
            </span>
          </div>
        </Link>
        <span className="shrink-0 text-right text-sm font-semibold text-amber-400 first-letter:uppercase">
          {dayLabel(main.time, now)}
          {main.time < tomorrow && (
            <span className="block text-xs font-normal text-white/40">вышла</span>
          )}
        </span>
      </div>

      {others.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            className="w-full border-t border-white/10 px-3 py-1.5 text-left text-xs text-white/45 hover:text-white"
          >
            {open ? "Скрыть" : `+ ещё ${others.length}`}
          </button>
          {open && (
            <ul className="flex flex-col gap-1 px-3 pb-2.5">
              {others.map((episode) => (
                <li
                  key={`${episode.season}-${episode.episode}`}
                  className="flex justify-between gap-3 text-sm"
                >
                  <span className="truncate text-white/70">
                    {episode.season} сезон, {episode.episode} серия ·{" "}
                    {episode.name}
                  </span>
                  <span className="shrink-0 text-white/45 first-letter:uppercase">
                    {dayLabel(episode.time, now)}
                    {status(episode.time)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </li>
  );
}
