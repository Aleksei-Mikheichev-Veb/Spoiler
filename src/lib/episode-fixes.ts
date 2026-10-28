// Серии, которых нет в данных ПоискКино, хотя они уже вышли.
// Добавлять только с подтверждением минимум из двух источников и
// перечислять их в sources. Если ПоискКино сам добавит серию с тем же
// номером, исправление перестанет действовать.
import type { Episode } from "@/lib/poiskkino";

export interface MissingEpisode {
  season: number;
  episode: Episode;
  sources: string[];
}

export const missingEpisodes: Record<number, MissingEpisode[]> = {
  // «Пацаны»: в API ПоискКино у 4 сезона 7 серий, на самом деле 8
  460586: [
    {
      season: 4,
      episode: {
        number: 8,
        name: "Season Four Finale",
        airDate: "2024-07-18T00:00:00.000Z",
      },
      sources: [
        "Кинопоиск: в 4 сезоне 8 серий",
        "Википедия: The Boys season 4 — серия 8 «Season Four Finale» (до переименования «Assassination Run»), вышла 18.07.2024",
      ],
    },
  ],
};
