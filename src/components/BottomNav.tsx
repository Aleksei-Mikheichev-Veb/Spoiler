"use client";

// Разделы сайта: на телефоне — нижняя панель, на компьютере — меню в шапке
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: { href: string; label: string; icon: React.ReactNode }[] = [
  {
    href: "/",
    label: "Главная",
    icon: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  },
  {
    href: "/series",
    label: "Сериалы",
    icon: (
      <>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="m8 2 4 4 4-4" />
      </>
    ),
  },
  {
    href: "/movies",
    label: "Фильмы",
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4" />
      </>
    ),
  },
  {
    href: "/calendar",
    label: "Календарь",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </>
    ),
  },
  {
    href: "/search",
    label: "Поиск",
    icon: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
  },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Icon({ children, bold }: { children: React.ReactNode; bold: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={bold ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

// Нижняя панель как в приложении — только на телефоне
export function BottomNav() {
  const isActive = useActive();
  // На странице входа разделы ещё недоступны
  if (usePathname() === "/login") return null;

  return (
    <nav
      aria-label="Разделы"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0d0d12]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <ul className="flex">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] transition active:scale-95 ${
                  active ? "text-amber-400" : "text-white/50"
                }`}
              >
                <Icon bold={active}>{item.icon}</Icon>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Меню в шапке — на компьютере. Поиск там отдельным полем, поэтому без него
export function HeaderNav() {
  const isActive = useActive();
  if (usePathname() === "/login") return null;

  return (
    <nav aria-label="Разделы" className="hidden sm:block">
      <ul className="flex gap-1">
        {ITEMS.filter((item) => item.href !== "/search").map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-lg px-3 py-1.5 text-sm transition ${
                  active
                    ? "bg-white/10 font-semibold text-amber-400"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Значок профиля справа в шапке — раздел «Ещё»
export function ProfileLink() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  const active = pathname === "/more";
  return (
    <Link
      href="/more"
      aria-label="Ещё: обратная связь, резервная копия"
      title="Ещё"
      className={`shrink-0 rounded-full p-1.5 transition ${
        active ? "text-amber-400" : "text-white/55 hover:text-white"
      }`}
    >
      <Icon bold={active}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </Icon>
    </Link>
  );
}
