"use client";

// Разделы «Сериалы» и «Фильмы»: мои списки одного типа
// с переключателем «Смотрю · Буду смотреть · Просмотрено · Бросил»
import Link from "next/link";
import {
  Card,
  CompanyFilter,
  EmptyNote,
  lengthOnly,
  QueueList,
  Section,
  SubTabs,
} from "@/components/ListParts";
import { moveToQueue } from "@/lib/library";
import { createLocalStore } from "@/lib/local-store";
import {
  splitWatching,
  useCompanyFilter,
  useHydrated,
  useItems,
  useUpdates,
  type Item,
} from "@/lib/my-items";

type Kind = "series" | "movies";
type ListId = "watching" | "want" | "done" | "dropped";

// Открытый список запоминаем — при возврате в раздел он останется
const tabStores: Record<Kind, ReturnType<typeof createLocalStore<ListId>>> = {
  series: createLocalStore<ListId>("spoiler:series-tab", "watching"),
  movies: createLocalStore<ListId>("spoiler:movies-tab", "want"),
};

const byOrder = (a: Item, b: Item) => a.order - b.order;
// Просмотренное — сначала с высокой оценкой, без оценки — в конце
const byRating = (a: Item, b: Item) => (b.rating ?? 0) - (a.rating ?? 0);

export function MyList({ kind }: { kind: Kind }) {
  const isSeries = kind === "series";
  const all = useItems().filter((item) => item.isSeries === isSeries);
  const updates = useUpdates(all);
  const items = useCompanyFilter(all);
  const hydrated = useHydrated();
  const stored = tabStores[kind].use();

  const watching = items.filter((item) => item.status === "watching");
  const queue = items.filter((item) => item.status === "want").sort(byOrder);
  const done = items.filter((item) => item.status === "done").sort(byRating);
  const dropped = items.filter((item) => item.status === "dropped");
  const { fresh, continuing, waiting } = splitWatching(items, updates);

  // У фильмов «Начатые» и «Бросил» бывают редко — показываем их, только
  // когда там что-то есть
  const tabs: { id: ListId; label: string; count: number }[] = isSeries
    ? [
        { id: "watching", label: "Смотрю", count: watching.length },
        { id: "want", label: "Буду смотреть", count: queue.length },
        { id: "done", label: "Просмотрено", count: done.length },
        { id: "dropped", label: "Бросил", count: dropped.length },
      ]
    : [
        { id: "want", label: "Буду смотреть", count: queue.length },
        { id: "done", label: "Просмотрено", count: done.length },
        ...(watching.length
          ? [{ id: "watching" as const, label: "Начатые", count: watching.length }]
          : []),
        ...(dropped.length
          ? [{ id: "dropped" as const, label: "Бросил", count: dropped.length }]
          : []),
      ];
  const tab = tabs.some((item) => item.id === stored) ? stored : tabs[0].id;

  const toQueue = (item: Item) => (
    // Начал, но сейчас не смотрит — отложить в очередь, метка останется
    <button
      type="button"
      onClick={() => moveToQueue(item, item.summary)}
      title="Отложить в очередь — метка сохранится"
      className="shrink-0 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-white/60 transition hover:border-amber-400/60 hover:text-white"
    >
      В очередь
    </button>
  );

  const what = isSeries ? "сериал" : "фильм";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold sm:text-3xl">
          {isSeries ? "Мои сериалы" : "Мои фильмы"}
        </h1>
        <CompanyFilter />
        <SubTabs
          tabs={tabs}
          value={tab}
          onChange={(id) => tabStores[kind].set(id)}
        />
      </div>

      {/* Пока браузер не прочитал списки, ничего не показываем —
          иначе на мгновение мелькнёт «пусто» */}
      {!hydrated ? null : tab === "watching" ? (
        <>
          {fresh.length > 0 && (
            <Section title="Вышло новое">
              {fresh.map(({ item, text }) => (
                <Card key={item.id} item={item} subtitle={text} highlight />
              ))}
            </Section>
          )}
          {continuing.length > 0 && (
            <Section title={isSeries && fresh.length + waiting.length > 0 ? "Смотрю" : undefined}>
              {continuing.map(({ item, text }) => (
                <Card
                  key={item.id}
                  item={item}
                  subtitle={text}
                  action={toQueue(item)}
                />
              ))}
            </Section>
          )}
          {waiting.length > 0 && (
            <Section
              title="Ждём продолжения"
              action={
                <Link
                  href="/calendar"
                  className="text-sm text-white/50 hover:text-white"
                >
                  Календарь →
                </Link>
              }
            >
              {waiting.map(({ item, text }) => (
                <Card key={item.id} item={item} subtitle={text} muted />
              ))}
            </Section>
          )}
          {watching.length === 0 && (
            <EmptyNote>
              Сейчас ничего не смотрите. Выберите {what} во вкладке «Буду
              смотреть» или найдите новый через поиск.
            </EmptyNote>
          )}
        </>
      ) : tab === "want" ? (
        queue.length > 0 ? (
          <QueueList
            items={queue}
            allIds={all
              .filter((item) => item.status === "want")
              .sort(byOrder)
              .map((item) => item.id)}
          />
        ) : (
          <EmptyNote>
            Здесь пусто. Найдите {what} через поиск и нажмите «В мои списки».
          </EmptyNote>
        )
      ) : (
        <ItemGrid
          items={tab === "done" ? done : dropped}
          empty={
            tab === "done"
              ? "Пока ничего не отмечено как просмотренное."
              : "Брошенных нет — и хорошо."
          }
        />
      )}
    </div>
  );
}

function ItemGrid({ items, empty }: { items: Item[]; empty: string }) {
  if (items.length === 0) return <EmptyNote>{empty}</EmptyNote>;
  return (
    <Section>
      {items.map((item) => (
        <Card
          key={item.id}
          item={item}
          subtitle={lengthOnly(item.summary)}
          muted
        />
      ))}
    </Section>
  );
}
