import type { Metadata } from "next";
import { MyList } from "@/components/MyList";

export const metadata: Metadata = { title: "Мои фильмы" };

export default function MoviesPage() {
  return <MyList kind="movies" />;
}
