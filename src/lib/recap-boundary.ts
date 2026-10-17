// Граница спойлеров: до какой серии пользователю можно рассказывать.
// Используется только из клиентских компонентов.
import { airedEpisodes, isAfter, type EpisodeKey } from "@/lib/episodes";
import type { Season } from "@/lib/poiskkino";
import { useProgress } from "@/lib/progress";
import type { Character, CharacterSnapshot } from "@/lib/recaps";

export interface RecapBoundary {
  // Метка пользователя
  mark: EpisodeKey | null;
  // Последняя полностью просмотренная серия. Начатую серию не считаем:
  // человек её ещё не досмотрел.
  last: EpisodeKey | undefined;
  watched: boolean;
}

export function useRecapBoundary(
  titleId: number,
  seasons: Season[],
  now: number,
): RecapBoundary {
  const progress = useProgress(titleId);
  const mark: EpisodeKey | null =
    progress?.season && progress?.episode
      ? [progress.season, progress.episode]
      : null;
  if (!mark) return { mark, last: undefined, watched: false };

  const watched = Boolean(progress?.watched);
  const last = watched
    ? mark
    : airedEpisodes(seasons, now)
        .filter((key) => isAfter(mark, key))
        .at(-1);
  return { mark, last, watched };
}

// Что можно рассказать о герое к этому моменту. undefined — герой
// ещё не появился, и упоминать его нельзя.
export function snapshotAt(
  character: Character,
  last: EpisodeKey | undefined,
): CharacterSnapshot | undefined {
  // Пока ничего не досмотрено, показываем только тех, кто есть в первой серии
  const boundary: EpisodeKey = last ?? [1, 1];
  return character.about.filter((item) => !isAfter(item.from, boundary)).at(-1);
}
