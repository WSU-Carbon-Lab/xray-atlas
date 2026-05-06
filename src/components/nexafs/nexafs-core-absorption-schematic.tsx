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
 * Draws a static Bohr-style schematic of tunable synchrotron photon absorption at a core 1s
 * orbital with emission along an outbound scattering ray for pedagogical context on edges.
 *
 * @param props.className - Extra layout tokens around the intrinsic-ratio SVG viewport (`width`/`height` scale uniformly via CSS).
 *
 * **Semantics:** This diagram compresses multi-electron atomic structure into labeled shells (1s solid,
 * 2s solid, 2p dashed). It does not depict angular momentum coupling or continuum shapes.
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

  const photonStart = { x: 52, y: 42 };
  const photonPath = buildWavyPath(
    photonStart.x,
    photonStart.y,
    hx,
    hy,
    22,
    7,
  );

  const ejectAngleDeg = 40;
  const ejectRad = (ejectAngleDeg * Math.PI) / 180;
  const ejectDx = Math.cos(ejectRad);
  const ejectDy = -Math.sin(ejectRad);
  const ejectChordLen = 178;
  const eShorten = 12;
  const eTx = hx + ejectDx * eShorten;
  const eTy = hy + ejectDy * eShorten;
  const eBx = hx + ejectDx * ejectChordLen;
  const eBy = hy + ejectDy * ejectChordLen;

  return (
    <figure className={cn("w-full", className)}>
      <svg
        role="img"
        aria-labelledby="nexafs-absorption-schematic-title"
        viewBox="0 12 520 292"
        className="text-border mx-auto h-auto w-full max-w-xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title id="nexafs-absorption-schematic-title">
          Incident tunable photon from synchrotron absorbed at a core 1s site with an ejected
          photoelectron along the dashed ray
        </title>
        <defs>
          <marker
            id="nexafs-photon-arrow"
            markerUnits="userSpaceOnUse"
            markerWidth="14"
            markerHeight="14"
            refX="12"
            refY="7"
            orient="auto"
          >
            <path d="M0 1 L12 7 L0 13 Z" className="fill-violet-600" />
          </marker>
          <marker
            id="nexafs-electron-arrow"
            markerUnits="userSpaceOnUse"
            markerWidth="12"
            markerHeight="12"
            refX="10"
            refY="6"
            orient="auto"
          >
            <path d="M0 0.5 L10 6 L0 11.5 Z" className="fill-sky-600" />
          </marker>
          <radialGradient id="nexafs-absorption-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgb(251 191 36)" stopOpacity="0.95" />
            <stop offset="70%" stopColor="rgb(251 191 36)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="rgb(251 191 36)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g aria-hidden>
          <circle cx={cx - 4} cy={cy + 2} r={9} className="fill-indigo-700/90" />
          <circle cx={cx + 6} cy={cy - 3} r={7} className="fill-violet-700/85" />
          <circle cx={cx + 1} cy={cy + 8} r={6} className="fill-sky-700/80" />
        </g>

        <circle
          cx={hx}
          cy={hy}
          r={22}
          fill="url(#nexafs-absorption-glow)"
          opacity={0.85}
          aria-hidden
        />

        <circle
          cx={cx}
          cy={cy}
          r={r2p}
          fill="none"
          className="stroke-foreground/55"
          strokeWidth={1.25}
          strokeDasharray="7 6"
        />
        <circle
          cx={cx}
          cy={cy}
          r={r2s}
          fill="none"
          className="stroke-foreground/65"
          strokeWidth={1.35}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r1s}
          fill="none"
          className="stroke-foreground/75"
          strokeWidth={1.45}
        />

        <ShellElectrons
          cx={cx}
          cy={cy}
          r={r2p}
          angles={[15, 55, 115, 165, 265, 325]}
          filledAngles={[115, 325]}
          filledClass="fill-red-600"
          emptyStrokeClass="stroke-[color:var(--muted)]"
        />
        <ShellElectrons
          cx={cx}
          cy={cy}
          r={r2s}
          angles={[320, 155]}
          filledAngles={[320, 155]}
          filledClass="fill-emerald-600"
          emptyStrokeClass="stroke-[color:var(--muted)]"
        />
        <ShellElectrons
          cx={cx}
          cy={cy}
          r={r1s}
          angles={[hitAngleDeg, paired1sAngleDeg]}
          filledAngles={[paired1sAngleDeg]}
          filledClass="fill-blue-600"
          emptyStrokeClass="stroke-[color:var(--muted)]"
        />

        <path
          d={photonPath}
          fill="none"
          className="stroke-violet-600"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd="url(#nexafs-photon-arrow)"
        />

        <line
          x1={eTx}
          y1={eTy}
          x2={eBx}
          y2={eBy}
          fill="none"
          className="stroke-sky-600"
          strokeWidth={2}
          strokeDasharray="6 5"
          strokeLinecap="round"
          markerEnd="url(#nexafs-electron-arrow)"
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
  filledClass,
  emptyStrokeClass,
}: {
  cx: number;
  cy: number;
  r: number;
  angles: readonly number[];
  filledAngles: readonly number[];
  filledClass: string;
  emptyStrokeClass: string;
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
            <circle
              key={`f-${deg}`}
              cx={x}
              cy={y}
              r={7}
              className={filledClass}
            />
          );
        }
        return (
          <circle
            key={`e-${deg}`}
            cx={x}
            cy={y}
            r={7}
            fill="none"
            className={emptyStrokeClass}
            strokeWidth={1.6}
            strokeDasharray="3 3"
          />
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
    <g aria-hidden className="text-[12px] font-semibold sm:text-[13px]">
      <text
        x={cx + r1s - pad}
        y={cy - r1s + pad}
        className="fill-blue-600"
      >
        1s
      </text>
      <text
        x={cx + r2s - pad}
        y={cy + r2s - pad}
        className="fill-emerald-600"
      >
        2s
      </text>
      <text
        x={cx + r2p - pad}
        y={cy - r2p + pad}
        className="fill-red-600"
      >
        2p
      </text>
    </g>
  );
}
