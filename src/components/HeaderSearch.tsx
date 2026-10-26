"use client";

import { usePathname } from "next/navigation";
import { SearchForm } from "@/components/SearchForm";

// Поиск в шапке — на компьютере. На странице поиска не нужен: там свой.
// На телефоне поиск во вкладке нижней панели.
export function HeaderSearch() {
  const pathname = usePathname();
  if (pathname === "/search" || pathname === "/login") return null;

  return (
    <div className="hidden w-full max-w-xs sm:block">
      <SearchForm compact />
    </div>
  );
}
