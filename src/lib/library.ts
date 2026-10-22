// Мои списки: что хочу посмотреть, что смотрю, что посмотрел — и с кем.
// Пока хранятся в браузере, как и метки.
// Используется только из клиентских компонентов.
import { createLocalStore } from "@/lib/local-store";
import type { TitleInfo } from "@/lib/progress";

export type Status = "want" | "watching" | "done" | "dropped";

export const STATUS_LABELS: Record<Status, string> = {
  want: "Хочу посмотреть",
  watching: "Смотрю",
  done: "Просмотрено",
  dropped: "Бросил",
};

export interface Company {
  id: string;
  name: string;
}

// «С кем смотрю». Названия можно поменять, можно добавить свои
const DEFAULT_COMPANIES: Company[] = [
  { id: "me", name: "Я" },
  { id: "couple", name: "Вдвоём" },
  { id: "family", name: "Всей семьёй" },
];

export interface LibraryEntry extends TitleInfo {
  status: Status;
  companies: string[];
  // «Фильм · 2 ч 46 мин» или «Сериал · 3 сезона · серия ~50 мин»
  summary?: string;
  // Место в очереди «Хочу посмотреть»: меньше — раньше
  order: number;
  // Моя оценка от 1 до 10
  rating?: number;
  updatedAt: number;
}

const entriesStore = createLocalStore<Record<string, LibraryEntry>>(
  "spoiler:library",
  {},
);
const companiesStore = createLocalStore<Company[]>(
  "spoiler:companies",
  DEFAULT_COMPANIES,
);

export function useLibrary(): Record<string, LibraryEntry> {
  return entriesStore.use();
}

export function useLibraryEntry(titleId: number): LibraryEntry | undefined {
  return entriesStore.use()[titleId];
}

export function useCompanies(): Company[] {
  return companiesStore.use();
}

function update(titleId: number, change: Partial<LibraryEntry>) {
  const entries = entriesStore.get();
  const current = entries[titleId];
  if (!current) return;
  entriesStore.set({
    ...entries,
    [titleId]: { ...current, ...change, updatedAt: Date.now() },
  });
}

export function addToLibrary(
  title: TitleInfo,
  status: Status,
  summary?: string,
) {
  const entries = entriesStore.get();
  // Новое в очереди — в конец
  const lastOrder = Math.max(0, ...Object.values(entries).map((e) => e.order));
  entriesStore.set({
    ...entries,
    [title.id]: {
      ...title,
      status,
      summary,
      companies: ["me"],
      order: lastOrder + 1,
      updatedAt: Date.now(),
    },
  });
}

// Оценка значит «посмотрел»: чего нет в списках — попадает в «Просмотрено»,
// из «Хочу посмотреть» — переезжает туда же. undefined убирает оценку.
export function setRating(
  title: TitleInfo,
  summary: string,
  rating: number | undefined,
) {
  const current = entriesStore.get()[title.id];
  if (!current) {
    if (rating === undefined) return;
    addToLibrary(title, "done", summary);
  }
  const status = current?.status;
  update(title.id, {
    rating,
    ...(rating !== undefined && (!status || status === "want")
      ? { status: "done" as const }
      : {}),
  });
}

export function setStatus(titleId: number, status: Status) {
  update(titleId, { status });
}

export function toggleCompany(titleId: number, companyId: string) {
  const current = entriesStore.get()[titleId];
  if (!current) return;
  const has = current.companies.includes(companyId);
  // Хотя бы одна компания должна остаться
  if (has && current.companies.length === 1) return;
  update(titleId, {
    companies: has
      ? current.companies.filter((id) => id !== companyId)
      : [...current.companies, companyId],
  });
}

export function removeFromLibrary(titleId: number) {
  const entries = { ...entriesStore.get() };
  delete entries[titleId];
  entriesStore.set(entries);
}

// Новый порядок очереди: ids — все фильмы и сериалы очереди по порядку
export function reorderQueue(ids: number[]) {
  const entries = { ...entriesStore.get() };
  ids.forEach((id, index) => {
    if (entries[id]) entries[id] = { ...entries[id], order: index + 1 };
  });
  entriesStore.set(entries);
}

export function renameCompany(companyId: string, name: string) {
  companiesStore.set(
    companiesStore
      .get()
      .map((company) =>
        company.id === companyId ? { ...company, name } : company,
      ),
  );
}

export function addCompany(name: string) {
  companiesStore.set([
    ...companiesStore.get(),
    { id: `c${Date.now()}`, name },
  ]);
}

// Для резервной копии: всё содержимое списков и добавление из файла.
// Записи из файла заменяют записи тех же фильмов, остальные остаются.
export function getLibraryBackup() {
  return { library: entriesStore.get(), companies: companiesStore.get() };
}

export function mergeLibrary(
  imported: Record<string, LibraryEntry>,
  companies: Company[],
) {
  entriesStore.set({ ...entriesStore.get(), ...imported });
  const known = new Set(companiesStore.get().map((company) => company.id));
  companiesStore.set([
    ...companiesStore.get(),
    ...companies.filter((company) => !known.has(company.id)),
  ]);
}
