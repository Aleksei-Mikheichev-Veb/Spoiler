// Исправления данных ПоискКино о сериях.
// Добавлять только с подтверждением минимум из двух источников и
// перечислять их в sources.
import type { Episode } from "@/lib/poiskkino";

// Серия, которой нет в ПоискКино, хотя она уже вышла. Если ПоискКино сам
// добавит серию с тем же номером, исправление перестанет действовать.
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

// Неверная дата выхода серии в ПоискКино. Из-за неё сайт может считать
// серию вышедшей раньше времени (или наоборот). Действует, только пока
// у ПоискКино стоит именно та дата, которую исправляем: если там
// поправят, исправление само перестанет действовать.
export interface WrongAirDate {
  season: number;
  episode: number;
  // Дата у ПоискКино (только день, ГГГГ-ММ-ДД)
  wrong: string;
  airDate: string;
  sources: string[];
}

export const wrongAirDates: Record<number, WrongAirDate[]> = {
  // «Декстер: Воскрешение»: у ПоискКино 2 сезон с 1 октября, на самом деле с 30-го
  6058297: [
    {
      season: 2,
      episode: 1,
      wrong: "2026-10-01",
      airDate: "2026-10-30T00:00:00.000Z",
      sources: [
        "Википедия: Dexter: Resurrection — 2 сезон с 30.10.2026",
        "Dread Central: премьера 2 сезона на Paramount+ 30 октября 2026",
      ],
    },
  ],
};
