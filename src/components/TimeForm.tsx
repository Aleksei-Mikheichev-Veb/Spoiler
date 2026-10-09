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
        className="w-28 rounded-lg border border-white/10 bg-white/5 px-3 py-2 tabular-nums outline-none placeholder:text-white/30 focus:border-amber-400/60"
      />
      <button
        type="submit"
        className="rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:border-amber-400/60"
      >
        Сохранить
      </button>
      {saved && !error && (
        <span className="text-sm text-amber-400">
          {seconds !== undefined ? `Запомнили ${formatTime(seconds)}` : "Готово"}
        </span>
      )}
      {error && (
        <span className="w-full text-sm text-red-400">
          Секунд и минут не может быть больше 59
        </span>
      )}
    </form>
  );
}
