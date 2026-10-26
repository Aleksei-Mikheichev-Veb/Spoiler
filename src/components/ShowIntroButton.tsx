"use client";

import { useRouter } from "next/navigation";
import { introStore } from "@/components/HomeBlocks";

// Вернуть скрытое знакомство на главную и перейти туда
export function ShowIntroButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        introStore.set({ hidden: false });
        router.push("/");
      }}
      className="self-start rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70 transition hover:border-amber-400/60 hover:text-white"
    >
      Показать на главной
    </button>
  );
}
