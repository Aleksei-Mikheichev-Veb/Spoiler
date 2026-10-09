// Метки «где я остановился». Пока хранятся в браузере (localStorage),
// позже переедут в аккаунт пользователя.
// Используется только из клиентских компонентов.
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "spoiler:progress";
const CHANGE_EVENT = "spoiler:progress-change";

export interface TitleInfo {
  id: number;
  name: string;
  year?: number;
  posterUrl?: string;
  isSeries: boolean;
}

export interface Progress extends TitleInfo {
  season?: number;
  episode?: number;
  episodeName?: string;
  // Секунды от начала серии или фильма
  seconds?: number;
  // Отмеченная серия досмотрена до конца, а следующей ещё нет —
  // сериал ждёт новый сезон
  watched?: boolean;
  updatedAt: number;
}

type ProgressMap = Record<string, Progress>;

const EMPTY: ProgressMap = {};

// localStorage может быть недоступен (приватный режим, запрет cookies),
// поэтому все обращения обёрнуты в try/catch.
function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

let cachedRaw: string | null = null;
let cachedMap: ProgressMap = EMPTY;

// useSyncExternalStore требует один и тот же объект, пока данные не менялись
function getSnapshot(): ProgressMap {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedMap = raw ? (JSON.parse(raw) as ProgressMap) : EMPTY;
    } catch {
      cachedMap = EMPTY;
    }
  }
  return cachedMap;
}

function getServerSnapshot(): ProgressMap {
  return EMPTY;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function write(map: ProgressMap) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Не удалось сохранить — метка проживёт до перезагрузки страницы
    cachedRaw = JSON.stringify(map);
    cachedMap = map;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useAllProgress(): Progress[] {
  const map = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return Object.values(map).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function useProgress(titleId: number): Progress | undefined {
  const map = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return map[titleId];
}

export function saveProgress(
  title: TitleInfo,
  mark: Pick<
    Progress,
    "season" | "episode" | "episodeName" | "seconds" | "watched"
  >,
) {
  write({
    ...getSnapshot(),
    [title.id]: { ...title, ...mark, updatedAt: Date.now() },
  });
}

export function removeProgress(titleId: number) {
  const map = { ...getSnapshot() };
  delete map[titleId];
  write(map);
}

// Время вводится только цифрами и заполняется справа, как на таймере:
// «45» → 0:45, «3412» → 34:12, «10203» → 1:02:03.
export function formatDigits(digits: string): string {
  if (digits.length <= 2) return digits;
  const seconds = digits.slice(-2);
  const rest = digits.slice(0, -2);
  if (rest.length <= 2) return `${rest}:${seconds}`;
  return `${rest.slice(0, -2)}:${rest.slice(-2)}:${seconds}`;
}

// Возвращает null, если секунд (или минут при указанных часах) больше 59
export function digitsToSeconds(digits: string): number | null {
  if (!/^\d{1,6}$/.test(digits)) return null;
  const padded = digits.padStart(6, "0");
  const h = Number(padded.slice(0, 2));
  const m = Number(padded.slice(2, 4));
  const s = Number(padded.slice(4, 6));
  if (s >= 60 || (h > 0 && m >= 60)) return null;
  return h * 3600 + m * 60 + s;
}

export function secondsToDigits(seconds: number): string {
  return formatTime(seconds).replace(/:/g, "");
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function describeProgress(progress: Progress): string {
  const parts: string[] = [];
  if (progress.season && progress.episode) {
    parts.push(`Сезон ${progress.season}, серия ${progress.episode}`);
  }
  if (progress.watched) {
    parts.push("досмотрено");
  } else if (progress.seconds !== undefined) {
    parts.push(formatTime(progress.seconds));
  }
  return parts.join(" · ");
}
