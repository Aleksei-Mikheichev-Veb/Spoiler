// Размечает в пересказах все упоминания героев, а не только первое:
// на любое имя в тексте можно навести и увидеть карточку.
// Формы имён берёт из уже размеченных мест ([[id|форма]]), поэтому
// ничего не придумывает: если форма нигде не размечена, её не тронет.
// Форму, которой размечены разные герои (например, «Эйгон»), пропускает.
// Форма размечается не раньше, чем её впервые разметили вручную: иначе
// «Саурон» в 1 сезоне «Колец власти» стал бы ссылкой на Халбранда.
//
// Запуск: node scripts/link-mentions.mjs          — показать, что изменится
//         node scripts/link-mentions.mjs --write  — записать
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const write = process.argv.includes("--write");
const root = process.cwd();
const files = ["recaps", "franchises"].flatMap((folder) => {
  const dir = path.join(root, "data", folder);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join("data", folder, name));
});

const MENTION = /\[\[([a-z0-9-]+)\|([^\]]+)\]\]/g;
const notAfter = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1]);
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Все тексты файла вместе с границей: до какой серии можно упоминать
function* texts(data) {
  for (const season of data.seasons ?? []) {
    const last = Math.max(...season.episodes.map((episode) => episode.episode));
    for (const field of ["short", "normal", "ending"]) {
      if (season[field]) yield { holder: season, field, boundary: [season.season, last] };
    }
    for (const episode of season.episodes) {
      const boundary = [season.season, episode.episode];
      yield { holder: episode, field: "text", boundary };
      for (let index = 0; index < (episode.remember ?? []).length; index++) {
        yield { holder: episode.remember, field: index, boundary };
      }
    }
  }
}

let total = 0;
for (const file of files) {
  const data = JSON.parse(readFileSync(path.join(root, file), "utf8"));
  const firstSeen = new Map(
    (data.characters ?? []).map((character) => [character.id, character.about[0].from]),
  );

  // Формы имён: только с заглавной буквы (имена, а не «отцом», «мать»)
  // и с серии, где форму впервые разметили вручную
  const owners = new Map();
  const since = new Map();
  for (const { holder, field, boundary } of texts(data)) {
    for (const [, id, label] of holder[field].matchAll(MENTION)) {
      if (!/^\p{Lu}/u.test(label) || !firstSeen.has(id)) continue;
      if (!owners.has(label)) owners.set(label, new Set());
      owners.get(label).add(id);
      if (!since.has(label) || notAfter(boundary, since.get(label))) {
        since.set(label, boundary);
      }
    }
  }
  const forms = [...owners]
    .filter(([, ids]) => ids.size === 1)
    .map(([label, ids]) => [label, [...ids][0]])
    .sort((a, b) => b[0].length - a[0].length);
  if (forms.length === 0) continue;
  const pattern = new RegExp(
    `(?<!\\p{L})(${forms.map(([label]) => escape(label)).join("|")})(?!\\p{L})`,
    "gu",
  );
  const idOf = new Map(forms);

  let count = 0;
  const examples = [];
  for (const { holder, field, boundary } of texts(data)) {
    const before = holder[field];
    const after = before
      .split(/(\[\[[^\]]+\]\])/)
      .map((part) =>
        part.startsWith("[[")
          ? part
          : part.replace(pattern, (label) => {
              const id = idOf.get(label);
              if (!notAfter(since.get(label), boundary)) return label;
              count++;
              if (examples.length < 5) examples.push(`${label} → ${id}`);
              return `[[${id}|${label}]]`;
            }),
      )
      .join("");
    holder[field] = after;
  }
  total += count;
  console.log(`${data.title ?? data.name ?? file}: новых ссылок ${count}${examples.length ? ` (например: ${examples.join(", ")})` : ""}`);
  if (write && count > 0) {
    writeFileSync(path.join(root, file), JSON.stringify(data, null, 2) + "\n");
  }
}
console.log(write ? `Записано ссылок: ${total}` : `Всего будет ссылок: ${total}. Запишите: --write`);
