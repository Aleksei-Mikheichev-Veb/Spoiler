"use client";

import Image from "next/image";
import { Fragment, useEffect, useRef, useState } from "react";
import { isAfter, type EpisodeKey } from "@/lib/episodes";
import { snapshotAt, useRecapBoundary } from "@/lib/recap-boundary";
import type { Season } from "@/lib/poiskkino";
import type { Character, Face } from "@/lib/recaps";

// Герой с описанием, которое можно показать к текущему моменту
export interface KnownCharacter {
  character: Character;
  text: string;
  // Лицо и актёр пока скрыты — иначе спойлер
  hidden: boolean;
  // Лица, которые уже можно показать (у героев из двух времён)
  faces: Face[];
}

export type KnownCharacters = Map<string, KnownCharacter>;

export function knownCharacters(
  characters: Character[],
  last: EpisodeKey | undefined,
): KnownCharacters {
  const known: KnownCharacters = new Map();
  for (const character of characters) {
    const snapshot = snapshotAt(character, last);
    if (!snapshot) continue;
    const hidden = Boolean(
      character.revealFrom && (!last || isAfter(character.revealFrom, last)),
    );
    // Если актёр сменился по ходу сериала — берём того, кто играет сейчас
    const boundary: EpisodeKey = last ?? [1, 1];
    const portrait = character.portraits
      ?.filter((item) => !isAfter(item.from, boundary))
      .at(-1);
    const current = portrait
      ? { ...character, actor: portrait.actor, photo: portrait.photo }
      : { ...character };
    const faces = hidden
      ? []
      : (character.faces ?? []).filter((face) => !isAfter(face.from, boundary));
    // Пока открыто одно лицо — обычная карточка с ним
    if (faces.length === 1) {
      current.actor = faces[0].actor;
      current.photo = faces[0].photo;
    }
    known.set(character.id, {
      faces: faces.length > 1 ? faces : [],
      // Фото и актёра убираем прямо из данных, чтобы они не попали в разметку
      character: hidden
        ? { ...current, photo: undefined, actor: undefined }
        : current,
      text: snapshot.text,
      hidden,
    });
  }
  return known;
}

// Текст пересказа, где упоминания героев размечены как [[id|Имя]]
export function RichText({
  text,
  known,
}: {
  text: string;
  known: KnownCharacters;
}) {
  const parts = text.split(/(\[\[[a-z0-9-]+\|[^\]]+\]\])/g);
  return (
    <>
      {parts.map((part, index) => {
        const match = part.match(/^\[\[([a-z0-9-]+)\|([^\]]+)\]\]$/);
        if (!match) return <Fragment key={index}>{part}</Fragment>;
        const [, id, label] = match;
        const entry = known.get(id);
        // Герой ещё не появился к метке — выводим просто текст
        if (!entry) return <Fragment key={index}>{label}</Fragment>;
        return <CharacterLink key={index} label={label} entry={entry} />;
      })}
    </>
  );
}

// Имя героя: на компьютере карточка всплывает при наведении,
// на телефоне — выезжает снизу по нажатию
function CharacterLink({
  label,
  entry,
}: {
  label: string;
  entry: KnownCharacter;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [popover, setPopover] = useState<{
    top: number;
    left: number;
    // Карточка над именем, чтобы курсор её не закрывал. Если сверху
    // не хватает места — под именем
    above: boolean;
  } | null>(null);
  const [sheet, setSheet] = useState(false);

  // Карточка привязана к месту на экране — при прокрутке прячем её
  useEffect(() => {
    if (!popover) return;
    const close = () => setPopover(null);
    window.addEventListener("scroll", close, { passive: true });
    return () => window.removeEventListener("scroll", close);
  }, [popover]);

  function openPopover() {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 288;
    // Примерная высота карточки с фото
    const above = rect.top > 160;
    setPopover({
      top: above ? rect.top - 8 : rect.bottom + 8,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      above,
    });
  }

  function handleClick() {
    // На устройствах без мыши наведения нет — показываем карточку снизу
    if (window.matchMedia("(hover: none)").matches) {
      setSheet(true);
    } else if (popover) {
      setPopover(null);
    } else {
      openPopover();
    }
  }

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") openPopover();
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setPopover(null);
        }}
        onBlur={() => setPopover(null)}
        className="inline cursor-pointer border-b border-dotted border-amber-400/70 text-inherit transition hover:text-amber-300"
      >
        {label}
      </button>
      {popover && (
        // Сдвиг вверх — на внешнем блоке, анимация — на внутреннем:
        // иначе анимация перебивает сдвиг и карточка прыгает
        <div
          role="tooltip"
          style={{
            top: popover.top,
            left: popover.left,
            transform: popover.above ? "translateY(-100%)" : undefined,
          }}
          className="pointer-events-none fixed z-50 w-72"
        >
          <div className="animate-pop-in rounded-xl border border-white/15 bg-[#17171f] p-3 shadow-2xl">
            <CharacterCard entry={entry} />
          </div>
        </div>
      )}
      {sheet && <CharacterSheet entry={entry} onClose={() => setSheet(false)} />}
    </>
  );
}

