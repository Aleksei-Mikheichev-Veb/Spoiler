// Метки «где я остановился». Пока хранятся в браузере (localStorage),
// позже переедут в аккаунт пользователя.
// Используется только из клиентских компонентов.
import { createLocalStore } from "@/lib/local-store";

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

const store = createLocalStore<Record<string, Progress>>(
  "spoiler:progress",
  {},
);

export function useAllProgress(): Progress[] {
  return Object.values(store.use()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function useProgress(titleId: number): Progress | undefined {
  return store.use()[titleId];
}

export function saveProgress(
  title: TitleInfo,
  mark: Pick<
    Progress,
    "season" | "episode" | "episodeName" | "seconds" | "watched"
  >,
) {
  store.set({
    ...store.get(),
    [title.id]: { ...title, ...mark, updatedAt: Date.now() },
  });
}

export function removeProgress(titleId: number) {
  const map = { ...store.get() };
  delete map[titleId];
  store.set(map);
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
