"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { parseHomeTab } from "@/lib/home-tab";

type NavId = "now" | "lists" | "search" | "more";

const ITEMS: { id: NavId; href: string; label: string; icon: React.ReactNode }[] = [
  {
    id: "now",
    href: "/",
    label: "Сейчас",
    icon: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  },
  {
    id: "lists",
    href: "/?tab=lists",
    label: "Списки",
    icon: <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />,
  },
  {
    id: "search",
    href: "/search",
    label: "Поиск",
    icon: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
  },
  {
    id: "more",
    href: "/?tab=more",
    label: "Ещё",
    icon: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
  },
];

// Нижняя панель как в приложении — только на телефоне
export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active: NavId | null =
    pathname === "/"
      ? parseHomeTab(searchParams.get("tab") ?? undefined)
      : pathname === "/search"
        ? "search"
        : null;

  return (
    <nav
      aria-label="Разделы"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0d0d12]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <ul className="flex">
        {ITEMS.map((item) => {
          const isActive = item.id === active;
          return (
            <li key={item.id} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] transition active:scale-95 ${
                  isActive ? "text-amber-400" : "text-white/50"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={isActive ? 2.2 : 1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {item.icon}
                </svg>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
