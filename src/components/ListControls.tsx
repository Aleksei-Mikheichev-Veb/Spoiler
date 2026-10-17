"use client";

import {
  addToLibrary,
  removeFromLibrary,
  setStatus,
  STATUS_LABELS,
  toggleCompany,
  useCompanies,
  useLibraryEntry,
  type Status,
} from "@/lib/library";
import { useProgress, type TitleInfo } from "@/lib/progress";

const STATUSES: Status[] = ["want", "watching", "done", "dropped"];

// «В список» на карточке: статус и с кем смотрю
export function ListControls({
  title,
  summary,
}: {
  title: TitleInfo;
  summary: string;
}) {
  const entry = useLibraryEntry(title.id);
  const progress = useProgress(title.id);
  const companies = useCompanies();

  if (!entry) {
    return (
      <button
        type="button"
        // Если уже есть метка — значит, уже смотрит
        onClick={() => addToLibrary(title, progress ? "watching" : "want", summary)}
        className="self-start rounded-xl border border-amber-400/60 px-4 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-400/10"
      >
        + В мои списки
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 p-3">
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((status) => (
          <Chip
            key={status}
            active={entry.status === status}
            onClick={() => setStatus(title.id, status)}
          >
            {STATUS_LABELS[status]}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-sm text-white/50">С кем:</span>
        {companies.map((company) => (
          <Chip
            key={company.id}
            active={entry.companies.includes(company.id)}
            onClick={() => toggleCompany(title.id, company.id)}
          >
            {company.name}
          </Chip>
        ))}
      </div>
      <button
        type="button"
        onClick={() => removeFromLibrary(title.id)}
        className="self-start text-xs text-white/40 underline-offset-4 hover:text-white/70 hover:underline"
      >
        Убрать из списков
      </button>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm transition ${
        active
          ? "bg-amber-400 font-semibold text-black"
          : "border border-white/15 text-white/70 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
