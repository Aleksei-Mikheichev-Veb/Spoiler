import type { Metadata } from "next";
import { BackupControls } from "@/components/BackupControls";
import { FeedbackButton } from "@/components/FeedbackButton";
import { ShowIntroButton } from "@/components/ShowIntroButton";

export const metadata: Metadata = { title: "Ещё" };

// Значок профиля в шапке. Когда появятся аккаунты, здесь будет профиль
export default function MorePage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold sm:text-3xl">Ещё</h1>

      <section className="flex flex-col gap-3 rounded-2xl border border-white/10 p-4">
        <div>
          <h2 className="font-semibold">Обратная связь</h2>
          <p className="text-sm text-white/50">
            Нашли ошибку в пересказе или есть идея — напишите, мы прочитаем.
          </p>
        </div>
        <FeedbackButton context="раздел «Ещё»" />
      </section>

      <BackupControls />

      <section className="flex flex-col gap-3 rounded-2xl border border-white/10 p-4">
        <div>
          <h2 className="font-semibold">Что умеет сервис</h2>
          <p className="text-sm text-white/50">
            Знакомство с сервисом на главной, если вы его скрыли.
          </p>
        </div>
        <ShowIntroButton />
      </section>
    </div>
  );
}