// Карточка, выезжающая снизу экрана на телефоне
function CharacterSheet({
  entry,
  onClose,
}: {
  entry: KnownCharacter;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-end bg-black/60"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={entry.character.name}
        onClick={(event) => event.stopPropagation()}
        className="w-full animate-sheet-up rounded-t-2xl border-t border-white/15 bg-[#17171f] p-4 pb-8"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
        <CharacterCard entry={entry} />
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl border border-white/15 py-3 text-sm"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}

// Герой из двух времён: лица рядом, под каждым — когда и кто играет
function FacesRow({ faces, name }: { faces: Face[]; name: string }) {
  return (
    <ul className="grid grid-cols-2 gap-2">
      {faces.map((face) => (
        <li key={face.label} className="flex min-w-0 gap-2">
          <Portrait
            character={{ id: face.label, name, photo: face.photo, about: [] }}
            className="h-16 w-12"
            sizes="48px"
          />
          <div className="flex min-w-0 flex-col text-xs leading-tight">
            <span className="text-white/70">{face.label}</span>
            <span className="text-white/45">{face.actor}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CharacterCard({ entry }: { entry: KnownCharacter }) {
  const { character, text } = entry;
  if (entry.faces.length > 0) {
    return (
      <div className="flex flex-col gap-2 text-left">
        <span className="font-semibold text-white">{character.name}</span>
        <FacesRow faces={entry.faces} name={character.name} />
        <span className="text-sm leading-snug text-white/80">{text}</span>
      </div>
    );
  }
  return (
    <div className="flex gap-3 text-left">
      <Portrait
        character={character}
        hidden={entry.hidden}
        className="h-24 w-[72px]"
        sizes="72px"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-semibold text-white">{character.name}</span>
        {character.actor && (
          <span className="text-xs text-white/45">актёр: {character.actor}</span>
        )}
        <span className="text-sm leading-snug text-white/80">{text}</span>
      </div>
    </div>
  );
}

function Portrait({
  character,
  hidden = false,
  className,
  sizes,
}: {
  character: Character;
  hidden?: boolean;
  className: string;
  sizes: string;
}) {
  // Скрытое лицо — знак вопроса, иначе инициалы, если нет фото
  const initials = hidden
    ? "?"
    : character.name
        .split(" ")
        .map((word) => word[0])
        .slice(0, 2)
        .join("");
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg bg-white/10 ${className}`}
    >
      {character.photo ? (
        <Image
          src={character.photo}
          alt=""
          fill
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-white/40">
          {initials}
        </span>
      )}
    </div>
  );
}

// Блок «Персонажи» для сериалов с нашей базой героев:
// только те, кто уже появился к метке, с описанием на этот момент
export function CharacterGrid({
  titleId,
  characters,
  seasons,
  now,
}: {
  titleId: number;
  characters: Character[];
  seasons: Season[];
  now: number;
}) {
  const { last } = useRecapBoundary(titleId, seasons, now);
  return (
    <CharacterList
      characters={characters}
      last={last}
      hint={
        last
          ? "Только те, кого вы уже видели, — без спойлеров."
          : "Главные герои первой серии. Отметьте, где остановились, — и список дополнится."
      }
    />
  );
}

// Список героев, известных к моменту last (сериал или киновселенная)
export function CharacterList({
  characters,
  last,
  hint,
}: {
  characters: Character[];
  last: EpisodeKey | undefined;
  hint: string;
}) {
  const known = [...knownCharacters(characters, last).values()];
  if (known.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold">Персонажи</h2>
        <p className="text-sm text-white/50">{hint}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {known.map((entry) =>
          entry.faces.length > 0 ? (
            <li
              key={entry.character.id}
              className="flex flex-col gap-2 rounded-xl border border-white/10 p-3"
            >
              <span className="font-semibold">{entry.character.name}</span>
              <FacesRow faces={entry.faces} name={entry.character.name} />
              <span className="text-sm leading-snug text-white/75">
                {entry.text}
              </span>
            </li>
          ) : (
          <li
            key={entry.character.id}
            className="flex gap-3 rounded-xl border border-white/10 p-3"
          >
            <Portrait
              character={entry.character}
              hidden={entry.hidden}
              className="h-20 w-[60px]"
              sizes="60px"
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-semibold">{entry.character.name}</span>
              {entry.character.actor && (
                <span className="text-xs text-white/45">
                  {entry.character.actor}
                </span>
              )}
              <span className="text-sm leading-snug text-white/75">
                {entry.text}
              </span>
            </div>
          </li>
          ),
        )}
      </ul>
    </section>
  );
}
