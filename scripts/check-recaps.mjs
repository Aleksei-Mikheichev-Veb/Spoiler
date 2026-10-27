// Проверяет пересказы в data/recaps и data/franchises на ошибки,
// которые легко пропустить глазами. Запуск: npm run check:recaps
// Правила, которые здесь проверяются, описаны в docs/recaps.md
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = ["recaps", "franchises"].flatMap((folder) => {
  const dir = path.join(root, "data", folder);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join("data", folder, name));
});

const key = ([season, episode]) => `${season}×${episode}`;
// a позже b
const isAfter = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);
const MENTION = /\[\[([a-z0-9-]+)\|([^\]]+)\]\]/g;

let errorCount = 0;
let warningCount = 0;

for (const file of files) {
  const errors = [];
  const warnings = [];
  const data = JSON.parse(readFileSync(path.join(root, file), "utf8"));
  const characters = data.characters ?? [];
  const byId = new Map(characters.map((character) => [character.id, character]));

  // Герои
  for (const character of characters) {
    const name = `${character.id} (${character.name})`;
    if (!character.about?.length) {
      errors.push(`${name}: нет ни одного описания`);
      continue;
    }
    // Описания, смены актёра и лица — строго по порядку серий
    for (const [field, list] of [
      ["about", character.about],
      ["portraits", character.portraits ?? []],
    ]) {
      for (let i = 1; i < list.length; i++) {
        if (!isAfter(list[i].from, list[i - 1].from)) {
          errors.push(`${name}: ${field} не по порядку (${key(list[i].from)})`);
        }
      }
    }
    const first = character.about[0].from;
    for (const face of character.faces ?? []) {
      if (isAfter(first, face.from)) {
        errors.push(`${name}: лицо «${face.label}» с ${key(face.from)} — раньше, чем герой появился (${key(first)})`);
      }
    }
    if (character.faces && (character.actor || character.photo)) {
      warnings.push(`${name}: при faces поля actor и photo не используются`);
    }
    // Фото: откуда скачивать и скачано ли
    const photos = [
      character,
      ...(character.portraits ?? []),
      ...(character.faces ?? []),
    ].filter((item) => item.photo);
    for (const item of photos) {
      if (!item.photoSource) {
        errors.push(`${name}: у фото ${item.photo} нет photoSource`);
      } else if (!existsSync(path.join(root, "public", item.photo))) {
        warnings.push(`${name}: фото ${item.photo} не скачано (npm run photos)`);
      }
    }
    if (photos.length === 0 && !character.faces) {
      warnings.push(`${name}: без фото`);
    }
  }

  // Упоминания героев в тексте
  function checkText(text, where, boundary) {
    const opened = (text.match(/\[\[/g) ?? []).length;
    const matches = [...text.matchAll(MENTION)];
    if (opened !== matches.length) {
      errors.push(`${where}: сломанная разметка [[…]]`);
    }
    for (const [, id] of matches) {
      const character = byId.get(id);
      if (!character) {
        errors.push(`${where}: нет героя «${id}»`);
      } else if (isAfter(character.about[0].from, boundary)) {
        // Ссылка не сработает (герой ещё «не появился»), а если описание
        // героя заведено позже по ошибке — это подсказка исправить его
        errors.push(`${where}: «${id}» упомянут раньше, чем появился (${key(character.about[0].from)})`);
      }
    }
  }

  const seasons = data.seasons ?? [];
  seasons.forEach((season, index) => {
    if (season.season !== index + 1) {
      warnings.push(`сезон ${season.season}: номера сезонов идут не подряд`);
    }
    const episodes = season.episodes ?? [];
    const lastEpisode = episodes.at(-1)?.episode ?? 1;
    const end = [season.season, lastEpisode];
    for (const field of ["short", "normal", "ending"]) {
      if (!season[field]) errors.push(`сезон ${season.season}: нет «${field}»`);
      else checkText(season[field], `сезон ${season.season}, ${field}`, end);
    }
    episodes.forEach((episode, i) => {
      const at = [season.season, episode.episode];
      const where = `серия ${key(at)}`;
      if (episode.episode !== i + 1) warnings.push(`${where}: номера серий идут не подряд`);
      if (!episode.text) errors.push(`${where}: нет текста`);
      else checkText(episode.text, where, at);
      const remember = episode.remember ?? [];
      if (remember.length < 3 || remember.length > 6) {
        warnings.push(`${where}: в «Важно помнить» ${remember.length} пунктов (нужно 3–6)`);
      }
      remember.forEach((line) => checkText(line, `${where}, «Важно помнить»`, at));
    });
  });

  // Герой, которого нигде не упомянули, — скорее всего, опечатка в id
  const allText = JSON.stringify(seasons);
  for (const character of characters) {
    if (!allText.includes(`[[${character.id}|`)) {
      warnings.push(`${character.id}: ни разу не упомянут в тексте`);
    }
  }

  const title = data.title ?? data.name ?? file;
  console.log(
    `${title}: героев ${characters.length}, сезонов ${seasons.length}, ошибок ${errors.length}, предупреждений ${warnings.length}`,
  );
  for (const line of errors) console.log(`  ✗ ${line}`);
  for (const line of warnings) console.log(`  · ${line}`);
  errorCount += errors.length;
  warningCount += warnings.length;
}

console.log(`\nВсего: ошибок ${errorCount}, предупреждений ${warningCount}`);
if (errorCount > 0) process.exitCode = 1;
