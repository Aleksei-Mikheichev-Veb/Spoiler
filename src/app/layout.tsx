import type { Metadata } from "next";
import Link from "next/link";
import { Manrope } from "next/font/google";
import { Suspense } from "react";
import { BottomNav } from "@/components/BottomNav";
import { DemoSeed } from "@/components/DemoSeed";
import { HeaderSearch } from "@/components/HeaderSearch";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: {
    default: "Что было раньше — краткие пересказы фильмов и сериалов",
    template: "%s — Что было раньше",
  },
  description:
    "Напомним, что было в прошлых сезонах и частях — ровно до того места, где вы остановились. Без спойлеров.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${manrope.variable} antialiased`}>
        <header className="border-b border-white/10">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
            <Link href="/" className="shrink-0 text-lg font-bold tracking-tight">
              Что было <span className="text-amber-400">раньше</span>
            </Link>
            <HeaderSearch />
          </div>
        </header>
        <DemoSeed />
        {/* Снизу на телефоне — место под нижнюю панель */}
        <main className="mx-auto max-w-5xl px-4 pt-6 pb-28 sm:py-8">
          {children}
        </main>
        {/* useSearchParams требует Suspense, иначе Next не соберёт страницы */}
        <Suspense>
          <BottomNav />
        </Suspense>
      </body>
    </html>
  );
}
