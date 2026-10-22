// Резервная копия меток, списков и оценок — для файла и демо-данных.
// Используется только из клиентских компонентов.
import {
  getLibraryBackup,
  mergeLibrary,
  type Company,
  type LibraryEntry,
} from "@/lib/library";
import { getProgressMap, mergeProgress, type Progress } from "@/lib/progress";

// version — чтобы потом можно было менять формат и не ломать старые копии
export interface Backup {
  app: "spoiler";
  version: 1;
  exportedAt: string;
  progress: Record<string, Progress>;
  library: Record<string, LibraryEntry>;
  companies: Company[];
}

export function isBackup(data: unknown): data is Backup {
  const backup = data as Backup;
  return (
    typeof backup === "object" &&
    backup !== null &&
    backup.app === "spoiler" &&
    typeof backup.progress === "object" &&
    typeof backup.library === "object" &&
    Array.isArray(backup.companies)
  );
}

export function createBackup(): Backup {
  return {
    app: "spoiler",
    version: 1,
    exportedAt: new Date().toISOString(),
    progress: getProgressMap(),
    ...getLibraryBackup(),
  };
}

// Добавляет данные из копии к уже имеющимся. Возвращает, сколько
// фильмов и сериалов в ней было
export function applyBackup(backup: Backup): number {
  mergeProgress(backup.progress);
  mergeLibrary(backup.library, backup.companies);
  return new Set([
    ...Object.keys(backup.library),
    ...Object.keys(backup.progress),
  ]).size;
}

export function isEmpty(): boolean {
  const { library } = getLibraryBackup();
  return (
    Object.keys(library).length === 0 &&
    Object.keys(getProgressMap()).length === 0
  );
}
