"use client";

import type { RegionSpectrumRecord } from "~/lib/dashboard-processing-session";

type StxmSpectrumPreviewProps = {
  spectra: RegionSpectrumRecord[];
  height?: number;
};

/**
 * Renders reduced OD spectra as lightweight SVG polylines.
 */
export function StxmSpectrumPreview({
  spectra,
  height = 200,
}: StxmSpectrumPreviewProps) {
  if (spectra.length === 0) {
    return (
      <p className="text-muted text-sm">No reduced spectra to display.</p>
    );
  }

  const width = 640;
  const padding = 32;
  const allEnergy = spectra.flatMap((spectrum) => spectrum.energyEv);
  const allOd = spectra.flatMap((spectrum) => spectrum.od);
  const xMin = Math.min(...allEnergy);
  const xMax = Math.max(...allEnergy);
  const yMin = Math.min(...allOd);
  const yMax = Math.max(...allOd);
  const xSpan = xMax - xMin || 1;
  const ySpan = yMax - yMin || 1;

  const colors = [
    "var(--accent)",
    "var(--success)",
    "var(--warning)",
    "var(--danger)",
  ];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="border-border bg-default/20 w-full rounded-md border"
      role="img"
      aria-label="Reduced NEXAFS optical density spectra"
    >
      {spectra.map((spectrum, index) => {
        const points = spectrum.energyEv
          .map((energy, i) => {
            const x =
              padding +
              ((energy - xMin) / xSpan) * (width - padding * 2);
            const y =
              height -
              padding -
              (((spectrum.od[i] ?? 0) - yMin) / ySpan) * (height - padding * 2);
            return `${x},${y}`;
          })
          .join(" ");
        return (
          <polyline
            key={spectrum.regionLabel}
            fill="none"
            stroke={colors[index % colors.length]}
            strokeWidth={2}
            points={points}
          />
        );
      })}
      <text
        x={padding}
        y={16}
        className="fill-muted text-[10px]"
      >
        OD vs energy (eV)
      </text>
    </svg>
  );
}
