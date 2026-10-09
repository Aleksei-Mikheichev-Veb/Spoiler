// Работа с номерами серий. Используется и на сервере, и в браузере.
import type { Episode, Season } from "@/lib/poiskkino";

// [сезон, серия]
export type EpisodeKey = [season: number, episode: number];

// Следующий сезон после метки: когда выйдет (если известно)
export interface Upcoming {
  season: number;
  airDate?: string;
}

export function isAfter(a: EpisodeKey, b: EpisodeKey): boolean {
  return a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);
}

// Вышла ли серия. Серия без даты считается вышедшей, только если:
// — у сериала вообще нет дат (старые сериалы), или
// — в её сезоне есть серии, которые точно вышли.
// Иначе это анонс: ПоискКино заводит будущие сезоны как заглушки
// («Episode #2.1» без даты), как у «Сёгуна».
export function createAiredCheck(seasons: Season[], now: number) {
  const past = (date?: string) => Boolean(date) && Date.parse(date!) <= now;
  const hasDates = seasons.some((season) =>
    season.episodes?.some((episode) => episode.airDate),
  );
  const seasonStarted = new Set(
    seasons
      .filter((season) => season.episodes?.some((e) => past(e.airDate)))
      .map((season) => season.number),
  );

  return (seasonNumber: number, episode: Episode): boolean => {
    if (episode.airDate) return past(episode.airDate);
    return !hasDates || seasonStarted.has(seasonNumber);
  };
}

// Все вышедшие серии по порядку
export function airedEpisodes(seasons: Season[], now: number): EpisodeKey[] {
  const isAired = createAiredCheck(seasons, now);
  return seasons
    .flatMap((season) =>
      (season.episodes ?? [])
        .filter((episode) => isAired(season.number, episode))
        .map((episode): EpisodeKey => [season.number, episode.number]),
    )
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

// Первый ещё не вышедший сезон после метки
export function findUpcoming(
  seasons: Season[],
  now: number,
  after: EpisodeKey,
): Upcoming | undefined {
  const isAired = createAiredCheck(seasons, now);
  for (const season of seasons) {
    for (const episode of season.episodes ?? []) {
      const key: EpisodeKey = [season.number, episode.number];
      if (isAfter(key, after) && !isAired(season.number, episode)) {
        return { season: season.number, airDate: episode.airDate };
      }
    }
  }
  return undefined;
}

// «Ждём 2 сезон · выйдет 12 ноября» / «· дата пока неизвестна»
export function describeUpcoming(
  upcoming: Upcoming | undefined,
  now: number,
): string {
  if (!upcoming) return "Новый сезон пока не анонсирован";
  const when = upcoming.airDate
    ? `выйдет ${formatAirDate(upcoming.airDate, now)}`
    : "дата пока неизвестна";
  return `Анонсирован ${upcoming.season} сезон · ${when}`;
}

// ПоискКино подставляет «Episode #2.1», пока настоящее название неизвестно
export function displayEpisodeName(episode?: Episode): string {
  const name = episode?.name || episode?.enName;
  if (!name || /^Episode #\d+\.\d+$/.test(name)) {
    return "Название пока неизвестно";
  }
  return name;
}

export function episodeName(seasons: Season[], [s, e]: EpisodeKey): string {
  return displayEpisodeName(
    seasons
      .find((season) => season.number === s)
      ?.episodes?.find((item) => item.number === e),
  );
}

// «12 ноября», а для другого года — «12 ноября 2027 г.»
export function formatAirDate(airDate: string, now: number): string {
  const date = new Date(airDate);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

// «Вышел 3 сезон · серий: 8» или «Вышли новые серии: 2»
export function describeNewEpisodes(
  newer: EpisodeKey[],
  markSeason: number,
): string {
  const newSeasons = [
    ...new Set(newer.map(([season]) => season).filter((s) => s > markSeason)),
  ];
  if (newSeasons.length === 1) {
    return `Вышел ${newSeasons[0]} сезон · серий: ${newer.length}`;
  }
  if (newSeasons.length > 1) {
    return `Вышли новые сезоны: ${newSeasons.join(", ")}`;
  }
  return `Вышли новые серии: ${newer.length}`;
}
