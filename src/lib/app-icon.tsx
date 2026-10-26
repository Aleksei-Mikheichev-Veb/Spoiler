// Иконка приложения: жёлтый знак «перемотка назад» на тёмном фоне.
// Рисуется кодом (next/og), поэтому отдельные файлы картинок не нужны.
import { ImageResponse } from "next/og";

// padding — доля пустого края. Для «маскируемой» иконки Android край
// нужен побольше: система сама обрезает её кругом или скруглённым квадратом
export function appIcon(size: number, padding = 0.22) {
  const inner = Math.round(size * (1 - padding * 2));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d0d12",
        }}
      >
        {/* Треугольники «тяжелее» справа, где у них основание, поэтому
            знак сдвинут чуть влево — так он выглядит ровно по центру */}
        <svg width={inner} height={inner} viewBox="1 0 24 24">
          <path d="M11 5 2 12l9 7z" fill="#fbbf24" />
          <path d="M22 5l-9 7 9 7z" fill="#fbbf24" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
