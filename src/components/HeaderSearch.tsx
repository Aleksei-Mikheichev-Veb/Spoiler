"use client";

import { usePathname } from "next/navigation";
import { SearchForm } from "@/components/SearchForm";

// Поиск в шапке. На главной и странице поиска не нужен — там есть свой.
// На телефоне тоже не нужен — там поиск во вкладке нижней панели.
export function HeaderSearch() {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/search") return null;

  return (
    <div className="hidden w-full max-w-sm sm:block">
      <SearchForm compact />
    </div>
  );
}
