// Даты премьер фильмов из моих списков — для календаря.
// GET /api/premieres?ids=5458743,5060245 →
// { now, titles: { "5458743": { date, where } } } — только ещё не вышедшие
import { NextResponse } from "next/server";
import { getTitle, premiereDate, type PremiereDate } from "@/lib/poiskkino";

const MAX_IDS = 30;
const DAY = 24 * 60 * 60 * 1000;

export interface PremieresResponse {
  now: number;
  titles: Record<string, PremiereDate>;
}

export async function GET(request: Request) {
  const ids = (new URL(request.url).searchParams.get("ids") ?? "")
    .split(",")
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, MAX_IDS);

  const now = Date.now();
  const titles: Record<string, PremiereDate> = {};
  // Ответы ПоискКино кешируются на сутки — лимит не тратится каждый раз
  await Promise.all(
    ids.map(async (id) => {
      try {
        const premiere = premiereDate((await getTitle(id)).premiere);
        // Вышедшие за последнюю неделю тоже показываем — «уже вышел»
        if (premiere && Date.parse(premiere.date) >= now - 7 * DAY) {
          titles[id] = premiere;
        }
      } catch {
        // Не удалось узнать — просто не покажем этот фильм в календаре
      }
    }),
  );

  return NextResponse.json({ now, titles } satisfies PremieresResponse);
}
