"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { UpdatesResponse } from "@/app/api/updates/route";
import {
  describeNewEpisodes,
  describeUpcoming,
  isAfter,
  type EpisodeKey,
} from "@/lib/episodes";
import {
  addCompany,
  moveToQueue,
  removeFromLibrary,
  removeCompany,
  renameCompany,
  reorderQueue,
  useCompanies,
  useLibrary,
  type Status,
} from "@/lib/library";
import { EpisodeCalendar } from "@/components/EpisodeCalendar";
import { ratingColor } from "@/components/RatingControl";
import { onTab, type HomeTab } from "@/lib/home-tab";
import { createLocalStore } from "@/lib/local-store";
import {
  describeProgress,
  removeProgress,
  useAllProgress,
  type Progress,
  type TitleInfo,
} from "@/lib/progress";

// Фильм или сериал из списков и меток — в одном виде
interface Item extends TitleInfo {
  status: Status;
  companies: string[];
  summary?: string;
  order: number;
  rating?: number;
  progress?: Progress;
}

type Kind = "all" | "movie" | "series";

// Выбранные вкладки запоминаем, чтобы при возврате на главную они остались
const filtersStore = createLocalStore<{ company: string; kind: Kind }>(
  "spoiler:home-filters",
  { company: "all", kind: "all" },
);

// Какие разделы свёрнуты или раскрыты вопреки умолчанию — тоже запоминаем
const foldStore = createLocalStore<Record<string, boolean>>(
  "spoiler:home-folds",
  {},
);

function useFold(id: string, defaultOpen: boolean) {
  const open = foldStore.use()[id] ?? defaultOpen;
  function setOpen(value: boolean) {
    if (value === open) return;
    foldStore.set({ ...foldStore.get(), [id]: value });
  }
  return [open, setOpen] as const;
}

