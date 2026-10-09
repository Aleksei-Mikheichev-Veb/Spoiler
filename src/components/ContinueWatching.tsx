"use client";

import Image from "next/image";
import Link from "next/link";
import {
  describeProgress,
  removeProgress,
  useAllProgress,
} from "@/lib/progress";

// Блок «Продолжить просмотр» на главной
export function ContinueWatching() {
  const items = useAllProgress();
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Продолжить просмотр</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-xl border border-white/10 p-3"
          >
            <Link
              href={`/title/${item.id}`}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-white/5">
                {item.posterUrl && (
                  <Image
                    src={item.posterUrl}
                    alt=""
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-semibold">
                  {item.name}
                  {item.year ? (
                    <span className="font-normal text-white/40">
                      {" "}
                      ({item.year})
                    </span>
                  ) : null}
                </span>
                <span className="truncate text-sm text-amber-400">
                  {describeProgress(item) || "Метка без времени"}
                </span>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => removeProgress(item.id)}
              aria-label={`Убрать «${item.name}» из списка`}
              className="shrink-0 rounded-md px-2 py-1 text-white/30 transition hover:text-white/70"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
