// Иконки для установки на телефон: /pwa-icon/192, /pwa-icon/512
// и /pwa-icon/maskable (для Android, с запасом по краям)
import { appIcon } from "@/lib/app-icon";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  if (size === "maskable") return appIcon(512, 0.3);
  if (size === "192") return appIcon(192);
  if (size === "512") return appIcon(512);
  return new Response("Not found", { status: 404 });
}