function useItems(): Item[] {
  const library = useLibrary();
  const progressList = useAllProgress();
  const progressById = new Map(progressList.map((p) => [p.id, p]));
  const items = new Map<number, Item>();

  for (const entry of Object.values(library)) {
    const progress = progressById.get(entry.id);
    items.set(entry.id, {
      ...entry,
      // Статус — как выбрал человек. Метка сама переводит в «Смотрю»
      // (markAsWatching), а «В очередь» может отложить начатый сериал
      status: entry.status,
      progress,
    });
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
function useUpdates(items: Item[]): UpdatesResponse | null {
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
        // Нет связи — просто не покажем «Вышло новое»
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  return updates;
}

// Вкладка «Списки» на телефоне: какой список открыт
type ListTab = "queue" | "done" | "dropped";
const listTabStore = createLocalStore<ListTab>("spoiler:home-list", "queue");

const subscribeNothing = () => () => {};

// Большое приветствие с поиском. На телефоне показываем его только
// новичкам с пустыми списками — остальным оно занимает весь экран
export function HomeHero({
  tab,
  children,
}: {
  tab: HomeTab;
  children: React.ReactNode;
}) {
  const hasItems = useItems().length > 0;
  // Пока браузер не прочитал списки, не знаем, пустые ли они
  const hydrated = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  const showOnPhone = tab === "now" && hydrated && !hasItems;
  return (
    <div className={showOnPhone ? "contents" : "hidden sm:contents"}>
      {children}
    </div>
  );
}

// Мои списки на главной. На телефоне разложены по вкладкам
// нижней панели, на компьютере — всё одной страницей
export function Library({ tab }: { tab: HomeTab }) {
  const allItems = useItems();
  const updates = useUpdates(allItems);
  const filters = filtersStore.use();
  const listTab = listTabStore.use();

  if (allItems.length === 0) {
    return tab === "lists" ? (
      <p className="text-white/50 sm:hidden">
        Здесь пока пусто. Найдите фильм или сериал во вкладке «Поиск» и нажмите
        «В мои списки».
      </p>
    ) : null;
  }

  const items = allItems.filter(
    (item) =>
      (filters.company === "all" || item.companies.includes(filters.company)) &&
      (filters.kind === "all" || (filters.kind === "series") === item.isSeries),
  );

  const fresh: { item: Item; text: string }[] = [];
  const continuing: { item: Item; text: string }[] = [];
  const waiting: { item: Item; text: string }[] = [];

  for (const item of items.filter((i) => i.status === "watching")) {
    const progress = item.progress;
    if (
      item.isSeries &&
      progress?.watched &&
      progress.season &&
      progress.episode
    ) {
      const mark: EpisodeKey = [progress.season, progress.episode];
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

  const queue = items
    .filter((item) => item.status === "want")
    .sort((a, b) => a.order - b.order);
  // Просмотренное — сначала с высокой оценкой, без оценки — в конце
  const done = items
    .filter((item) => item.status === "done")
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const dropped = items.filter((item) => item.status === "dropped");

  // Порядок меняем во всей очереди, даже если сейчас видна только её часть
  function handleQueueDrag(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fullQueue = allItems
      .filter((item) => item.status === "want")
      .sort((a, b) => a.order - b.order)
      .map((item) => item.id);
    reorderQueue(
      arrayMove(
        fullQueue,
        fullQueue.indexOf(Number(active.id)),
        fullQueue.indexOf(Number(over.id)),
      ),
    );
  }

  const isEmpty =
    fresh.length +
      continuing.length +
      waiting.length +
      queue.length +
      done.length +
      dropped.length ===
    0;

  // Блок списка: на телефоне виден только на вкладке «Списки»
  // и только когда выбран именно он
  const onList = (list: ListTab) =>
    tab === "lists" && listTab === list ? "contents" : "hidden sm:contents";
  const listCounts: Record<ListTab, number> = {
    queue: queue.length,
    done: done.length,
    dropped: dropped.length,
  };
  const nowEmpty = fresh.length + continuing.length + waiting.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <div className={onTab(tab, "now", "lists")}>
        <Filters />
      </div>

      {isEmpty && tab !== "more" && (
        <p className="text-white/50">
          Здесь пока пусто. Найдите фильм или сериал и нажмите «В мои списки».
        </p>
      )}

      {tab === "now" && !isEmpty && nowEmpty && (
        <p className="text-white/50 sm:hidden">
          Сейчас ничего не смотрите. Выберите что-нибудь во вкладке «Списки» или
          найдите новое в «Поиске».
        </p>
      )}

      {tab === "lists" && !isEmpty && (
        <div className="flex flex-col gap-3 sm:hidden">
          <div
            role="tablist"
            aria-label="Список"
            className="flex rounded-xl border border-white/10 p-1"
          >
            {(
              [
                ["queue", "Очередь"],
                ["done", "Просмотрено"],
                ["dropped", "Бросил"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={listTab === id}
                onClick={() => listTabStore.set(id)}
                className={`flex-1 rounded-lg px-2 py-2 text-sm transition ${
                  listTab === id
                    ? "bg-amber-400 font-semibold text-black"
                    : "text-white/60"
                }`}
              >
                {label}{" "}
                <span
                  className={listTab === id ? "font-normal" : "text-white/35"}
                >
                  {listCounts[id]}
                </span>
              </button>
            ))}
          </div>
          {listCounts[listTab] === 0 && (
            <p className="text-white/50">
              {listTab === "queue"
                ? "Очередь пуста. Найдите, что посмотреть, и нажмите «В мои списки»."
                : listTab === "done"
                  ? "Пока ничего не отмечено как просмотренное."
                  : "Брошенных нет — и хорошо."}
            </p>
          )}
        </div>
      )}

      <div className={onTab(tab, "now")}>
        {fresh.length > 0 && (
          <Section title="Вышло новое">
            {fresh.map(({ item, text }) => (
              <Card key={item.id} item={item} subtitle={text} highlight />
            ))}
          </Section>
        )}
        <EpisodeCalendar
          titles={items.filter(
            (item) => item.isSeries && item.status !== "dropped",
          )}
          updates={updates}
        />
        {continuing.length > 0 && (
          <Section title="Смотрю">
            {continuing.map(({ item, text }) => (
              <Card
                key={item.id}
                item={item}
                subtitle={text}
                action={
                  // Начал, но сейчас не смотрит — отложить в очередь, метка останется
                  <button
                    type="button"
                    onClick={() => moveToQueue(item, item.summary)}
                    title="Отложить в очередь — метка сохранится"
                    className="shrink-0 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-white/60 transition hover:border-amber-400/60 hover:text-white"
                  >
                    В очередь
                  </button>
                }
              />
            ))}
          </Section>
        )}
      </div>
      <div className={onList("queue")}>
        {queue.length > 0 && (
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-bold">Очередь</h2>
              <p className="text-sm text-white/45">
                Порядок меняется перетаскиванием за ⠿
              </p>
            </div>
            {/* Фильмы и сериалы — отдельными очередями */}
            {(
              [
                ["Фильмы", queue.filter((item) => !item.isSeries)],
                ["Сериалы", queue.filter((item) => item.isSeries)],
              ] as const
            ).map(
              ([label, group]) =>
                group.length > 0 && (
                  <div key={label} className="flex flex-col gap-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-white/40">
                      {label}{" "}
                      <span className="font-normal">{group.length}</span>
                    </h3>
                    <QueueList items={[...group]} onDragEnd={handleQueueDrag} />
                  </div>
                ),
            )}
          </section>
        )}
      </div>
      <div className={onTab(tab, "now")}>
        {waiting.length > 0 && (
          <Section title="Ждём продолжения">
            {waiting.map(({ item, text }) => (
              <Card key={item.id} item={item} subtitle={text} muted />
            ))}
          </Section>
        )}
      </div>
      <div className={onList("done")}>
        {done.length > 0 && (
          <Collapsible
            id="done"
            title="Просмотрено"
            count={done.length}
            defaultOpen
          >
            {/* Фильмы и сериалы отдельно, в каждом — лучшие оценки сверху.
              Каждую группу можно свернуть, чтобы не листать длинный список */}
            {(
              [
                [
                  "done-movies",
                  "Фильмы",
                  done.filter((item) => !item.isSeries),
                ],
                [
                  "done-series",
                  "Сериалы",
                  done.filter((item) => item.isSeries),
                ],
              ] as const
            ).map(
              ([id, label, group]) =>
                group.length > 0 && (
                  <li key={id} className="sm:col-span-2">
                    <FoldGroup id={id} label={label} count={group.length}>
                      {group.map((item) => (
                        <Card
                          key={item.id}
                          item={item}
                          subtitle={lengthOnly(item.summary)}
                          muted
                        />
                      ))}
                    </FoldGroup>
                  </li>
                ),
            )}
          </Collapsible>
        )}
      </div>
      <div className={onList("dropped")}>
        {dropped.length > 0 && (
          <Collapsible id="dropped" title="Бросил" count={dropped.length}>
            {dropped.map((item) => (
              <Card
                key={item.id}
                item={item}
                subtitle={lengthOnly(item.summary)}
                muted
              />
            ))}
          </Collapsible>
        )}
      </div>
    </div>
  );
}

function Filters() {
  const filters = filtersStore.use();
  const companies = useCompanies();
  const [editing, setEditing] = useState(false);
  const set = (change: Partial<typeof filters>) =>
    filtersStore.set({ ...filters, ...change });

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-2xl font-bold">Мои списки</h2>
      <div className="flex flex-wrap items-center gap-1.5">
        <Tab
          active={filters.company === "all"}
          onClick={() => set({ company: "all" })}
        >
          Все
        </Tab>
        {companies.map((company) =>
          editing ? (
            <span
              key={company.id}
              className="flex items-center rounded-full border border-amber-400/50 bg-white/5"
            >
              <input
                defaultValue={company.name}
                aria-label="Название компании"
                onBlur={(event) => {
                  const name = event.target.value.trim();
                  if (name) renameCompany(company.id, name);
                }}
                className="w-28 bg-transparent py-1.5 pl-3 text-base outline-none sm:text-sm"
              />
              {companies.length > 1 && (
                <button
                  type="button"
                  // Не даём полю ввода потерять фокус при нажатии: иначе оно
                  // сохраняет название, список перерисовывается и нажатие теряется
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    removeCompany(company.id);
                    if (filters.company === company.id) set({ company: "all" });
                  }}
                  aria-label={`Удалить «${company.name}»`}
                  className="px-3 py-1.5 text-base text-white/50 transition hover:text-red-400"
                >
                  ✕
                </button>
              )}
            </span>
          ) : (
            <Tab
              key={company.id}
              active={filters.company === company.id}
              onClick={() => set({ company: company.id })}
            >
              {company.name}
            </Tab>
          ),
        )}
        {editing ? (
          <button
            type="button"
            onClick={() => addCompany("Новая компания")}
            className="rounded-full border border-dashed border-white/25 px-3 py-1.5 text-sm text-white/60 hover:text-white"
          >
            + Добавить
          </button>
        ) : (
          <AddCompany />
        )}
        <button
          type="button"
          onClick={() => setEditing(!editing)}
          className="px-2 text-sm text-white/40 underline-offset-4 hover:text-white/70 hover:underline"
        >
          {editing ? "Готово" : "Изменить"}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["all", "Фильмы и сериалы"],
            ["movie", "Фильмы"],
            ["series", "Сериалы"],
          ] as const
        ).map(([kind, label]) => (
          <Tab
            key={kind}
            small
            active={filters.kind === kind}
            onClick={() => set({ kind })}
          >
            {label}
          </Tab>
        ))}
      </div>
    </div>
  );
}

