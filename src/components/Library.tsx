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
import { useEffect, useState } from "react";
import type { UpdatesResponse } from "@/app/api/updates/route";
import {
  describeNewEpisodes,
  describeUpcoming,
  isAfter,
  type EpisodeKey,
} from "@/lib/episodes";
import {
  addCompany,
  removeFromLibrary,
  renameCompany,
  reorderQueue,
  useCompanies,
  useLibrary,
  type Status,
} from "@/lib/library";
import { ratingColor } from "@/components/RatingControl";
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

function useItems(): Item[] {
  const library = useLibrary();
  const progressList = useAllProgress();
  const progressById = new Map(progressList.map((p) => [p.id, p]));
  const items = new Map<number, Item>();

  for (const entry of Object.values(library)) {
    const progress = progressById.get(entry.id);
    items.set(entry.id, {
      ...entry,
      // Поставил метку — значит, уже смотрит
      status: entry.status === "want" && progress ? "watching" : entry.status,
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

// Новые серии проверяем только у досмотренных сериалов
function useUpdates(items: Item[]): UpdatesResponse | null {
  const [updates, setUpdates] = useState<UpdatesResponse | null>(null);
  const idsKey = items
    .filter((item) => item.status === "watching" && item.progress?.watched)
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

  return updates;
}

// Мои списки на главной
export function Library() {
  const allItems = useItems();
  const updates = useUpdates(allItems);
  const filters = filtersStore.use();

  if (allItems.length === 0) return null;

  const items = allItems.filter(
    (item) =>
      (filters.company === "all" || item.companies.includes(filters.company)) &&
      (filters.kind === "all" ||
        (filters.kind === "series") === item.isSeries),
  );

  const fresh: { item: Item; text: string }[] = [];
  const continuing: { item: Item; text: string }[] = [];
  const waiting: { item: Item; text: string }[] = [];

  for (const item of items.filter((i) => i.status === "watching")) {
    const progress = item.progress;
    if (item.isSeries && progress?.watched && progress.season && progress.episode) {
      const mark: EpisodeKey = [progress.season, progress.episode];
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
    fresh.length + continuing.length + waiting.length + queue.length +
      done.length + dropped.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <Filters />

      {isEmpty && (
        <p className="text-white/50">
          Здесь пока пусто. Найдите фильм или сериал и нажмите «В мои списки».
        </p>
      )}

      {fresh.length > 0 && (
        <Section title="Вышло новое">
          {fresh.map(({ item, text }) => (
            <Card key={item.id} item={item} subtitle={text} highlight />
          ))}
        </Section>
      )}
      {continuing.length > 0 && (
        <Section title="Смотрю">
          {continuing.map(({ item, text }) => (
            <Card key={item.id} item={item} subtitle={text} />
          ))}
        </Section>
      )}
      {queue.length > 0 && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-bold">Очередь</h2>
            <p className="text-sm text-white/45">
              Порядок меняется перетаскиванием за ⠿
            </p>
          </div>
          <QueueList items={queue} onDragEnd={handleQueueDrag} />
        </section>
      )}
      {waiting.length > 0 && (
        <Section title="Ждём новый сезон">
          {waiting.map(({ item, text }) => (
            <Card key={item.id} item={item} subtitle={text} muted />
          ))}
        </Section>
      )}
      {done.length > 0 && (
        <Collapsible title="Просмотрено" count={done.length}>
          {done.map((item) => (
            <Card key={item.id} item={item} subtitle={item.summary ?? ""} muted />
          ))}
        </Collapsible>
      )}
      {dropped.length > 0 && (
        <Collapsible title="Бросил" count={dropped.length}>
          {dropped.map((item) => (
            <Card key={item.id} item={item} subtitle={item.summary ?? ""} muted />
          ))}
        </Collapsible>
      )}
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
        <Tab active={filters.company === "all"} onClick={() => set({ company: "all" })}>
          Все
        </Tab>
        {companies.map((company) =>
          editing ? (
            <input
              key={company.id}
              defaultValue={company.name}
              aria-label="Название компании"
              onBlur={(event) => {
                const name = event.target.value.trim();
                if (name) renameCompany(company.id, name);
              }}
              className="w-32 rounded-full border border-amber-400/50 bg-white/5 px-3 py-1.5 text-sm outline-none"
            />
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
        {editing && (
          <button
            type="button"
            onClick={() => addCompany("Новая компания")}
            className="rounded-full border border-dashed border-white/25 px-3 py-1.5 text-sm text-white/60 hover:text-white"
          >
            + Добавить
          </button>
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
          <Tab key={kind} small active={filters.kind === kind} onClick={() => set({ kind })}>
            {label}
          </Tab>
        ))}
      </div>
    </div>
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
        isDragging ? "relative z-10 border-amber-400/60 shadow-2xl" : "border-white/10"
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
      <CardBody item={item} subtitle={item.summary ?? ""} />
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
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <details className="group">
      <summary className="text-xl font-bold">
        {title} <span className="font-normal text-white/40">{count}</span>
      </summary>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">{children}</ul>
    </details>
  );
}

function Card({
  item,
  subtitle,
  highlight = false,
  muted = false,
}: {
  item: Item;
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
      <CardBody item={item} subtitle={subtitle} accent={!muted} />
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
