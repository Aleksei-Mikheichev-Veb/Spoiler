import Image from "next/image";
import Link from "next/link";
import { TYPE_LABELS } from "@/lib/poiskkino";
import type { RelatedItem } from "@/lib/related";

// Продолжения, предыстории и спин-оффы по году выхода — чтобы зритель
// знал, что у истории есть ещё фильм или сериал, и сам решил, смотреть ли
export function RelatedTitles({ items }: { items: RelatedItem[] }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Связанные фильмы и сериалы</h2>
      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {items.map((item) => {
          const card = (
            <>
              <div
                className={`relative aspect-[2/3] overflow-hidden rounded-xl bg-white/5 ${item.current ? "ring-2 ring-amber-400/70" : ""}`}
              >
                {item.posterUrl && (
                  <Image
                    src={item.posterUrl}
                    alt={item.name}
                    fill
                    sizes="128px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex flex-col gap-0.5 text-sm">
                <span className="font-semibold leading-snug">{item.name}</span>
                <span className="text-white/45">
                  {[TYPE_LABELS[item.type], item.year].filter(Boolean).join(" · ")}
                </span>
                {item.current ? (
                  <span className="text-amber-400">Вы здесь</span>
                ) : (
                  item.note && (
                    <span className="leading-snug text-white/65">{item.note}</span>
                  )
                )}
              </div>
            </>
          );
          return (
            <li key={item.id} className="w-32 shrink-0">
              {item.current ? (
                <div className="flex flex-col gap-2">
                  {card}
                </div>
              ) : (
                <Link
                  href={`/title/${item.id}`}
                  className="flex flex-col gap-2 transition hover:opacity-80"
                >
                  {card}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
