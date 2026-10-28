// Клиент API ПоискКино (бывший kinopoisk.dev): https://poiskkino.dev
// Работает только на сервере, чтобы ключ не попал в браузер.
import "server-only";
import { missingEpisodes, wrongAirDates } from "@/lib/episode-fixes";
import { usableImage } from "@/lib/images";

const API_URL = "https://api.poiskkino.dev";

// Бесплатный тариф — 200 запросов в сутки, поэтому ответы кешируем на сутки.
const CACHE_SECONDS = 60 * 60 * 24;

export type TitleType =
  | "movie"
  | "tv-series"
  | "cartoon"
  | "anime"
  | "animated-series";

export interface Poster {
  url?: string;
  previewUrl?: string;
}

export interface Rating {
  kp?: number;
  imdb?: number;
}

export interface SearchItem {
  id: number;
  name?: string;
  alternativeName?: string;
  type: TitleType;
  year?: number;
  shortDescription?: string;
  poster?: Poster;
  rating?: Rating;
  isSeries?: boolean;
}

export interface PersonInTitle {
  id: number;
  photo?: string;
  name?: string;
  enName?: string;
  // Для актёров здесь имя персонажа
  description?: string;
  enProfession?: string;
}

export interface Title extends SearchItem {
  description?: string;
  // Длительность фильма в минутах
  movieLength?: number;
  // Средняя длительность серии в минутах
  seriesLength?: number;
  genres?: { name: string }[];
  persons?: PersonInTitle[];
  seasonsInfo?: { number: number; episodesCount: number }[];
  premiere?: Premiere;
  // Онлайн-кинотеатры, где есть фильм (данные Кинопоиска)
  watchability?: { items?: WatchOption[] | null } | null;
  // Продолжения, предыстории и ремейки. BEFORE и AFTER — это порядок
  // выхода, а не сюжета: предыстория, снятая позже, будет AFTER
  sequelsAndPrequels?: RelatedTitle[];
}

export interface RelatedTitle {
  id: number;
  name?: string;
  alternativeName?: string;
  type: TitleType;
  year?: number;
  poster?: Poster;
  relationType?: "BEFORE" | "AFTER" | "REMAKE" | string;
}

export interface WatchOption {
  name: string;
  url: string;
  logo?: { url?: string };
}

// Даты премьер: в мире, в кино в России, онлайн
export interface Premiere {
  world?: string;
  russia?: string;
  digital?: string;
}

export interface PremiereDate {
  date: string;
  // Где премьера: в российском прокате, онлайн или только в мире
  where: "russia" | "digital" | "world";
}

// Какую дату премьеры показывать человеку из России
export function premiereDate(premiere?: Premiere): PremiereDate | undefined {
  if (premiere?.russia) return { date: premiere.russia, where: "russia" };
  if (premiere?.digital) return { date: premiere.digital, where: "digital" };
  if (premiere?.world) return { date: premiere.world, where: "world" };
  return undefined;
}

export interface UpcomingTitle extends SearchItem {
  premiere: PremiereDate;
  // Сколько человек на Кинопоиске ждут — по этому выбираем самое громкое
  awaiting: number;
}

// Ближайшие громкие премьеры на 3 месяца вперёд. Берём и мировые
// (так попадают голливудские фильмы без российского проката),
// и российские, а потом оставляем самые ожидаемые
export async function getUpcomingPremieres(
  now: number,
  limit = 8,
): Promise<UpcomingTitle[]> {
  const format = (time: number) => {
    const date = new Date(time);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
  };
  const range = `${format(now)}-${format(now + 90 * 24 * 60 * 60 * 1000)}`;
  const query = (field: string) =>
    request<{
      docs: (SearchItem & { premiere?: Premiere; votes?: { await?: number } })[];
    }>("/v1.4/movie", {
      [field]: range,
      sortField: "votes.await",
      sortType: "-1",
      limit: 15,
      notNullFields: "poster.url",
      selectFields: [
        "id",
        "name",
        "alternativeName",
        "type",
        "year",
        "shortDescription",
        "poster",
        "isSeries",
        "premiere",
        "votes",
      ],
    });
  const lists = await Promise.all([
    query("premiere.world"),
    query("premiere.russia"),
  ]);

  const today = new Date(now).setHours(0, 0, 0, 0);
  const byId = new Map<number, UpcomingTitle>();
  for (const item of lists.flatMap((list) => list.docs)) {
    const premiere = premiereDate(item.premiere);
    // Премьера в мире могла уже пройти, а в России — нет, и наоборот:
    // оставляем только то, что ещё впереди по выбранной дате
    if (!premiere || Date.parse(premiere.date) < today) continue;
    byId.set(item.id, {
      ...item,
      poster: cleanPoster(item.poster),
      premiere,
      awaiting: item.votes?.await ?? 0,
    });
  }
  return [...byId.values()]
    .sort((a, b) => b.awaiting - a.awaiting)
    .slice(0, limit)
    .sort((a, b) => Date.parse(a.premiere.date) - Date.parse(b.premiere.date));
}

