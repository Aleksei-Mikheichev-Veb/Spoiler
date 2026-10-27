// Пересказы сериалов. В прототипе лежат готовыми файлами в data/recaps,
// позже переедут в базу данных.
import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export interface EpisodeRecap {
  episode: number;
  // Название части — у фильмов из киновселенной, где «серий» нет
  title?: string;
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
  // Новое имя героя с этой серии (Халбранд оказался Сауроном). Действует
  // и дальше, пока другое описание не сменит его снова
  name?: string;
}

export interface Portrait {
  from: [season: number, episode: number];
  actor: string;
  photo?: string;
  photoSource?: string;
}

// Одно из лиц героя, когда сюжет идёт в двух временах сразу (юная и
// взрослая версии в одних и тех же сериях). Лицо показываем с серии
// from — раньше оно может быть спойлером: например, выдать, что
// героиня доживёт до наших дней
export interface Face {
  // Подпись под фото: «1996», «наши дни»
  label: string;
  from: [season: number, episode: number];
  actor: string;
  photo?: string;
  photoSource?: string;
}

export interface Character {
  // В текстах пересказа упоминания размечены как [[id|словоформа]]
  // По первому имени героя (halbrand, а не sauron)
  id: string;
  // Имя, под которым героя знают с самого начала
  name: string;
  actor?: string;
  photo?: string;
  // С какой серии можно показывать фото и актёра. Нужно для тайных
  // злодеев: лицо и имя актёра выдают, кто убийца
  revealFrom?: [season: number, episode: number];
  // Смена актёра по ходу сериала (например, после скачка во времени
  // юную героиню играет другая актриса). Действует с серии from
  portraits?: Portrait[];
  // Несколько лиц одновременно (см. Face). Если задано, actor и photo
  // не используются
  faces?: Face[];
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

// Сериалы, для которых пересказ уже готов
export async function listRecapIds(): Promise<number[]> {
  try {
    const files = await readdir(path.join(process.cwd(), "data", "recaps"));
    return files
      .filter((name) => name.endsWith(".json"))
      .map((name) => Number(name.replace(".json", "")))
      .filter((id) => Number.isInteger(id));
  } catch {
    return [];
  }
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
