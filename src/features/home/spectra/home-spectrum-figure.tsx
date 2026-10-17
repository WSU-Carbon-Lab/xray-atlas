import type { ReactElement } from "react";
import { SPECTRUM_PAD } from "../snapshot/svg-paths";
import type {
  HomeSnapshotSpectrum,
  HomeSpectrumTab,
  HomeSpectrumTrace,
} from "../snapshot/types";
import { polarizationRampColor } from "./polarization-ramp";

function stroke(t: HomeSpectrumTrace): string {
  if (t.tone === "primary") return "var(--accent)";
  if (t.tone === "muted")
    return "color-mix(in oklab, var(--foreground) 45%, transparent)";
  return polarizationRampColor(t.tone.ramp);
}

/** Non-interactive SVG plot of one spectrum tab on the snapshot viewBox. */
export function HomeSpectrumFigure({
  spectrum,
  tab,
}: {
  spectrum: HomeSnapshotSpectrum;
  tab: HomeSpectrumTab;
}): ReactElement {
  const { width: w, height: h } = spectrum;
  const { l, r, t: top, b } = SPECTRUM_PAD;
  const base = h - b;
  const hatchId = `home-hatch-${tab.id}`;
  return (
    <figure className="space-y-3">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`${spectrum.title}: ${tab.label}`}
        className="h-auto w-full"
      >
        <defs>
          <pattern
            id={hatchId}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-accent/30"
            />
          </pattern>
        </defs>
        {tab.bands.map((band) => (
          <g key={`${band.kind}-${band.x0}`}>
            <rect
              x={band.x0}
              y={top}
              width={Math.max(0, band.x1 - band.x0)}
              height={base - top}
              fill={
                band.kind === "pre" || band.kind === "post"
                  ? `url(#${hatchId})`
                  : "color-mix(in oklab, var(--accent) 9%, transparent)"
              }
            />
            <text
              x={(band.x0 + band.x1) / 2}
              y={top + 14}
              textAnchor="middle"
              className="fill-muted text-[11px]"
            >
              {band.label}
            </text>
          </g>
        ))}
        <line x1={l} x2={w - r} y1={base} y2={base} className="stroke-border" />
        {spectrum.xTicks.map((tick) => (
          <text
            key={tick.label}
            x={tick.x}
            y={h - 14}
            textAnchor="middle"
            className="fill-muted text-[11px] tabular-nums"
          >
            {tick.label}
          </text>
        ))}
        <text
          x={w - r}
          y={h - 2}
          textAnchor="end"
          className="fill-muted text-[11px]"
        >
          Photon energy (eV)
        </text>
        <text
          x={12}
          y={h / 2}
          transform={`rotate(-90 12 ${h / 2})`}
          textAnchor="middle"
          className="fill-muted text-[11px]"
        >
          {tab.yLabel}
        </text>
        {tab.traces.map((t) => (
          <path
            key={t.key}
            d={t.d}
            fill="none"
            stroke={stroke(t)}
            strokeWidth={t.tone === "primary" ? 2.25 : 1.75}
            strokeDasharray={t.dashed ? "4 4" : undefined}
            strokeLinejoin="round"
            className="home-trace"
          />
        ))}
        {tab.markers.map((m) => (
          <g key={m.label}>
            <circle
              cx={m.x}
              cy={m.y}
              r={4}
              className="fill-background stroke-foreground"
              strokeWidth={1.5}
            />
            <text
              x={m.x + 8}
              y={m.y - 8}
              className="fill-foreground text-[11px]"
            >
              {m.label}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {tab.traces.map((t) => (
          <span
            key={t.key}
            className="text-muted inline-flex items-center gap-1.5"
          >
            <span
              className="inline-block h-0.5 w-4 rounded-full"
              style={{ background: stroke(t) }}
              aria-hidden
            />
            {t.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
