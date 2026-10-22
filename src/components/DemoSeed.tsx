"use client";

import { useEffect } from "react";
import demo from "../../data/demo-library.json";
import { applyBackup, isBackup, isEmpty } from "@/lib/backup";

const SEEDED_KEY = "spoiler:demo-seeded";

// Демо-данные для тестировщиков: при первом визите с пустым браузером
// загружаем пример меток, списков и оценок из data/demo-library.json.
// Один раз — если человек потом что-то удалит, данные не вернутся.
// Перед настоящим запуском этот компонент нужно убрать.
export function DemoSeed() {
  useEffect(() => {
    // Пустой файл-заготовка — грузить нечего, и отметку не ставим,
    // чтобы настоящие демо-данные подхватились, когда появятся
    if (!isBackup(demo) || Object.keys(demo.library).length === 0) return;
    try {
      if (window.localStorage.getItem(SEEDED_KEY)) return;
      window.localStorage.setItem(SEEDED_KEY, "1");
    } catch {
      // Хранилище недоступно — демо-данные всё равно не сохранятся
      return;
    }
    if (isEmpty()) applyBackup(demo);
  }, []);

  return null;
}
