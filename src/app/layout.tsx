import type { Metadata } from "next";
import Link from "next/link";
import { Manrope } from "next/font/google";
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
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
