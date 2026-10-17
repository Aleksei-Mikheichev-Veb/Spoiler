// Хранилище в браузере (localStorage), на которое можно подписаться
// из React. Пока у нас нет аккаунтов, так хранятся метки и списки.
// Используется только из клиентских компонентов.
import { useSyncExternalStore } from "react";

export interface LocalStore<T> {
  use(): T;
  get(): T;
  set(value: T): void;
}

export function createLocalStore<T>(key: string, fallback: T): LocalStore<T> {
  const changeEvent = `${key}:change`;
  let cachedRaw: string | null = null;
  let cachedValue: T = fallback;

  // localStorage может быть недоступен (приватный режим, запрет cookies),
  // поэтому все обращения обёрнуты в try/catch
  function readRaw(): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return cachedRaw;
    }
  }

  // useSyncExternalStore требует один и тот же объект, пока данные не менялись
  function get(): T {
    const raw = readRaw();
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      try {
        cachedValue = raw ? (JSON.parse(raw) as T) : fallback;
      } catch {
        cachedValue = fallback;
      }
    }
    return cachedValue;
  }

  function set(value: T) {
    const raw = JSON.stringify(value);
    try {
      window.localStorage.setItem(key, raw);
    } catch {
      // Не удалось сохранить — данные проживут до перезагрузки страницы
    }
    cachedRaw = raw;
    cachedValue = value;
    window.dispatchEvent(new Event(changeEvent));
  }

  function subscribe(onChange: () => void) {
    window.addEventListener("storage", onChange);
    window.addEventListener(changeEvent, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(changeEvent, onChange);
    };
  }

  return {
    use: () => useSyncExternalStore(subscribe, get, () => fallback),
    get,
    set,
  };
}
