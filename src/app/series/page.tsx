import type { Metadata } from "next";
import { MyList } from "@/components/MyList";

export const metadata: Metadata = { title: "Мои сериалы" };

export default function SeriesPage() {
  return <MyList kind="series" />;
}
