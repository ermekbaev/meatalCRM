/**
 * Иллюстрация шапки главной (22.11): изометрический лазерный стол с рамой, головкой и листом металла в оранжевом
 * цвете бренда. Только SVG, картинок не грузим. Рисунок подкрашивается классами цвета (orange), как весь интерфейс.
 */

const S = 38;
const CX = 330;
const CY = 250;
const P = (x: number, y: number, z: number): [number, number] => [CX + (x - y) * S * 0.866, CY + (x + y) * S * 0.5 - z * S];
const pts = (list: [number, number][]) => list.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");

function Box({ x, y, z, w, d, h, top, left, right }: { x: number; y: number; z: number; w: number; d: number; h: number; top: string; left: string; right: string }) {
  return (
    <g strokeLinejoin="round" stroke="rgb(255 255 255 / .6)" strokeWidth={1}>
      <polygon points={pts([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)])} fill={left} />
      <polygon points={pts([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)])} fill={right} />
      <polygon points={pts([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)])} fill={top} />
    </g>
  );
}

const ORANGE = "#f65022";
const ORANGE_DARK = "#d9421c";
const SOFT = "#ffe4da";
const SOFT2 = "#ffcdbb";

export default function LaserArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="130 120 400 290" className={className} aria-hidden="true">
      <defs>
        <filter id="la-blur" x="-20%" y="-20%" width="140%" height="160%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>
      <ellipse cx="330" cy="395" rx="190" ry="30" fill={ORANGE} opacity=".16" filter="url(#la-blur)" />

      {/* площадка и стол */}
      <Box x={-4} y={-3} z={0} w={8} d={6} h={0.5} top="#ffffff" left={SOFT2} right={SOFT} />
      <Box x={-3.4} y={-2.4} z={0.5} w={6.8} d={4.8} h={0.5} top="#f3f5f8" left={SOFT} right="#e7ebf1" />

      {/* лист металла с вырезанным контуром */}
      <polygon points={pts([P(-2.6, -1.8, 1.0), P(2.6, -1.8, 1.0), P(2.6, 1.8, 1.0), P(-2.6, 1.8, 1.0)])} fill="#c9d2dd" stroke="#ffffff" />
      <polygon points={pts([P(-1.6, -0.9, 1.01), P(1.2, -0.9, 1.01), P(1.2, 0.9, 1.01), P(-1.6, 0.9, 1.01)])} fill="none" stroke={ORANGE} strokeWidth="2.5" strokeDasharray="7 5" />
      <circle cx={P(-0.2, 0, 1.01)[0]} cy={P(-0.2, 0, 1.01)[1]} r="11" fill="#ffffff" stroke={ORANGE} strokeWidth="2.5" />

      {/* рама */}
      <Box x={-3.4} y={-2.4} z={1.0} w={0.5} d={0.5} h={2.2} top={SOFT} left={ORANGE} right={ORANGE_DARK} />
      <Box x={2.9} y={-2.4} z={1.0} w={0.5} d={0.5} h={2.2} top={SOFT} left={ORANGE} right={ORANGE_DARK} />
      <Box x={-3.4} y={-2.4} z={3.0} w={6.8} d={0.5} h={0.55} top="#ffffff" left={ORANGE} right={ORANGE_DARK} />

      {/* каретка с лазерной головкой и лучом */}
      <Box x={-0.7} y={-2.5} z={2.55} w={1.4} d={0.9} h={0.9} top="#ffffff" left={SOFT2} right={SOFT} />
      <polygon points={pts([P(-0.1, -1.6, 2.5), P(0.1, -1.6, 2.5), P(0.05, 0, 1.05), P(-0.05, 0, 1.05)])} fill={ORANGE} opacity=".85" />
      <circle cx={P(0, 0, 1.05)[0]} cy={P(0, 0, 1.05)[1]} r="7" fill="#fff" stroke={ORANGE} strokeWidth="2" />

      {/* узлы фона */}
      {[[90, 150], [180, 360], [560, 150], [560, 340]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 2 ? 4 : 6} fill={ORANGE} opacity=".16" />
      ))}
    </svg>
  );
}
