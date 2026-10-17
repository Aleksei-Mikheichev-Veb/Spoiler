// Скачивает фото героев из data/recaps/*.json в public/recaps/.
// Сами фото в git не хранятся (на них есть авторские права) — после
// клонирования проекта или перед выкладкой на сервер: npm run photos
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "data", "recaps");
let downloaded = 0;
let skipped = 0;
const failed = [];

for (const file of readdirSync(dataDir).filter((name) => name.endsWith(".json"))) {
  const recap = JSON.parse(readFileSync(path.join(dataDir, file), "utf8"));
  for (const character of recap.characters ?? []) {
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
