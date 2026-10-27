"use client";

// Блоки главной, которые зависят от моих списков в браузере
import Link from "next/link";
import { EpisodeCalendar } from "@/components/EpisodeCalendar";
import { Card, Section } from "@/components/ListParts";
import { SearchForm } from "@/components/SearchForm";
import { createLocalStore } from "@/lib/local-store";
import {
  splitWatching,
  useHydrated,
  useItems,
  useUpdates,
} from "@/lib/my-items";

// Знакомство можно закрыть — тогда оно больше не показывается
// (вернуть можно в разделе «Ещё»)
export const introStore = createLocalStore<{ hidden: boolean }>(
  "spoiler:intro",
  { hidden: false },
);

const FEATURES = [
  {
    icon: "⏪",
    title: "Пересказ до места, где остановились",
    text: "Отметьте серию — и мы напомним всё, что было до неё. Ни слова о том, что дальше.",
  },
  {
    icon: "👤",
    title: "Кто есть кто",
    text: "Наведите на имя героя — появится карточка: кто он и что о нём известно к этому моменту.",
  },
  {
    icon: "📋",
    title: "Свои списки",
    text: "Что смотрю, что хочу посмотреть, что уже видел — отдельно для себя, вдвоём или всей семьёй.",
  },
  {
    icon: "📅",
    title: "Календарь",
    text: "Когда выйдет новая серия или премьера фильма из ваших списков.",
  },
];

// Что это за сайт — для тех, кто пришёл впервые
export function HomeIntro() {
  const { hidden } = introStore.use();
  const hydrated = useHydrated();
  if (!hydrated || hidden) return null;

  return (
    <section className="relative flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-8">
      <button
        type="button"
        onClick={() => introStore.set({ hidden: true })}
        aria-label="Скрыть знакомство"
        title="Скрыть"
        className="absolute right-3 top-3 rounded-md px-2 py-1 text-white/35 transition hover:text-white/70"
      >
        ✕
      </button>
      <div className="flex max-w-2xl flex-col gap-3 pr-6">
        <h1 className="text-2xl font-bold leading-tight sm:text-4xl">
          Забыли, что было в прошлом сезоне?
        </h1>
        <p className="text-white/60 sm:text-lg">
          Найдите фильм или сериал, отметьте, где остановились, — и мы
          напомним всё, что было до этого места. Без спойлеров.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <li
            key={feature.title}
            className="flex flex-col gap-1 rounded-xl border border-white/10 p-4"
          >
            <span className="text-2xl" aria-hidden="true">
              {feature.icon}
            </span>
            <span className="font-semibold">{feature.title}</span>
            <span className="text-sm leading-snug text-white/55">
              {feature.text}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:max-w-md sm:flex-1">
          <SearchForm />
        </div>
        <Link
          href="/title/1316601"
          className="text-sm text-amber-400 underline-offset-4 hover:underline"
        >
          или посмотрите пример — «Дом Дракона» →
        </Link>
      </div>
    </section>
  );
}

// Сколько карточек «Продолжить смотреть» показывать на главной
const CONTINUE_LIMIT = 4;

// Моё: что вышло нового, что продолжить, ближайшие серии
export function HomeMine() {
  const items = useItems();
  const updates = useUpdates(items);
  const hydrated = useHydrated();
  if (!hydrated || items.length === 0) return null;

  const { fresh, continuing } = splitWatching(items, updates);
  // Сначала то, что смотрел последним
  const recent = [...continuing]
    .sort(
      (a, b) =>
        (b.item.progress?.updatedAt ?? 0) - (a.item.progress?.updatedAt ?? 0),
    )
    .slice(0, CONTINUE_LIMIT);

  return (
    <>
      {fresh.length > 0 && (
        <Section title="Вышло новое">
          {fresh.map(({ item, text }) => (
            <Card key={item.id} item={item} subtitle={text} highlight showKind />
          ))}
        </Section>
      )}
      {recent.length > 0 && (
        <Section
          title="Продолжить смотреть"
          action={
            continuing.length > CONTINUE_LIMIT && (
              <Link href="/series" className="text-sm text-white/50 hover:text-white">
                Все →
              </Link>
            )
          }
        >
          {recent.map(({ item, text }) => (
            <Card key={item.id} item={item} subtitle={text} showKind />
          ))}
        </Section>
      )}
      <EpisodeCalendar
        titles={items.filter(
          (item) => item.isSeries && item.status !== "dropped",
        )}
        updates={updates}
        action={
          <Link href="/calendar" className="text-sm text-white/50 hover:text-white">
            Весь календарь →
          </Link>
        }
      />
    </>
  );
}
