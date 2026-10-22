"use client";

import { useId, useState } from "react";
import {
  digitsToSeconds,
  formatDigits,
  formatTime,
  secondsToDigits,
} from "@/lib/progress";

// Поле «на какой минуте остановился». Вводятся только цифры,
// двоеточия расставляются сами: 3412 → 34:12, 10203 → 1:02:03.
export function TimeForm({
  seconds,
  onSave,
}: {
  seconds?: number;
  onSave: (seconds: number | undefined) => void;
}) {
  const inputId = useId();
  const [digits, setDigits] = useState(
    seconds !== undefined ? secondsToDigits(seconds) : "",
  );
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);

  // Время сохранили в другом поле на странице — показываем новое значение
  const [prevSeconds, setPrevSeconds] = useState(seconds);
  if (seconds !== prevSeconds) {
    setPrevSeconds(seconds);
    setDigits(seconds !== undefined ? secondsToDigits(seconds) : "");
    setError(false);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!digits) {
      // Пустое поле: убираем сохранённое время, если оно было
      if (seconds === undefined) return;
      setError(false);
      setSaved(true);
      onSave(undefined);
      return;
    }
    const parsed = digitsToSeconds(digits);
    setError(parsed === null);
    setSaved(parsed !== null);
    if (parsed !== null) {
      setDigits(secondsToDigits(parsed));
      onSave(parsed);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <label htmlFor={inputId} className="text-sm text-white/60">
        Время
      </label>
      <input
        id={inputId}
        value={formatDigits(digits)}
        onChange={(event) => {
          setDigits(event.target.value.replace(/\D/g, "").slice(0, 6));
          setSaved(false);
        }}
        placeholder="34:12"
        inputMode="numeric"
        autoComplete="off"
        // 16px: иначе телефон увеличивает страницу при нажатии на поле
        className="w-28 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-base tabular-nums outline-none placeholder:text-white/30 focus:border-amber-400/60"
      />
      <button
        type="submit"
        // Нечего сохранять: поле пустое и времени ещё не было
        disabled={!digits && seconds === undefined}
        title={!digits ? "Введите время цифрами, например 3412" : undefined}
        className={`rounded-lg border px-3 py-2 text-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${
          saved && !error
            ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-300"
            : "border-white/15 hover:border-amber-400/60"
        }`}
      >
        {saved && !error
          ? seconds === undefined
            ? "✓ Время убрано"
            : "✓ Сохранено"
          : "Сохранить"}
      </button>
      {saved && !error && seconds !== undefined && (
        <span className="text-sm text-white/50">{formatTime(seconds)}</span>
      )}
      {error && (
        <span className="w-full text-sm text-red-400">
          Секунд и минут не может быть больше 59
        </span>
      )}
    </form>
  );
}
