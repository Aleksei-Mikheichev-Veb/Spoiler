// Клиент API ПоискКино (бывший kinopoisk.dev): https://poiskkino.dev
// Работает только на сервере, чтобы ключ не попал в браузер.
import "server-only";

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
  genres?: { name: string }[];
  persons?: PersonInTitle[];
  seasonsInfo?: { number: number; episodesCount: number }[];
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

  const res = await fetch(url, {
    headers: { "X-API-KEY": key },
    next: { revalidate: cacheSeconds },
  });
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
  return data.docs;
}

export async function getTitle(id: number): Promise<Title> {
  return request<Title>(`/v1.5/movie/${id}`);
}

export async function getSeasons(movieId: number): Promise<Season[]> {
  const data = await request<{ docs: Season[] }>("/v1.5/season", {
    movieId,
    limit: 100,
    sortField: "number",
    sortType: 1,
  });
  // Сезон 0 — спецвыпуски, для рекапов они не нужны
  return data.docs.filter((season) => season.number > 0);
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
