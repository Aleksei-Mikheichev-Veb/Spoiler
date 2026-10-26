"use client";

// Общие детали разделов «Сериалы», «Фильмы» и «Главная»:
// карточки, очередь с перетаскиванием, фильтр компаний, переключатель
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
import { useState } from "react";
import { ratingColor } from "@/components/RatingControl";
import {
  addCompany,
  removeCompany,
  removeFromLibrary,
  renameCompany,
  reorderQueue,
  useCompanies,
} from "@/lib/library";
import { companyFilterStore, type Item } from "@/lib/my-items";
import { describeProgress, removeProgress } from "@/lib/progress";

// Фильтр «Все / Я / Вдвоём / …» с добавлением и переименованием компаний
export function CompanyFilter() {
  const { company: selected } = companyFilterStore.use();
  const companies = useCompanies();
  const [editing, setEditing] = useState(false);
  const select = (company: string) => companyFilterStore.set({ company });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Pill active={selected === "all"} onClick={() => select("all")}>
        Все
      </Pill>
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
                  if (selected === company.id) select("all");
                }}
                aria-label={`Удалить «${company.name}»`}
                className="px-3 py-1.5 text-base text-white/50 transition hover:text-red-400"
              >
                ✕
              </button>
            )}
          </span>
        ) : (
          <Pill
            key={company.id}
            active={selected === company.id}
            onClick={() => select(company.id)}
          >
            {company.name}
          </Pill>
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
        const trimmed = name.trim();
        if (trimmed) addCompany(trimmed);
        close();
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

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm transition ${
        active
          ? "bg-amber-400 font-semibold text-black"
          : "border border-white/15 text-white/70 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

// Переключатель списков внутри раздела: «Смотрю · Буду смотреть · …»
export function SubTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string; count: number }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      role="tablist"
      className="flex overflow-x-auto rounded-xl border border-white/10 p-1 sm:w-fit"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition sm:flex-none sm:px-4 ${
            value === tab.id
              ? "bg-amber-400 font-semibold text-black"
              : "text-white/60 hover:text-white"
          }`}
        >
          {tab.label}{" "}
          <span className={value === tab.id ? "font-normal" : "text-white/35"}>
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title?: string;
  // Ссылка справа от заголовка, например «Все →»
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      {title && (
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-bold">{title}</h2>
          {action}
        </div>
      )}
      <ul className="grid gap-3 sm:grid-cols-2">{children}</ul>
    </section>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-white/50">{children}</p>;
}

// Очередь «Буду смотреть» с перетаскиванием. allIds — вся очередь
// (без фильтра компаний), чтобы порядок менялся в ней целиком
export function QueueList({
  items,
  allIds,
}: {
  items: Item[];
  allIds: number[];
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderQueue(
      arrayMove(
        allIds,
        allIds.indexOf(Number(active.id)),
        allIds.indexOf(Number(over.id)),
      ),
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-white/45">
        Порядок меняется перетаскиванием за ⠿
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
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
    </div>
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

export function Card({
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
export function lengthOnly(summary?: string): string {
  return (summary ?? "").replace(/^(Сериал|Фильм)( · )?/, "");
}
