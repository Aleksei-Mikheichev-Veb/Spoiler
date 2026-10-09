"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { UpdatesResponse } from "@/app/api/updates/route";
import {
  describeNewEpisodes,
  describeUpcoming,
  isAfter,
  type EpisodeKey,
} from "@/lib/episodes";
import {
  describeProgress,
  removeProgress,
  useAllProgress,
  type Progress,
} from "@/lib/progress";

// Библиотека на главной: вышло новое, продолжить просмотр, ждём новый сезон
export function Library() {
  const items = useAllProgress();
  const [updates, setUpdates] = useState<UpdatesResponse | null>(null);

  // Новые серии проверяем только у досмотренных сериалов
  const idsKey = items
    .filter((item) => item.isSeries && item.watched)
    .map((item) => item.id)
    .join(",");

  useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;
    fetch(`/api/updates?ids=${idsKey}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setUpdates(data);
      })
      .catch(() => {
        // Нет связи — просто не покажем «Вышло новое»
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  const fresh: { item: Progress; text: string }[] = [];
  const continuing: Progress[] = [];
  const waiting: { item: Progress; text: string }[] = [];

  for (const item of items) {
    if (item.isSeries && item.watched && item.season && item.episode) {
      const mark: EpisodeKey = [item.season, item.episode];
      const info = updates?.titles[item.id];
      const newer = (info?.aired ?? []).filter((key) => isAfter(key, mark));
      if (newer.length > 0) {
        fresh.push({ item, text: describeNewEpisodes(newer, mark[0]) });
      } else {
        waiting.push({
          item,
          text: updates
            ? describeUpcoming(info?.upcoming, updates.now)
            : `Досмотрено до сезона ${mark[0]}, серии ${mark[1]}`,
        });
      }
    } else {
      continuing.push(item);
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-10">
      {fresh.length > 0 && (
        <Section title="Вышло новое">
          {fresh.map(({ item, text }) => (
            <Card key={item.id} item={item} subtitle={text} highlight />
          ))}
        </Section>
      )}
      {continuing.length > 0 && (
        <Section title="Продолжить просмотр">
          {continuing.map((item) => (
            <Card
              key={item.id}
              item={item}
              subtitle={describeProgress(item) || "Метка без времени"}
            />
          ))}
        </Section>
      )}
      {waiting.length > 0 && (
        <Section title="Ждём новый сезон">
          {waiting.map(({ item, text }) => (
            <Card key={item.id} item={item} subtitle={text} muted />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">{title}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">{children}</ul>
    </section>
  );
}

function Card({
  item,
  subtitle,
  highlight = false,
  muted = false,
}: {
  item: Progress;
  subtitle: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-3 rounded-xl border p-3 ${
        highlight ? "border-amber-400/50 bg-amber-400/5" : "border-white/10"
      } ${muted ? "opacity-70" : ""}`}
    >
      <Link
        href={`/title/${item.id}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-white/5">
          {item.posterUrl && (
            <Image
              src={item.posterUrl}
              alt=""
              fill
              sizes="44px"
              className="object-cover"
            />
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">
            {item.name}
            {item.year ? (
              <span className="font-normal text-white/40"> ({item.year})</span>
            ) : null}
          </span>
          <span
            className={`truncate text-sm ${
              muted ? "text-white/50" : "text-amber-400"
            }`}
          >
            {subtitle}
          </span>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => removeProgress(item.id)}
        aria-label={`Убрать «${item.name}» из списка`}
        className="shrink-0 rounded-md px-2 py-1 text-white/30 transition hover:text-white/70"
      >
        ✕
      </button>
    </li>
  );
}
