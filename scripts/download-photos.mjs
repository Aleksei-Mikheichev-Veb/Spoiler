// Скачивает фото героев из data/recaps/*.json и data/franchises/*.json
// в public/recaps/.
// Сами фото в git не хранятся (на них есть авторские права) — после
// клонирования проекта или перед выкладкой на сервер: npm run photos
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataFiles = ["recaps", "franchises"].flatMap((folder) => {
  const dir = path.join(root, "data", folder);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(dir, name));
});
let downloaded = 0;
let skipped = 0;
const failed = [];

for (const file of dataFiles) {
  const recap = JSON.parse(readFileSync(file, "utf8"));
  // Основное фото героя и фото из смены актёров (portraits)
  const images = (recap.characters ?? []).flatMap((character) => [
    { ...character },
    ...(character.portraits ?? []).map((portrait) => ({
      id: `${character.id} (${portrait.actor})`,
      photo: portrait.photo,
      photoSource: portrait.photoSource,
    })),
  ]);
  for (const character of images) {
    if (!character.photo || !character.photoSource) continue;
    const target = path.join(root, "public", character.photo);
    if (existsSync(target)) {
      skipped++;
      continue;
    }
    mkdirSync(path.dirname(target), { recursive: true });
    // Серверы Кинопоиска иногда отвечают медленно — до трёх попыток
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(character.photoSource, {
          signal: AbortSignal.timeout(30_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        writeFileSync(target, Buffer.from(await res.arrayBuffer()));
        downloaded++;
        break;
      } catch (error) {
        if (attempt === 3) failed.push(`${character.id}: ${error.message}`);
      }
    }
  }
}

console.log(`Скачано: ${downloaded}, уже были: ${skipped}`);
if (failed.length) {
  console.log(`Не удалось: ${failed.join("; ")}`);
  process.exitCode = 1;
}
