"use client";

import { usePathname } from "next/navigation";
import { SearchForm } from "@/components/SearchForm";

// Поиск в шапке. На главной и странице поиска не нужен — там есть свой.
export function HeaderSearch() {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/search") return null;

  return (
    <div className="w-full max-w-sm">
      <SearchForm compact />
    </div>
  );
}
