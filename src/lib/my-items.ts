// Мои фильмы и сериалы: списки и метки в одном виде, плюс новые серии.
// Используется только из клиентских компонентов.
import { useEffect, useState, useSyncExternalStore } from "react";
import type { UpdatesResponse } from "@/app/api/updates/route";
import {
  describeNewEpisodes,
  describeUpcoming,
  isAfter,
  type EpisodeKey,
} from "@/lib/episodes";
import { useLibrary, type Status } from "@/lib/library";
import { createLocalStore } from "@/lib/local-store";
import {
  describeProgress,
  useAllProgress,
  type Progress,
  type TitleInfo,
} from "@/lib/progress";

export interface Item extends TitleInfo {
  status: Status;
  companies: string[];
  summary?: string;
  order: number;
  rating?: number;
  progress?: Progress;
}

export interface ItemWithText {
  item: Item;
  text: string;
}

export function useItems(): Item[] {
  const library = useLibrary();
  const progressList = useAllProgress();
  const progressById = new Map(progressList.map((p) => [p.id, p]));
  const items = new Map<number, Item>();

  for (const entry of Object.values(library)) {
    // Статус — как выбрал человек. Метка сама переводит в «Смотрю»
    // (markAsWatching), а «В очередь» может отложить начатый сериал
    items.set(entry.id, { ...entry, progress: progressById.get(entry.id) });
  }
  // Метки, поставленные до появления списков, — это «Смотрю»
  for (const progress of progressList) {
    if (!items.has(progress.id)) {
      items.set(progress.id, {
        ...progress,
        status: "watching",
        companies: ["me"],
        order: 0,
        progress,
      });
    }
  }
  return [...items.values()];
}

// Новые серии и расписание — для всех сериалов, кроме брошенных
export function useUpdates(items: Item[]): UpdatesResponse | null {
  const [updates, setUpdates] = useState<UpdatesResponse | null>(null);
  const idsKey = items
    .filter((item) => item.isSeries && item.status !== "dropped")
    .map((item) => item.id)
    .sort((a, b) => a - b)
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
        // Нет связи — просто не покажем новые серии
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  return updates;
}

// Раскладка того, что сейчас смотрю:
// fresh — вышли новые серии, continuing — смотрю, waiting — ждём продолжения
export function splitWatching(items: Item[], updates: UpdatesResponse | null) {
  const fresh: ItemWithText[] = [];
  const continuing: ItemWithText[] = [];
  const waiting: ItemWithText[] = [];

  for (const item of items) {
    const progress = item.progress;
    const finished =
      item.isSeries && progress?.watched && progress.season && progress.episode;
    if (item.status === "done") {
      // Досмотренный сериал без анонса продолжения лежит в «Просмотрено».
      // Если потом вышли новые серии — показываем его и в «Вышло новое»
      if (!finished) continue;
      const mark: EpisodeKey = [progress.season!, progress.episode!];
      const newer = (updates?.titles[item.id]?.aired ?? []).filter((key) =>
        isAfter(key, mark),
      );
      if (newer.length > 0) {
        fresh.push({ item, text: describeNewEpisodes(newer, mark[0]) });
      }
      continue;
    }
    if (item.status !== "watching") continue;

    if (finished) {
      const mark: EpisodeKey = [progress.season!, progress.episode!];
      const info = updates?.titles[item.id];
      const newer = (info?.aired ?? []).filter((key) => isAfter(key, mark));
      if (newer.length > 0) {
        fresh.push({ item, text: describeNewEpisodes(newer, mark[0]) });
      } else {
        waiting.push({
          item,
          text: updates
            ? describeUpcoming(info?.upcoming, updates.now, mark[0])
            : `Досмотрено до сезона ${mark[0]}, серии ${mark[1]}`,
        });
      }
    } else {
      continuing.push({
        item,
        text: progress
          ? describeProgress(progress) || "Метка без времени"
          : "Отметьте, где остановились",
      });
    }
  }
  return { fresh, continuing, waiting };
}

// Выбранная компания («Все», «Я», «Вдвоём»…) — общая для всех разделов
export const companyFilterStore = createLocalStore<{ company: string }>(
  "spoiler:home-filters",
  { company: "all" },
);

export function useCompanyFilter(items: Item[]): Item[] {
  const { company } = companyFilterStore.use();
  return company === "all"
    ? items
    : items.filter((item) => item.companies.includes(company));
}

const subscribeNothing = () => () => {};

// false на сервере и при первой отрисовке, true — когда браузер уже
// прочитал списки. Нужно, чтобы не мигали блоки «для новичков»
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
}
