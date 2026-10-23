// Киновселенные: несколько фильмов с общими героями («Дюна», «Пираты»).
// Устроены как пересказ сериала: фильм — это «сезон», а его части —
// «серии». Лежат готовыми файлами в data/franchises.
import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Character, SeasonRecap } from "@/lib/recaps";

export interface FranchiseFilm {
  // Порядковый номер — он же номер «сезона» в пересказе
  order: number;
  kpId: number;
  name: string;
  year: number;
}

export interface Franchise {
  id: string;
  name: string;
  films: FranchiseFilm[];
  sources: string[];
  characters: Character[];
  seasons: SeasonRecap[];
}

const DIR = path.join(process.cwd(), "data", "franchises");

// Вселенная, в которую входит фильм, или null
export async function getFranchiseByFilm(
  kpId: number,
): Promise<Franchise | null> {
  let files: string[];
  try {
    files = await readdir(DIR);
  } catch {
    return null;
  }
  for (const file of files.filter((name) => name.endsWith(".json"))) {
    const franchise = JSON.parse(
      await readFile(path.join(DIR, file), "utf8"),
    ) as Franchise;
    if (franchise.films.some((film) => film.kpId === kpId)) return franchise;
  }
  return null;
}
