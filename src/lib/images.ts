// Часть картинок ПоискКино берёт с сайтов, недоступных из России
// (у провайдеров image.tmdb.org ведёт на 127.0.0.1). Такие картинки
// не грузятся, поэтому вместо них показываем заглушку.
const BLOCKED_HOSTS = ["image.tmdb.org"];

export function usableImage(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:" || BLOCKED_HOSTS.includes(hostname)) {
      return undefined;
    }
    return url;
  } catch {
    return undefined;
  }
}
