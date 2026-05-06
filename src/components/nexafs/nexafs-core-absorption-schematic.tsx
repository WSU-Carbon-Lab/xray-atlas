/**
 * NEXAFS-focused illustration primitives for education surfaces such as the NEXAFS wiki.
 * Animations may extend these diagrams later without changing copy-heavy routes directly.
 */

import { cn } from "@heroui/styles";

type NexafsCoreAbsorptionSchematicProps = {
  /**
   * Optional Tailwind classes merged onto the responsive SVG wrapper (`className` replaces defaults where overlapping specificity applies via cn upstream).
   */
  className?: string;
};

/**
 * Draws a Bohr-style schematic of tunable photon absorption at a core site with a straight dashed ray
 * aimed upward and slightly rightward to suggest photoelectron-style ejection away from the nucleus.
 *
 * @param props.className - Extra layout tokens around the intrinsic-ratio SVG viewport (`width`/`height` scale uniformly via CSS).
 *
 * **Semantics:** Compresses multi-electron structure into labeled shells (1s solid, 2s solid, 2p dashed).
 * Decorative gradients and glow are non-quantitative cues only.
 *
 * **Accessibility:** Exposes an SVG `<title>` summarizing the schematic for assistive technologies.
 */
export function NexafsCoreAbsorptionSchematic({
  className,
}: NexafsCoreAbsorptionSchematicProps) {
  const cx = 260;
  const cy = 218;
  const r1s = 46;
  const r2s = 88;
  const r2p = 132;

  const hitAngleDeg = 218;
  const paired1sAngleDeg = (hitAngleDeg + 180) % 360;
  const hitRad = (hitAngleDeg * Math.PI) / 180;
  const hx = cx + r1s * Math.cos(hitRad);
  const hy = cy + r1s * Math.sin(hitRad);

  const photonStart = { x: 52, y: 52 };
  const photonPath = buildWavyPath(
    photonStart.x,
    photonStart.y,
    hx,
    hy,
    24,
    6.5,
  );

  const ejectElevationDeg = 59;
  const ejectPlaneRad = (ejectElevationDeg * Math.PI) / 180;
  const ejDx = Math.cos(ejectPlaneRad);
  const ejDy = -Math.sin(ejectPlaneRad);

  const ejChordLen = 178;
  const ejArrowInset = 14;
  const ejEndX = hx + ejDx * ejChordLen;
  const ejEndY = hy + ejDy * ejChordLen;
  const ejBx = ejEndX - ejDx * ejArrowInset;
  const ejBy = ejEndY - ejDy * ejArrowInset;

  const vbY = 6;
  const vbH = 412;

  return (
    <figure className={cn("w-full overflow-hidden", className)}>
      <svg
        role="img"
        aria-labelledby="nexafs-absorption-schematic-title"
        viewBox={`0 ${vbY} 520 ${vbH}`}
        className="text-border mx-auto block h-auto w-full max-w-xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title id="nexafs-absorption-schematic-title">
          Tunable photon absorption at a core 1s site with a straight photoelectron-style ray directed
          upward and rightward away from the nucleus in a simplified shell schematic
        </title>
        <defs>
          <linearGradient
            id="nexafs-photon-beam"
            gradientUnits="userSpaceOnUse"
            x1={photonStart.x}
            y1={photonStart.y}
            x2={hx}
            y2={hy}
          >
            <stop offset="0%" stopColor="oklch(72% 0.18 290)" />
            <stop offset="45%" stopColor="oklch(78% 0.22 300)" />
            <stop offset="100%" stopColor="oklch(96% 0.02 300)" />
          </linearGradient>
          <linearGradient
            id="nexafs-promotion-beam"
            gradientUnits="userSpaceOnUse"
            x1={hx}
            y1={hy}
            x2={ejBx}
            y2={ejBy}
          >
            <stop offset="0%" stopColor="oklch(78% 0.14 230)" stopOpacity="0.35" />
            <stop offset="45%" stopColor="oklch(82% 0.12 220)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="oklch(88% 0.08 200)" stopOpacity="0.55" />
          </linearGradient>
          <radialGradient id="nexafs-stage-vignette" cx="50%" cy="48%" r="68%">
            <stop offset="0%" stopColor="oklch(58% 0.07 286)" stopOpacity="0.22" />
            <stop offset="50%" stopColor="oklch(72% 0.04 264)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="oklch(88% 0.02 264)" stopOpacity="0.03" />
          </radialGradient>
          <radialGradient id="nexafs-nucleus-a" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="oklch(92% 0.06 290)" />
            <stop offset="70%" stopColor="oklch(52% 0.22 280)" />
            <stop offset="100%" stopColor="oklch(38% 0.18 270)" />
          </radialGradient>
          <radialGradient id="nexafs-nucleus-b" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="oklch(85% 0.05 240)" />
            <stop offset="100%" stopColor="oklch(48% 0.2 264)" />
          </radialGradient>
          <radialGradient id="nexafs-nucleus-c" cx="45%" cy="42%" r="55%">
            <stop offset="0%" stopColor="oklch(78% 0.08 220)" />
            <stop offset="100%" stopColor="oklch(42% 0.16 240)" />
          </radialGradient>
          <radialGradient id="nexafs-electron-core" cx="32%" cy="30%" r="62%">
            <stop offset="0%" stopColor="oklch(94% 0.03 250)" />
            <stop offset="55%" stopColor="oklch(62% 0.17 250)" />
            <stop offset="100%" stopColor="oklch(42% 0.15 260)" />
          </radialGradient>
          <radialGradient id="nexafs-electron-valence" cx="35%" cy="28%" r="58%">
            <stop offset="0%" stopColor="oklch(93% 0.05 150)" />
            <stop offset="55%" stopColor="oklch(72% 0.17 150)" />
            <stop offset="100%" stopColor="oklch(48% 0.14 155)" />
          </radialGradient>
          <radialGradient id="nexafs-electron-covalent" cx="34%" cy="30%" r="58%">
            <stop offset="0%" stopColor="oklch(94% 0.04 25)" />
            <stop offset="55%" stopColor="oklch(62% 0.22 25)" />
            <stop offset="100%" stopColor="oklch(46% 0.17 20)" />
          </radialGradient>
          <radialGradient id="nexafs-unoccupied-slot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(65% 0.14 290)" stopOpacity="0.12" />
            <stop offset="70%" stopColor="oklch(55% 0.08 290)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="oklch(45% 0.06 290)" stopOpacity="0.06" />
          </radialGradient>
          <radialGradient id="nexafs-absorption-core" cx="50%" cy="50%" r="48%">
            <stop offset="0%" stopColor="oklch(94% 0.09 95)" stopOpacity="1" />
            <stop offset="35%" stopColor="oklch(82% 0.14 75)" stopOpacity="0.85" />
            <stop offset="72%" stopColor="oklch(72% 0.18 55)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="oklch(60% 0.15 40)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="nexafs-absorption-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(78% 0.2 290)" stopOpacity="0.55" />
            <stop offset="55%" stopColor="oklch(62% 0.14 280)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="oklch(45% 0.08 270)" stopOpacity="0" />
          </radialGradient>
          <filter
            id="nexafs-blur-soft"
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
          >
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="nexafs-bloom-wide" x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.55 0"
              result="dim"
            />
            <feMerge>
              <feMergeNode in="dim" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="nexafs-glow-tight" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3.2" result="g" />
            <feMerge>
              <feMergeNode in="g" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker
            id="nexafs-photon-arrow"
            markerUnits="userSpaceOnUse"
            markerWidth="16"
            markerHeight="16"
            refX="13"
            refY="8"
            orient="auto"
          >
            <path
              d="M0 1.5 L14 8 L0 14.5 Z"
              fill="oklch(93% 0.06 300)"
              stroke="oklch(72% 0.22 300)"
              strokeWidth="0.75"
              strokeLinejoin="round"
            />
          </marker>
          <marker
            id="nexafs-promotion-arrow"
            markerUnits="userSpaceOnUse"
            markerWidth="13"
            markerHeight="13"
            refX="11"
            refY="6.5"
            orient="auto"
          >
            <path
              d="M0 1 L11 6.5 L0 12 Z"
              fill="oklch(88% 0.09 210)"
              stroke="oklch(62% 0.14 230)"
              strokeWidth="0.65"
              strokeLinejoin="round"
            />
          </marker>
        </defs>

        <rect
          x="0"
          y={vbY}
          width="520"
          height={vbH}
          rx="24"
          fill="url(#nexafs-stage-vignette)"
          aria-hidden
        />

        <g aria-hidden className="opacity-[0.35]">
          <circle cx={cx} cy={cy} r={r2p + 18} fill="none" stroke="oklch(70% 0.06 280)" strokeWidth="1" />
          <circle cx={cx} cy={cy} r={r2p + 30} fill="none" stroke="oklch(58% 0.05 280)" strokeWidth="0.75" opacity={0.55} />
        </g>

        <g filter="url(#nexafs-blur-soft)" opacity={0.45} aria-hidden>
          <circle cx={cx} cy={cy} r={r2p} fill="none" stroke="oklch(78% 0.06 280)" strokeWidth="10" strokeDasharray="10 12" />
          <circle cx={cx} cy={cy} r={r2s} fill="none" stroke="oklch(82% 0.05 200)" strokeWidth="8" />
          <circle cx={cx} cy={cy} r={r1s} fill="none" stroke="oklch(85% 0.05 220)" strokeWidth="8" />
        </g>

        <circle
          cx={cx}
          cy={cy}
          r={r2p}
          fill="none"
          stroke="oklch(88% 0.05 280)"
          strokeOpacity={0.55}
          strokeWidth={1.35}
          strokeDasharray="9 7"
          aria-hidden
        />
        <circle
          cx={cx}
          cy={cy}
          r={r2s}
          fill="none"
          stroke="oklch(90% 0.04 220)"
          strokeOpacity={0.62}
          strokeWidth={1.45}
          aria-hidden
        />
        <circle
          cx={cx}
          cy={cy}
          r={r1s}
          fill="none"
          stroke="oklch(93% 0.03 240)"
          strokeOpacity={0.72}
          strokeWidth={1.55}
          aria-hidden
        />

        <g aria-hidden>
          <circle cx={cx - 5} cy={cy + 3} r={11} fill="url(#nexafs-nucleus-a)" filter="url(#nexafs-glow-tight)" />
          <circle cx={cx + 8} cy={cy - 4} r={9} fill="url(#nexafs-nucleus-b)" opacity={0.96} />
          <circle cx={cx + 2} cy={cy + 11} r={7.5} fill="url(#nexafs-nucleus-c)" opacity={0.92} />
        </g>

        <ShellElectrons
          cx={cx}
          cy={cy}
          r={r2p}
          angles={[15, 55, 115, 165, 265, 325]}
          filledAngles={[115, 325]}
          filledFill="url(#nexafs-electron-covalent)"
          emptyFill="url(#nexafs-unoccupied-slot)"
          emptyStrokeColor="oklch(72% 0.12 290)"
        />
        <ShellElectrons
          cx={cx}
          cy={cy}
          r={r2s}
          angles={[320, 155]}
          filledAngles={[320, 155]}
          filledFill="url(#nexafs-electron-valence)"
          emptyFill="url(#nexafs-unoccupied-slot)"
          emptyStrokeColor="oklch(68% 0.08 160)"
        />

        <circle cx={hx} cy={hy} r={34} fill="url(#nexafs-absorption-halo)" opacity={0.52} aria-hidden />
        <circle cx={hx} cy={hy} r={22} fill="url(#nexafs-absorption-core)" aria-hidden />

        <ShellElectrons
          cx={cx}
          cy={cy}
          r={r1s}
          angles={[hitAngleDeg, paired1sAngleDeg]}
          filledAngles={[paired1sAngleDeg]}
          filledFill="url(#nexafs-electron-core)"
          emptyFill="url(#nexafs-unoccupied-slot)"
          emptyStrokeColor="oklch(72% 0.14 264)"
        />

        <path
          d={photonPath}
          fill="none"
          stroke="oklch(72% 0.24 300)"
          strokeOpacity={0.35}
          strokeWidth={9}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#nexafs-bloom-wide)"
          aria-hidden
        />
        <path
          d={photonPath}
          fill="none"
          stroke="url(#nexafs-photon-beam)"
          strokeWidth={2.85}
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd="url(#nexafs-photon-arrow)"
        />

        <line
          x1={hx}
          y1={hy}
          x2={ejBx}
          y2={ejBy}
          stroke="url(#nexafs-promotion-beam)"
          strokeWidth={2.35}
          strokeDasharray="8 7"
          strokeLinecap="round"
          opacity={0.94}
          markerEnd="url(#nexafs-promotion-arrow)"
          filter="url(#nexafs-glow-tight)"
          aria-hidden
        />

        <ShellLabels cx={cx} cy={cy} r1s={r1s} r2s={r2s} r2p={r2p} />
      </svg>
    </figure>
  );
}

function buildWavyPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  wavelength: number,
  amplitude: number,
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return `M ${x1} ${y1}`;
  }
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const omega = (2 * Math.PI) / wavelength;
  const steps = Math.max(14, Math.ceil(len / 5));
  let d = `M ${x1} ${y1}`;
  for (let i = 1; i < steps; i++) {
    const s = (len * i) / steps;
    const wobble = amplitude * Math.sin(omega * s);
    const x = x1 + ux * s + px * wobble;
    const y = y1 + uy * s + py * wobble;
    d += ` L ${x} ${y}`;
  }
  d += ` L ${x2} ${y2}`;
  return d;
}

function ShellElectrons({
  cx,
  cy,
  r,
  angles,
  filledAngles,
  filledFill,
  emptyFill,
  emptyStrokeColor,
}: {
  cx: number;
  cy: number;
  r: number;
  angles: readonly number[];
  filledAngles: readonly number[];
  filledFill: string;
  emptyFill: string;
  emptyStrokeColor: string;
}) {
  const filled = new Set(filledAngles);
  return (
    <g aria-hidden>
      {angles.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x = cx + r * Math.cos(rad);
        const y = cy + r * Math.sin(rad);
        const isFilled = filled.has(deg);
        if (isFilled) {
          return (
            <g key={`f-${deg}`}>
              <circle cx={x} cy={y} r={9} fill={filledFill} opacity={0.22} />
              <circle cx={x - 1} cy={y - 1} r={7} fill={filledFill} filter="url(#nexafs-glow-tight)" />
            </g>
          );
        }
        return (
          <g key={`e-${deg}`}>
            <circle cx={x} cy={y} r={8.5} fill={emptyFill} opacity={0.9} />
            <circle
              cx={x}
              cy={y}
              r={7}
              fill="none"
              stroke={emptyStrokeColor}
              strokeWidth={1.35}
              strokeDasharray="3.5 3"
              strokeOpacity={0.85}
            />
          </g>
        );
      })}
    </g>
  );
}

function ShellLabels({
  cx,
  cy,
  r1s,
  r2s,
  r2p,
}: {
  cx: number;
  cy: number;
  r1s: number;
  r2s: number;
  r2p: number;
}) {
  const pad = 14;
  return (
    <g
      aria-hidden
      className="text-[12px] font-semibold sm:text-[13px]"
      style={{ paintOrder: "stroke fill" }}
    >
      <text
        x={cx + r1s - pad}
        y={cy - r1s + pad}
        fill="oklch(82% 0.12 250)"
        stroke="var(--border)"
        strokeOpacity={0.95}
        strokeWidth={3}
      >
        1s
      </text>
      <text
        x={cx + r2s - pad}
        y={cy + r2s - pad}
        fill="oklch(82% 0.14 150)"
        stroke="var(--border)"
        strokeOpacity={0.95}
        strokeWidth={3}
      >
        2s
      </text>
      <text
        x={cx + r2p - pad}
        y={cy - r2p + pad}
        fill="oklch(78% 0.16 25)"
        stroke="var(--border)"
        strokeOpacity={0.95}
        strokeWidth={3}
      >
        2p
      </text>
    </g>
  );
}
