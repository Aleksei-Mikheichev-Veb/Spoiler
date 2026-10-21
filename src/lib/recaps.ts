// Пересказы сериалов. В прототипе лежат готовыми файлами в data/recaps,
// позже переедут в базу данных.
import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

export interface EpisodeRecap {
  episode: number;
  text: string;
  // «Важно помнить» после этой серии: 3–6 коротких пунктов о том,
  // как обстоят дела к этому моменту
  remember?: string[];
}

export interface SeasonRecap {
  season: number;
  // 2–3 предложения
  short: string;
  // Несколько абзацев, разделённых пустой строкой
  normal: string;
  // Чем закончился сезон — главное перед следующим
  ending: string;
  episodes: EpisodeRecap[];
}

// Описание героя на определённый момент сериала.
// Действует с серии from и до следующего описания.
export interface CharacterSnapshot {
  from: [season: number, episode: number];
  text: string;
}

export interface Character {
  // В текстах пересказа упоминания размечены как [[id|словоформа]]
  id: string;
  name: string;
  actor?: string;
  photo?: string;
  // С какой серии можно показывать фото и актёра. Нужно для тайных
  // злодеев: лицо и имя актёра выдают, кто убийца
  revealFrom?: [season: number, episode: number];
  about: CharacterSnapshot[];
}

// Пометка к сезону. Например, у антологий («Фишер», «Фарго») новый
// сезон — отдельная история, и прошлые вспоминать не обязательно.
export interface SeasonNote {
  season: number;
  text: string;
}

export interface Recap {
  titleId: number;
  sources: string[];
  seasonNotes?: SeasonNote[];
  characters?: Character[];
  seasons: SeasonRecap[];
}

export async function getRecap(titleId: number): Promise<Recap | null> {
  const file = path.join(process.cwd(), "data", "recaps", `${titleId}.json`);
  try {
    return JSON.parse(await readFile(file, "utf8")) as Recap;
  } catch {
    // Пересказа для этого сериала пока нет
    return null;
  }
}
