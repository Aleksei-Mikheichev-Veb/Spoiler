// Подписи дат для календаря и премьер

export const DAY = 24 * 60 * 60 * 1000;

// Полночь того же дня — чтобы считать «сегодня», «завтра» по календарю
export function startOfDay(time: number): number {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

// «Сегодня», «Завтра», «Вчера» или «пт, 31 октября»
export function dayLabel(time: number, now: number): string {
  const days = Math.round((startOfDay(time) - startOfDay(now)) / DAY);
  if (days === 0) return "Сегодня";
  if (days === 1) return "Завтра";
  if (days === -1) return "Вчера";
  return new Date(time).toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}
