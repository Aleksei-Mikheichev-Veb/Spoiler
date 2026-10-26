// Мои списки: что хочу посмотреть, что смотрю, что посмотрел — и с кем.
// Пока хранятся в браузере, как и метки.
// Используется только из клиентских компонентов.
import { createLocalStore } from "@/lib/local-store";
import { getProgressMap, type TitleInfo } from "@/lib/progress";

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

// Оценка значит «смотрел»: чего нет в списках и что было в «Хочу посмотреть»,
// попадает в «Просмотрено», а если стоит метка — в «Смотрю».
// Остальные статусы оценка не меняет. undefined убирает оценку.
export function setRating(
  title: TitleInfo,
  summary: string,
  rating: number | undefined,
) {
  const current = entriesStore.get()[title.id];
  // Есть метка серии или времени — значит, ещё смотрит, а не досмотрел
  const afterRating: Status = getProgressMap()[title.id] ? "watching" : "done";
  if (!current) {
    if (rating === undefined) return;
    addToLibrary(title, afterRating, summary);
  }
  const status = current?.status;
  update(title.id, {
    rating,
    ...(rating !== undefined && (!status || status === "want")
      ? { status: afterRating }
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

// Удаляет компанию «с кем смотрю» и снимает её со всех фильмов.
// Если у фильма не осталось ни одной компании — он возвращается к «Я».
// Последнюю компанию удалить нельзя.
export function removeCompany(companyId: string) {
  const companies = companiesStore.get();
  if (companies.length <= 1) return;
  const remaining = companies.filter((company) => company.id !== companyId);
  const fallback = remaining.some((c) => c.id === "me") ? "me" : remaining[0].id;
  const entries = { ...entriesStore.get() };
  for (const [id, entry] of Object.entries(entries)) {
    if (!entry.companies.includes(companyId)) continue;
    const left = entry.companies.filter((c) => c !== companyId);
    entries[id] = { ...entry, companies: left.length ? left : [fallback] };
  }
  entriesStore.set(entries);
  companiesStore.set(remaining);
}

// Поставил метку — значит, смотрит: сериал попадает в «Смотрю».
// Из «Хочу посмотреть», «Бросил» и «Просмотрено» переезжает туда же
// (в «Просмотрено» сериал мог попасть по оценке, поставленной до метки,
// или человек начал пересматривать).
export function markAsWatching(title: TitleInfo, summary?: string) {
  const current = entriesStore.get()[title.id];
  if (!current) {
    addToLibrary(title, "watching", summary);
  } else if (current.status !== "watching") {
    update(title.id, { status: "watching" });
  }
}

// Досмотрел последнюю серию, а продолжения не анонсировано — «Просмотрено»
export function markAsDone(title: TitleInfo, summary?: string) {
  const current = entriesStore.get()[title.id];
  if (!current) {
    addToLibrary(title, "done", summary);
  } else if (current.status !== "done") {
    update(title.id, { status: "done" });
  }
}

// «В очередь»: начатый, но отложенный сериал (или фильм) уходит в конец
// очереди «Хочу посмотреть». Метка серии при этом остаётся.
export function moveToQueue(title: TitleInfo, summary?: string) {
  const entries = entriesStore.get();
  const lastOrder = Math.max(0, ...Object.values(entries).map((e) => e.order));
  if (!entries[title.id]) {
    addToLibrary(title, "want", summary);
    return;
  }
  update(title.id, { status: "want", order: lastOrder + 1 });
}
