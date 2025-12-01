"use client";

import type { SpectrumSelection } from "~/app/components/plots/SpectrumPlot";
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
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700">
        <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Dataset Summary
        </h4>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {stats.validPoints} of {stats.totalRows} rows produced valid spectrum
          points.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-700">
          <thead className="bg-gray-50 text-xs tracking-wide text-gray-500 uppercase dark:bg-gray-900/40 dark:text-gray-400">
            <tr>
              <th className="px-5 py-3 text-left">Column</th>
              <th className="px-5 py-3 text-right">Min</th>
              <th className="px-5 py-3 text-right">Max</th>
              <th className="px-5 py-3 text-right">Valid</th>
              <th className="px-5 py-3 text-right">NaNs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {visibleColumns.map((column) => (
              <tr key={column.label}>
                <td className="px-5 py-3 font-medium text-gray-900 dark:text-gray-100">
                  {column.label}
                  {column.unit ? (
                    <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                      ({column.unit})
                    </span>
                  ) : null}
                </td>
                <td className="px-5 py-3 text-right text-gray-800 dark:text-gray-200">
                  {formatStatNumber(column.stats?.min ?? null)}
                </td>
                <td className="px-5 py-3 text-right text-gray-800 dark:text-gray-200">
                  {formatStatNumber(column.stats?.max ?? null)}
                </td>
                <td className="px-5 py-3 text-right text-gray-800 dark:text-gray-200">
                  {column.stats?.validCount ?? 0}
                </td>
                <td className="px-5 py-3 text-right text-gray-800 dark:text-gray-200">
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
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/10 dark:text-blue-200">
      <span className="font-semibold">Selection</span>
      <span>
        {selection.pointCount} point{selection.pointCount === 1 ? "" : "s"}
      </span>
      <span className="text-blue-600/70 dark:text-blue-200/80">•</span>
      <span>
        Energy {formatStatNumber(selection.energyMin)} –{" "}
        {formatStatNumber(selection.energyMax)} eV
      </span>
      <span className="text-blue-600/70 dark:text-blue-200/80">•</span>
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

