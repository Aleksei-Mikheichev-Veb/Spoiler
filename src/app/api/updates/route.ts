// Какие серии уже вышли у сериалов из библиотеки пользователя
// и какой сезон анонсирован следующим.
// Главная спрашивает это, чтобы показать «Вышел новый сезон».
// GET /api/updates?ids=1032606,749562 →
// { now, titles: { "749562": { aired: [[1,1],...], upcoming: { season: 2 } } } }
import { NextResponse } from "next/server";
import {
  airedEpisodes,
  findUpcoming,
  type EpisodeKey,
  type Upcoming,
} from "@/lib/episodes";
import { getSeasons } from "@/lib/poiskkino";

const MAX_IDS = 50;

export interface TitleUpdates {
  aired: EpisodeKey[];
  upcoming?: Upcoming;
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
        titles[id] = {
          aired,
          upcoming: findUpcoming(seasons, now, aired.at(-1) ?? [0, 0]),
        };
      } catch {
        // Один сломанный сериал не должен ломать остальные
      }
    }),
  );

  return NextResponse.json({ now, titles } satisfies UpdatesResponse);
}
