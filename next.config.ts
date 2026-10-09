import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Постеры и фото актёров ПоискКино отдаёт с разных доменов
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
