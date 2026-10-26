"use client";

// Раздел «Календарь»: что выходит из моих списков — серии сериалов
// и премьеры фильмов, по дням
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { PremieresResponse } from "@/app/api/premieres/route";
import { CompanyFilter, EmptyNote } from "@/components/ListParts";
import { dayLabel, startOfDay } from "@/lib/dates";
import {
  useCompanyFilter,
  useHydrated,
  useItems,
  useUpdates,
  type Item,
} from "@/lib/my-items";

interface CalendarEvent {
  key: string;
  item: Item;
  time: number;
  text: string;
}

const WHERE_LABELS = {
  russia: "премьера в кино",
  digital: "премьера онлайн",
  world: "мировая премьера",
} as const;

// Даты премьер фильмов, которые ещё не вышли (смотрим по году)
function usePremieres(items: Item[]): PremieresResponse | null {
  const [premieres, setPremieres] = useState<PremieresResponse | null>(null);
  const thisYear = new Date().getFullYear();
  const idsKey = items
    .filter(
      (item) =>
        !item.isSeries &&
        (item.status === "want" || item.status === "watching") &&
        (!item.year || item.year >= thisYear),
    )
    .map((item) => item.id)
    .sort((a, b) => a - b)
    .join(",");

  useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;
    fetch(`/api/premieres?ids=${idsKey}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setPremieres(data);
      })
      .catch(() => {
        // Нет связи — календарь покажет только серии
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  return premieres;
}

export function CalendarView() {
  const all = useItems();
  const updates = useUpdates(all);
  const premieres = usePremieres(all);
  const items = useCompanyFilter(all);
  const hydrated = useHydrated();

  const events: CalendarEvent[] = [];
  // Анонсированы, но дата пока неизвестна
  const undated: { item: Item; text: string }[] = [];

  for (const item of items) {
    if (item.status === "dropped") continue;
    const series = updates?.titles[item.id];
    for (const episode of series?.schedule ?? []) {
      events.push({
        key: `${item.id}-${episode.season}-${episode.episode}`,
        item,
        time: Date.parse(episode.airDate),
        text: `${episode.season} сезон, ${episode.episode} серия${
          episode.name ? ` · ${episode.name}` : ""
        }`,
      });
    }
    if (series?.upcoming && !series.upcoming.airDate && !series.schedule.length) {
      undated.push({
        item,
        text: `Анонсирован ${series.upcoming.season} сезон`,
      });
    }
    const premiere = premieres?.titles[item.id];
    if (premiere) {
      events.push({
        key: `${item.id}-premiere`,
        item,
        time: Date.parse(premiere.date),
        text: WHERE_LABELS[premiere.where],
      });
    }
  }

  // Время ответа сервера: событий без ответа всё равно нет
  const now = updates?.now ?? premieres?.now ?? 0;
  const today = startOfDay(now);
  const upcoming = events
    .filter((event) => event.time >= today)
    .sort((a, b) => a.time - b.time);
  const recent = events
    .filter((event) => event.time < today)
    .sort((a, b) => b.time - a.time);

  // Группы по дням: «Сегодня», «Завтра», «пт, 31 октября»
  const days = new Map<number, CalendarEvent[]>();
  for (const event of upcoming) {
    const day = startOfDay(event.time);
    days.set(day, [...(days.get(day) ?? []), event]);
  }

  const loading = hydrated && !updates && !premieres && items.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Календарь</h1>
          <p className="text-sm text-white/50">
            Новые серии ваших сериалов и премьеры фильмов из ваших списков
          </p>
        </div>
        <CompanyFilter />
      </div>

      {!hydrated ? null : loading ? (
        <EmptyNote>Загружаем расписание…</EmptyNote>
      ) : upcoming.length + recent.length + undated.length === 0 ? (
        <EmptyNote>
          В ближайшие два месяца ничего не выходит. Добавьте сериалы и
          ожидаемые фильмы в списки — и здесь появятся даты.
        </EmptyNote>
      ) : (
        <>
          {[...days].map(([day, dayEvents]) => (
            <section key={day} className="flex flex-col gap-2">
              <h2 className="font-semibold text-amber-400 first-letter:uppercase">
                {dayLabel(day, now)}
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {dayEvents.map((event) => (
                  <EventRow key={event.key} event={event} />
                ))}
              </ul>
            </section>
          ))}

          {undated.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="font-semibold text-white/60">
                Дата пока неизвестна
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {undated.map(({ item, text }) => (
                  <EventRow
                    key={item.id}
                    event={{ key: "", item, time: 0, text }}
                  />
                ))}
              </ul>
            </section>
          )}

          {recent.length > 0 && (
            <details className="rounded-xl border border-white/10 open:bg-white/5">
              <summary className="px-4 py-3 font-semibold text-white/60">
                Вышло за неделю{" "}
                <span className="font-normal text-white/40">
                  {recent.length}
                </span>
              </summary>
              <ul className="grid gap-2 px-3 pb-3 sm:grid-cols-2">
                {recent.map((event) => (
                  <EventRow
                    key={event.key}
                    event={event}
                    day={dayLabel(event.time, now)}
                  />
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function EventRow({ event, day }: { event: CalendarEvent; day?: string }) {
  const { item } = event;
  return (
    <li>
      <Link
        href={`/title/${item.id}`}
        className="flex items-center gap-3 rounded-xl border border-white/10 p-2.5 transition hover:border-white/25"
      >
        <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded bg-white/5">
          {item.posterUrl && (
            <Image
              src={item.posterUrl}
              alt=""
              fill
              sizes="32px"
              className="object-cover"
            />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">{item.name}</span>
          <span className="truncate text-sm text-white/55">{event.text}</span>
        </div>
        {day && (
          <span className="shrink-0 text-sm text-white/45 first-letter:uppercase">
            {day}
          </span>
        )}
      </Link>
    </li>
  );
}
