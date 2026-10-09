import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { searchTitles, TYPE_LABELS } from "@/lib/poiskkino";

export const metadata: Metadata = {
  title: "Поиск",
  robots: { index: false },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = ((await searchParams).q ?? "").trim();
  const results = query ? await searchTitles(query) : [];

  return (
    <div className="flex flex-col gap-6">
      <SearchForm defaultValue={query} />

      {query && results.length === 0 && (
        <p className="text-white/60">По запросу «{query}» ничего не нашлось.</p>
      )}

      <ul className="grid gap-3">
        {results.map((item) => (
          <li key={item.id}>
            <Link
              href={`/title/${item.id}`}
              className="flex gap-4 rounded-xl border border-white/10 p-3 transition hover:border-amber-400/50 hover:bg-white/5"
            >
              <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-white/5">
                {item.poster?.previewUrl && (
                  <Image
                    src={item.poster.previewUrl}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-semibold">
                  {item.name || item.alternativeName}
                </span>
                <span className="text-sm text-white/50">
                  {[TYPE_LABELS[item.type], item.year, item.alternativeName]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                {item.shortDescription && (
                  <span className="line-clamp-2 text-sm text-white/70">
                    {item.shortDescription}
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
