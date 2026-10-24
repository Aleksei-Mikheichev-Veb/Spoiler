// Описание приложения для телефона: с ним сайт можно «установить» —
// добавить на главный экран, и он откроется без адресной строки браузера
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Что было раньше",
    short_name: "Что было",
    description:
      "Пересказы фильмов и сериалов до места, где вы остановились. Без спойлеров.",
    lang: "ru",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0d12",
    theme_color: "#0d0d12",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      {
        src: "/pwa-icon/maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