// Кнопка «+»: по нажатию раскрывается в поле для названия новой компании
function AddCompany() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  function close() {
    setOpen(false);
    setName("");
  }

  function submit() {
    const trimmed = name.trim();
    if (trimmed) addCompany(trimmed);
    close();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Добавить компанию"
        title="Добавить компанию"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-white/25 text-lg leading-none text-white/60 transition hover:border-white/50 hover:text-white"
      >
        +
      </button>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex animate-pop-in items-center rounded-full border border-amber-400/50 bg-white/5"
    >
      <input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
        // Нажали мимо поля и ничего не ввели — сворачиваем обратно в «+»
        onBlur={() => {
          if (!name.trim()) close();
        }}
        placeholder="Например, С друзьями"
        aria-label="Название новой компании"
        className="w-40 bg-transparent py-1.5 pl-3 text-base outline-none placeholder:text-white/30 sm:text-sm"
      />
      <button
        type="submit"
        disabled={!name.trim()}
        className="rounded-full px-3 py-1.5 text-sm font-semibold text-amber-400 transition hover:text-amber-300 disabled:text-white/25"
      >
        Добавить
      </button>
    </form>
  );
}

function Tab({
  active,
  onClick,
  small = false,
  children,
}: {
  active: boolean;
  onClick: () => void;
  small?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full transition ${small ? "px-3 py-1 text-xs" : "px-3.5 py-1.5 text-sm"} ${
        active
          ? "bg-amber-400 font-semibold text-black"
          : "border border-white/15 text-white/70 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function QueueList({
  items,
  onDragEnd,
}: {
  items: Item[];
  onDragEnd: (event: DragEndEvent) => void;
}) {
  const sensors = useSensors(
    // Мышь: тянуть после небольшого сдвига, чтобы не мешать кликам
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // Телефон: нажать и подержать, иначе страница не будет прокручиваться
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <ol className="flex flex-col gap-2">
          {items.map((item, index) => (
            <SortableCard key={item.id} item={item} position={index + 1} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableCard({ item, position }: { item: Item; position: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-xl border bg-background p-2 pr-3 ${
        isDragging
          ? "relative z-10 border-amber-400/60 shadow-2xl"
          : "border-white/10"
      }`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Перетащить «${item.name}»`}
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab touch-none rounded-md px-2 py-3 text-lg text-white/35 hover:text-white/70 active:cursor-grabbing"
      >
        ⠿
      </button>
      <span className="w-5 shrink-0 text-sm text-white/35">{position}</span>
      <CardBody
        item={item}
        // Начатый, но отложенный — показываем, откуда продолжать
        subtitle={
          item.progress
            ? `Продолжить: ${describeProgress(item.progress) || "метка без времени"}`
            : lengthOnly(item.summary)
        }
        accent={Boolean(item.progress)}
      />
      <RemoveButton item={item} />
    </li>
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

function Collapsible({
  id,
  title,
  count,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useFold(id, defaultOpen);
  return (
    <details
      className="group"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="text-xl font-bold">
        {title} <span className="font-normal text-white/40">{count}</span>
      </summary>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">{children}</ul>
    </details>
  );
}

// Подгруппа внутри раздела («Фильмы», «Сериалы»), сворачивается по нажатию
function FoldGroup({
  id,
  label,
  count,
  children,
}: {
  id: string;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useFold(id, true);
  return (
    <details
      className="group/fold"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="flex w-fit list-none items-center gap-2 py-1 [&::-webkit-details-marker]:hiddentext-sm font-semibold uppercase tracking-wide text-white/40 transition hover:text-white/70">
        <span className="inline-block transition-transform group-open/fold:rotate-90">
          ›
        </span>
        {label} <span className="font-normal">{count}</span>
        {!open && (
          <span className="font-normal normal-case tracking-normal">
            · показать
          </span>
        )}
      </summary>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">{children}</ul>
    </details>
  );
}

function Card({
  item,
  subtitle,
  highlight = false,
  muted = false,
  action,
}: {
  item: Item;
  subtitle: string;
  highlight?: boolean;
  // Серая подпись вместо жёлтой — для того, что не «смотрю прямо сейчас»
  muted?: boolean;
  // Дополнительная кнопка справа, например «В очередь»
  action?: React.ReactNode;
}) {
  return (
    <li
      className={`flex items-center gap-3 rounded-xl border p-3 ${
        highlight ? "border-amber-400/50 bg-amber-400/5" : "border-white/10"
      }`}
    >
      <CardBody item={item} subtitle={subtitle} accent={!muted} />
      {action}
      <RemoveButton item={item} />
    </li>
  );
}

function CardBody({
  item,
  subtitle,
  accent = false,
}: {
  item: Item;
  subtitle: string;
  accent?: boolean;
}) {
  return (
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
        <span className="text-xs uppercase tracking-wide text-white/35">
          {item.isSeries ? "сериал" : "фильм"}
          {item.rating ? (
            <span
              className={`ml-2 font-bold normal-case tracking-normal ${ratingColor(item.rating)}`}
            >
              ★ {item.rating}
            </span>
          ) : null}
        </span>
        {subtitle && (
          <span
            className={`truncate text-sm ${accent ? "text-amber-400" : "text-white/50"}`}
          >
            {subtitle}
          </span>
        )}
      </div>
    </Link>
  );
}

function RemoveButton({ item }: { item: Item }) {
  return (
    <button
      type="button"
      onClick={() => {
        removeFromLibrary(item.id);
        removeProgress(item.id);
      }}
      aria-label={`Убрать «${item.name}» из списков`}
      className="shrink-0 rounded-md px-2 py-1 text-white/30 transition hover:text-white/70"
    >
      ✕
    </button>
  );
}

// «Сериал · 4 сезона · серия ~52 мин» → «4 сезона · серия ~52 мин»:
// тип уже подписан на карточке отдельно
function lengthOnly(summary?: string): string {
  return (summary ?? "").replace(/^(Сериал|Фильм)( · )?/, "");
}
