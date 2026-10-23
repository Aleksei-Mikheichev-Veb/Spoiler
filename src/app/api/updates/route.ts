// Какие серии уже вышли у сериалов из библиотеки пользователя,
// какой сезон анонсирован следующим и расписание ближайших серий.
// Главная спрашивает это для «Вышло новое» и календаря серий.
// GET /api/updates?ids=1032606,749562 →
// { now, titles: { "749562": { aired, upcoming, schedule } } }
import { NextResponse } from "next/server";
import {
  airedEpisodes,
  displayEpisodeName,
  findUpcoming,
  type EpisodeKey,
  type Upcoming,
} from "@/lib/episodes";
import { getSeasons } from "@/lib/poiskkino";

const MAX_IDS = 50;
const DAY = 24 * 60 * 60 * 1000;
// Календарь: серии, вышедшие за последнюю неделю, и выходящие в ближайшие 60 дней
const CALENDAR_PAST = 7 * DAY;
const CALENDAR_FUTURE = 60 * DAY;

export interface ScheduledEpisode {
  season: number;
  episode: number;
  name: string;
  airDate: string;
}

export interface TitleUpdates {
  aired: EpisodeKey[];
  upcoming?: Upcoming;
  schedule: ScheduledEpisode[];
}

export interface UpdatesResponse {
  now: number;
  titles: Record<string, TitleUpdates>;
}

export async function GET(request: Request) {
  const ids = (new URL(request.url).searchParams.get("ids") ?? "")
    .split(",")
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, MAX_IDS);

  const now = Date.now();
  const titles: Record<string, TitleUpdates> = {};

  // Ответы ПоискКино кешируются на сутки, так что лимит не тратится
  // при каждом открытии главной
  await Promise.all(
    ids.map(async (id) => {
      try {
        const seasons = await getSeasons(id);
        const aired = airedEpisodes(seasons, now);
        const schedule = seasons.flatMap((season) =>
          (season.episodes ?? [])
            .filter((episode) => {
              if (!episode.airDate) return false;
              const time = Date.parse(episode.airDate);
              return time >= now - CALENDAR_PAST && time <= now + CALENDAR_FUTURE;
            })
            .map((episode) => ({
              season: season.number,
              episode: episode.number,
              name: displayEpisodeName(episode),
              airDate: episode.airDate!,
            })),
        );
        titles[id] = {
          aired,
          upcoming: findUpcoming(seasons, now, aired.at(-1) ?? [0, 0]),
          schedule,
        };
      } catch {
        // Один сломанный сериал не должен ломать остальные
      }
    }),
  );

  return NextResponse.json({ now, titles } satisfies UpdatesResponse);
}
