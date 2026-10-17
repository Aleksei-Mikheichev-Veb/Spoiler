"use client";

import { useEffect, useId, useState } from "react";

const TYPES = [
  "Ошибка в пересказе",
  "Спойлер",
  "Ошибка в герое",
  "Идея",
  "Другое",
] as const;

// «Нашли ошибку?» — форма отзыва. Пока демо: сообщение никуда
// не отправляется, позже будет уходить в Telegram.
export function FeedbackButton({ context }: { context: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70 transition hover:border-amber-400/60 hover:text-white"
      >
        Нашли ошибку или есть идея?
      </button>
      {open && <FeedbackDialog context={context} onClose={() => setOpen(false)} />}
    </>
  );
}

function FeedbackDialog({
  context,
  onClose,
}: {
  context: string;
  onClose: () => void;
}) {
  const textId = useId();
  const [type, setType] = useState<(typeof TYPES)[number]>(TYPES[0]);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Сообщить об ошибке"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl border border-white/15 bg-[#17171f] p-5 sm:rounded-2xl"
      >
        {sent ? (
          <div className="flex flex-col gap-3 text-center">
            <p className="text-lg font-semibold">Спасибо!</p>
            <p className="text-sm text-white/60">
              Мы прочитаем и поправим. (Пока это демо — сообщение никуда не
              отправляется.)
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-amber-400 py-3 font-semibold text-black transition hover:bg-amber-300"
            >
              Закрыть
            </button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setSent(true);
            }}
          >
            <div>
              <h3 className="text-lg font-semibold">Нашли ошибку?</h3>
              <p className="text-sm text-white/50">{context}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {TYPES.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={type === item}
                  onClick={() => setType(item)}
                  className={`rounded-full px-3 py-1.5 text-sm transition ${
                    type === item
                      ? "bg-amber-400 font-semibold text-black"
                      : "border border-white/15 text-white/70 hover:text-white"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <label htmlFor={textId} className="sr-only">
              Сообщение
            </label>
            <textarea
              id={textId}
              value={text}
              onChange={(event) => setText(event.target.value)}
              required
              rows={4}
              placeholder="Что не так? Например: «Тилли погибла в 7 серии, а не в 8»"
              className="resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none placeholder:text-white/30 focus:border-amber-400/60"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/15 py-3 text-sm"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-amber-400 py-3 font-semibold text-black transition hover:bg-amber-300"
              >
                Отправить
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
