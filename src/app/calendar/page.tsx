import type { Metadata } from "next";
import { CalendarView } from "@/components/CalendarView";

export const metadata: Metadata = { title: "Календарь" };

export default function CalendarPage() {
  return <CalendarView />;
}
