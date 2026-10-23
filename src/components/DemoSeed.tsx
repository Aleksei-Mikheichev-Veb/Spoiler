"use client";

import { useEffect } from "react";
import demo from "../../data/demo-library.json";
import { applyBackup, isBackup, isEmpty } from "@/lib/backup";

// Здесь запоминаем, какую версию демо-данных уже загрузили (дату выгрузки)
const SEEDED_KEY = "spoiler:demo-seeded";

// Демо-данные для тестировщиков из data/demo-library.json:
// — при первом визите с пустым браузером загружаем их целиком;
// — когда демо-файл обновили, добавляем новую версию к тому, что есть
//   (фильмы из демо заменяются демо-версией, остальное не трогаем).
// Перед настоящим запуском этот компонент нужно убрать.
export function DemoSeed() {
  useEffect(() => {
    // Пустой файл-заготовка — грузить нечего
    if (!isBackup(demo) || Object.keys(demo.library).length === 0) return;
    let seeded: string | null;
    try {
      seeded = window.localStorage.getItem(SEEDED_KEY);
      if (seeded === demo.exportedAt) return;
      window.localStorage.setItem(SEEDED_KEY, demo.exportedAt);
    } catch {
      // Хранилище недоступно — демо-данные всё равно не сохранятся
      return;
    }
    // Первый визит: только в пустой браузер, чтобы не смешивать с чужим.
    // Обновление демо: добавляем к тому, что уже было загружено раньше
    if (seeded || isEmpty()) applyBackup(demo);
  }, []);

  return null;
}
