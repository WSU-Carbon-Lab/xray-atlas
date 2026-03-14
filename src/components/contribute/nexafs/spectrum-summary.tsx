"use client";

import type { SpectrumSelection } from "~/components/plots/types";
import type { ColumnStats, SpectrumStats } from "~/app/contribute/nexafs/types";
import { formatStatNumber } from "~/app/contribute/nexafs/utils";

export function SpectrumSummary({ stats }: { stats: SpectrumStats }) {
  const columns: Array<{
    label: string;
    unit?: string;
    stats: ColumnStats | undefined;
  }> = [
    { label: "Energy", unit: "eV", stats: stats.energy },
    { label: "Absorption", stats: stats.absorption },
    { label: "Theta", unit: "°", stats: stats.theta },
    { label: "Phi", unit: "°", stats: stats.phi },
  ];

  const visibleColumns = columns.filter((column) => column.stats !== undefined);

  if (visibleColumns.length === 0) {
    return null;
  }

  return (
    <div className="border-border bg-surface rounded-2xl border shadow-sm">
      <div className="border-border border-b px-5 py-4">
        <h4 className="text-foreground text-base font-semibold">
          Dataset Summary
        </h4>
        <p className="text-muted mt-1 text-sm">
          {stats.validPoints} of {stats.totalRows} rows produced valid spectrum
          points.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="text-foreground border-separator min-w-full divide-y divide-separator text-sm">
          <thead className="bg-default text-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Column</th>
              <th className="px-5 py-3 text-right">Min</th>
              <th className="px-5 py-3 text-right">Max</th>
              <th className="px-5 py-3 text-right">Valid</th>
              <th className="px-5 py-3 text-right">NaNs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-separator">
            {visibleColumns.map((column) => (
              <tr key={column.label}>
                <td className="px-5 py-3 font-medium">
                  {column.label}
                  {column.unit ? (
                    <span className="text-muted ml-1 text-xs font-normal">
                      ({column.unit})
                    </span>
                  ) : null}
                </td>
                <td className="px-5 py-3 text-right">
                  {formatStatNumber(column.stats?.min ?? null)}
                </td>
                <td className="px-5 py-3 text-right">
                  {formatStatNumber(column.stats?.max ?? null)}
                </td>
                <td className="px-5 py-3 text-right">
                  {column.stats?.validCount ?? 0}
                </td>
                <td className="px-5 py-3 text-right">
                  {column.stats?.nanCount ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SelectionSummary({
  selection,
}: {
  selection: SpectrumSelection;
}) {
  return (
    <div className="border-accent/40 bg-accent/10 text-foreground flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm">
      <span className="font-semibold">Selection</span>
      <span>
        {selection.pointCount} point{selection.pointCount === 1 ? "" : "s"}
      </span>
      <span className="text-accent/80">•</span>
      <span>
        Energy {formatStatNumber(selection.energyMin)} –{" "}
        {formatStatNumber(selection.energyMax)} eV
      </span>
      <span className="text-accent/80">•</span>
      <span>
        Intensity {formatStatNumber(selection.absorptionMin)} –{" "}
        {formatStatNumber(selection.absorptionMax)}
      </span>
      {selection.geometryKeys.length > 0 && (
        <span>Geometries: {selection.geometryKeys.length}</span>
      )}
    </div>
  );
}
