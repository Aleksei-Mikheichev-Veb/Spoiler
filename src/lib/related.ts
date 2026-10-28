// Связанные фильмы и сериалы: продолжения, предыстории и спин-оффы.
// Ремейки (та же история, снятая в другой стране) не показываем.
// Основа — Кинопоиск, поверх — ручные правки из related-fixes.ts
import "server-only";
import { getTitle, type Title, type TitleType } from "@/lib/poiskkino";
import { extraGroups, hiddenLinks, relatedNotes } from "@/lib/related-fixes";

export interface RelatedItem {
  id: number;
  name: string;
  year?: number;
  type: TitleType;
  posterUrl?: string;
  note?: string;
  // Тайтл, на странице которого мы сейчас
  current: boolean;
}

export async function getRelated(title: Title): Promise<RelatedItem[]> {
  const hidden = new Set(
    hiddenLinks.flatMap(([a, b]) =>
      a === title.id ? [b] : b === title.id ? [a] : [],
    ),
  );
  const items = new Map<number, RelatedItem>();
  for (const item of title.sequelsAndPrequels ?? []) {
    if (
      hidden.has(item.id) ||
      item.id === title.id ||
      item.relationType === "REMAKE"
    ) {
      continue;
    }
    items.set(item.id, {
      id: item.id,
      name: item.name || item.alternativeName || "Без названия",
      year: item.year,
      type: item.type,
      posterUrl: item.poster?.previewUrl,
      current: false,
    });
  }

  // Ручных связей единицы, а ответы кешируются на сутки — лишние
  // запросы к ПоискКино почти ничего не стоят
  const extraIds = extraGroups
    .filter((group) => group.includes(title.id))
    .flat()
    .filter((id) => id !== title.id && !items.has(id) && !hidden.has(id));
  const extras = await Promise.all(
    [...new Set(extraIds)].map((id) => getTitle(id).catch(() => null)),
  );
  for (const extra of extras) {
    if (!extra) continue;
    items.set(extra.id, {
      id: extra.id,
      name: extra.name || extra.alternativeName || "Без названия",
      year: extra.year,
      type: extra.type,
      posterUrl: extra.poster?.previewUrl,
      current: false,
    });
  }
  if (items.size === 0) return [];

  items.set(title.id, {
    id: title.id,
    name: title.name || title.alternativeName || "Без названия",
    year: title.year,
    type: title.type,
    posterUrl: title.poster?.previewUrl,
    current: true,
  });
  // По году выхода
  return [...items.values()]
    .map((item) => ({ ...item, note: relatedNotes[item.id]?.note }))
    .sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
}