export interface Episode {
  number: number;
  name?: string;
  enName?: string;
  airDate?: string;
  description?: string;
}

export interface Season {
  number: number;
  name?: string;
  episodesCount?: number;
  episodes?: Episode[];
}

async function request<T>(
  path: string,
  params: Record<string, string | number | (string | number)[]> = {},
  cacheSeconds = CACHE_SECONDS,
): Promise<T> {
  const key = process.env.POISKKINO_API_KEY;
  if (!key) {
    throw new Error(
      "Не задан ключ POISKKINO_API_KEY. Добавьте его в файл .env.local",
    );
  }

  const url = new URL(path, API_URL);
  for (const [name, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      url.searchParams.append(name, String(item));
    }
  }

  const load = () =>
    fetch(url, {
      headers: { "X-API-KEY": key },
      next: { revalidate: cacheSeconds },
    });
  // Связь с API иногда кратковременно пропадает («fetch failed») —
  // одна повторная попытка спасает большинство таких случаев
  const res = await load().catch(() => load());
  if (!res.ok) {
    throw new Error(`ПоискКино ответил ${res.status} на запрос ${path}`);
  }
  return res.json() as Promise<T>;
}

export async function searchTitles(query: string): Promise<SearchItem[]> {
  const data = await request<{ docs: SearchItem[] }>("/v1.5/movie/search", {
    query,
    limit: 20,
  });
  return data.docs.map((item) => ({ ...item, poster: cleanPoster(item.poster) }));
}

export async function getTitle(id: number): Promise<Title> {
  const title = await request<Title>(`/v1.5/movie/${id}`);
  return {
    ...title,
    poster: cleanPoster(title.poster),
    persons: title.persons?.map((person) => ({
      ...person,
      photo: usableImage(person.photo),
    })),
    sequelsAndPrequels: title.sequelsAndPrequels?.map((item) => ({
      ...item,
      poster: cleanPoster(item.poster),
    })),
  };
}

// Убираем картинки, которые не загрузятся (см. images.ts)
function cleanPoster(poster?: Poster): Poster | undefined {
  return (
    poster && {
      url: usableImage(poster.url),
      previewUrl: usableImage(poster.previewUrl),
    }
  );
}

export async function getSeasons(movieId: number): Promise<Season[]> {
  const data = await request<{ docs: Season[] }>("/v1.5/season", {
    movieId,
    limit: 100,
    sortField: "number",
    sortType: 1,
  });
  // Сезон 0 — спецвыпуски, для рекапов они не нужны.
  // Серии API может отдавать не по порядку.
  // Недостающие серии и неверные даты исправляем по episode-fixes.ts
  const fixes = missingEpisodes[movieId] ?? [];
  const dateFixes = wrongAirDates[movieId] ?? [];
  return data.docs
    .filter((season) => season.number > 0)
    .map((season) => {
      const episodes = (season.episodes ?? []).map((episode) => {
        const fix = dateFixes.find(
          (item) =>
            item.season === season.number &&
            item.episode === episode.number &&
            episode.airDate?.slice(0, 10) === item.wrong,
        );
        return fix ? { ...episode, airDate: fix.airDate } : episode;
      });
      for (const fix of fixes) {
        if (
          fix.season === season.number &&
          !episodes.some((episode) => episode.number === fix.episode.number)
        ) {
          episodes.push(fix.episode);
        }
      }
      return {
        ...season,
        episodesCount: Math.max(season.episodesCount ?? 0, episodes.length),
        episodes: episodes.sort((a, b) => a.number - b.number),
      };
    });
}

// В карточке фильма имена персонажей не приходят — они есть только
// в фильмографии актёров. Забираем всех актёров одним запросом.
// Роли API хранит на английском (например, «Paul Atreides»).
export async function getRoles(
  movieId: number,
  personIds: number[],
): Promise<Record<number, string>> {
  if (personIds.length === 0) return {};

  const data = await request<{
    docs: { id: number; movies?: { id: number; description?: string }[] }[];
  }>(
    "/v1.5/person",
    {
      id: personIds,
      selectFields: ["id", "movies"],
      limit: personIds.length,
    },
    // Роли не меняются, кешируем на неделю
    CACHE_SECONDS * 7,
  );

  const roles: Record<number, string> = {};
  for (const person of data.docs) {
    const role = person.movies?.find((movie) => movie.id === movieId)
      ?.description;
    if (role) roles[person.id] = role;
  }
  return roles;
}

export const TYPE_LABELS: Record<TitleType, string> = {
  movie: "Фильм",
  "tv-series": "Сериал",
  cartoon: "Мультфильм",
  anime: "Аниме",
  "animated-series": "Мультсериал",
};
