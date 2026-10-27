import Image from "next/image";
import { usableImage } from "@/lib/images";
import type { WatchOption } from "@/lib/poiskkino";

// Кнопки онлайн-кинотеатров, где есть фильм или сериал.
// Ссылки пока ведут как есть — позже их можно заменить на партнёрские
export function WhereToWatch({ options }: { options?: WatchOption[] | null }) {
  // Только рабочие ссылки и без повторов одного сервиса
  const seen = new Set<string>();
  const items = (options ?? []).filter((option) => {
    if (!option.name || !usableImage(option.url) || seen.has(option.name)) {
      return false;
    }
    seen.add(option.name);
    return true;
  });
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-white/50">Где смотреть</span>
      <ul className="flex flex-wrap gap-2">
        {items.map((option) => {
          const logo = usableImage(option.logo?.url);
          return (
            <li key={option.name}>
              <a
                href={option.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-white/15 py-1.5 pl-1.5 pr-3 text-sm transition hover:border-white/40 hover:bg-white/5"
              >
                {logo ? (
                  <Image
                    src={logo}
                    alt=""
                    width={24}
                    height={24}
                    className="size-6 rounded-md object-cover"
                  />
                ) : (
                  <span className="size-6 rounded-md bg-white/10" />
                )}
                {option.name}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
