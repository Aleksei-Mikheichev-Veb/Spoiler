"use client";

import { useRef, useState } from "react";
import { applyBackup, createBackup, isBackup } from "@/lib/backup";

// Резервная копия меток, списков и оценок: сохранить в файл и загрузить
export function BackupControls() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handleExport() {
    const backup = createBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `moi-spiski-${backup.exportedAt.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    const count = Object.keys(backup.library).length;
    setMessage(`Сохранено в файл: ${count} фильмов и сериалов.`);
  }

  async function handleImport(file: File) {
    try {
      const data: unknown = JSON.parse(await file.text());
      if (!isBackup(data)) {
        setMessage("Это не файл со списками — выберите файл, сохранённый здесь.");
        return;
      }
      const count = applyBackup(data);
      setMessage(`Загружено: ${count} фильмов и сериалов. Ваши прежние списки сохранены.`);
    } catch {
      setMessage("Не получилось прочитать файл. Возможно, он повреждён.");
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 p-4">
      <div>
        <h2 className="font-semibold">Резервная копия</h2>
        <p className="text-sm text-white/50">
          Метки, списки и оценки хранятся только в этом браузере. Сохраните их
          в файл, чтобы не потерять или перенести на другое устройство.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:border-amber-400/60"
        >
          Сохранить в файл
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:border-amber-400/60"
        >
          Загрузить из файла
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleImport(file);
            // Чтобы можно было выбрать тот же файл ещё раз
            event.target.value = "";
          }}
        />
      </div>
      {message && <p className="text-sm text-amber-400">{message}</p>}
    </section>
  );
}
