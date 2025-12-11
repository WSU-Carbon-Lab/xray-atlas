"use client";

import { useState, useMemo } from "react";
import { DefaultButton as Button } from "~/app/components/Button";
import { SimpleDialog } from "~/app/components/SimpleDialog";
import { SpectrumPlot } from "~/app/components/plots/SpectrumPlot";
import type {
  CSVColumnMappings,
  ColumnStats,
} from "~/app/contribute/nexafs/types";
import {
  analyzeNumericColumns,
  formatStatNumber,
} from "~/app/contribute/nexafs/utils";
import type { SpectrumPoint } from "~/app/components/plots/core/types";

interface ColumnMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mappings: CSVColumnMappings) => void;
  columns: string[];
  rawData: Record<string, unknown>[];
  fileName: string;
}

export function ColumnMappingModal({
  isOpen,
  onClose,
  onConfirm,
  columns,
  rawData,
  fileName,
}: ColumnMappingModalProps) {
  const [mappings, setMappings] = useState<CSVColumnMappings>({
    energy: "",
    absorption: "",
    theta: undefined,
    phi: undefined,
  });

  // Auto-detect columns on open
  useMemo(() => {
    if (columns.length === 0) return;

    const energyCol = columns.find(
      (col) =>
        col.toLowerCase().includes("energy") ||
        col.toLowerCase().includes("ev") ||
        col.toLowerCase().includes("photon"),
    );
    const absorptionCol = columns.find(
      (col) =>
        col.toLowerCase().includes("absorption") ||
        col.toLowerCase().includes("abs") ||
        col.toLowerCase().includes("intensity") ||
        col.toLowerCase().includes("signal"),
    );
    const thetaCol = columns.find((col) => col.toLowerCase().includes("theta"));
    const phiCol = columns.find((col) => col.toLowerCase().includes("phi"));

    setMappings({
      energy: energyCol ?? columns[0] ?? "",
      absorption: absorptionCol ?? columns[1] ?? "",
      theta: thetaCol ?? undefined,
      phi: phiCol ?? undefined,
    });
  }, [columns]);

  // Analyze numeric columns for statistics
  const columnStats = useMemo(() => {
    const numericColumns = new Set<string>();
    if (mappings.energy) numericColumns.add(mappings.energy);
    if (mappings.absorption) numericColumns.add(mappings.absorption);
    if (mappings.theta) numericColumns.add(mappings.theta);
    if (mappings.phi) numericColumns.add(mappings.phi);

    const reports = analyzeNumericColumns(rawData, numericColumns);
    const stats: Record<string, ColumnStats> = {};

    numericColumns.forEach((col) => {
      const report = reports[col];
      if (!report) return;

      const values = rawData
        .map((row) => {
          const val = row[col];
          if (val === undefined || val === null || val === "") return null;
          if (typeof val === "number") return Number.isFinite(val) ? val : null;
          const str = typeof val === "string" ? val : JSON.stringify(val);
          const num = parseFloat(str);
          return Number.isFinite(num) ? num : null;
        })
        .filter((v): v is number => v !== null);

      if (values.length === 0) {
        stats[col] = {
          min: null,
          max: null,
          nanCount: report.sanitizedInvalidRows.length,
          validCount: 0,
        };
      } else {
        stats[col] = {
          min: Math.min(...values),
          max: Math.max(...values),
          nanCount: report.sanitizedInvalidRows.length,
          validCount: values.length,
        };
      }
    });

    return stats;
  }, [rawData, mappings]);

  const handleConfirm = () => {
    if (!mappings.energy || !mappings.absorption) {
      return;
    }
    onConfirm(mappings);
  };

  // Generate preview spectrum points from mapped columns
  const previewPoints = useMemo(() => {
    if (!mappings.energy || !mappings.absorption) return [];

    const energyCol = mappings.energy;
    const absorptionCol = mappings.absorption;
    const points: SpectrumPoint[] = [];
    rawData.forEach((row) => {
      const energyValue = Number(row[energyCol]);
      const absorptionValue = Number(row[absorptionCol]);

      if (Number.isFinite(energyValue) && Number.isFinite(absorptionValue)) {
        const point: SpectrumPoint = {
          energy: energyValue,
          absorption: absorptionValue,
        };

        if (mappings.theta && row[mappings.theta] !== undefined) {
          const thetaValue = Number(row[mappings.theta]);
          if (Number.isFinite(thetaValue)) {
            point.theta = thetaValue;
          }
        }
        if (mappings.phi && row[mappings.phi] !== undefined) {
          const phiValue = Number(row[mappings.phi]);
          if (Number.isFinite(phiValue)) {
            point.phi = phiValue;
          }
        }

        points.push(point);
      }
    });

    return points;
  }, [rawData, mappings]);

  const previewRows = rawData.slice(0, 10);

  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Map Columns: ${fileName}`}
      maxWidth="max-w-6xl"
    >
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Select which columns contain energy, absorption, and optional geometry
        data (theta, phi).
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Side: Preview */}
        <div className="space-y-4">
          {/* Preview Graph */}
          {previewPoints.length > 0 &&
            mappings.energy &&
            mappings.absorption && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Preview Graph
                </label>
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <SpectrumPlot points={previewPoints} height={300} />
                </div>
              </div>
            )}

          {/* Preview Table */}
          {previewRows.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Preview (first {previewRows.length} rows)
              </label>
              <div className="max-h-64 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 text-xs dark:divide-gray-700">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {columns.map((col) => {
                        const isMapped =
                          col === mappings.energy ||
                          col === mappings.absorption ||
                          col === mappings.theta ||
                          col === mappings.phi;
                        const isRequired =
                          col === mappings.energy ||
                          col === mappings.absorption;
                        return (
                          <th
                            key={col}
                            className={`px-3 py-2 text-left text-xs font-medium ${
                              isMapped
                                ? isRequired
                                  ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200"
                                  : "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200"
                                : "text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {col}
                            {isMapped && (
                              <span className="ml-1 text-[10px]">
                                {col === mappings.energy
                                  ? "(Energy)"
                                  : col === mappings.absorption
                                    ? "(Absorption)"
                                    : col === mappings.theta
                                      ? "(Theta)"
                                      : "(Phi)"}
                              </span>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                    {previewRows.map((row, idx) => (
                      <tr key={idx}>
                        {columns.map((col) => (
                          <td
                            key={col}
                            className="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100"
                          >
                            {(() => {
                              const cellVal = row[col];
                              if (cellVal === null || cellVal === undefined)
                                return "";
                              if (
                                typeof cellVal === "string" ||
                                typeof cellVal === "number"
                              )
                                return String(cellVal);
                              return JSON.stringify(cellVal);
                            })()}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Column Mappings */}
        <div className="space-y-4">
          {/* Column Mappings */}
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Energy Column <span className="text-red-500">*</span>
              </label>
              <select
                value={mappings.energy}
                onChange={(e) =>
                  setMappings({ ...mappings, energy: e.target.value })
                }
                className="focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">Select column...</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
              {mappings.energy && columnStats[mappings.energy] && (
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Range: {formatStatNumber(columnStats[mappings.energy]!.min)} -{" "}
                  {formatStatNumber(columnStats[mappings.energy]!.max)} •{" "}
                  {columnStats[mappings.energy]!.validCount} valid,{" "}
                  {columnStats[mappings.energy]!.nanCount} invalid
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Absorption Column <span className="text-red-500">*</span>
              </label>
              <select
                value={mappings.absorption}
                onChange={(e) =>
                  setMappings({ ...mappings, absorption: e.target.value })
                }
                className="focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">Select column...</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
              {mappings.absorption && columnStats[mappings.absorption] && (
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Range:{" "}
                  {formatStatNumber(columnStats[mappings.absorption]!.min)} -{" "}
                  {formatStatNumber(columnStats[mappings.absorption]!.max)} •{" "}
                  {columnStats[mappings.absorption]!.validCount} valid,{" "}
                  {columnStats[mappings.absorption]!.nanCount} invalid
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Theta Column (Optional)
              </label>
              <select
                value={mappings.theta ?? ""}
                onChange={(e) =>
                  setMappings({
                    ...mappings,
                    theta: e.target.value === "" ? undefined : e.target.value,
                  })
                }
                className="focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">None</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
              {mappings.theta && columnStats[mappings.theta] && (
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Range: {formatStatNumber(columnStats[mappings.theta]!.min)} -{" "}
                  {formatStatNumber(columnStats[mappings.theta]!.max)} •{" "}
                  {columnStats[mappings.theta]!.validCount} valid,{" "}
                  {columnStats[mappings.theta]!.nanCount} invalid
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Phi Column (Optional)
              </label>
              <select
                value={mappings.phi ?? ""}
                onChange={(e) =>
                  setMappings({
                    ...mappings,
                    phi: e.target.value === "" ? undefined : e.target.value,
                  })
                }
                className="focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">None</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
              {mappings.phi && columnStats[mappings.phi] && (
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Range: {formatStatNumber(columnStats[mappings.phi]!.min)} -{" "}
                  {formatStatNumber(columnStats[mappings.phi]!.max)} •{" "}
                  {columnStats[mappings.phi]!.validCount} valid,{" "}
                  {columnStats[mappings.phi]!.nanCount} invalid
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
        <Button type="button" variant="bordered" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="solid"
          onClick={handleConfirm}
          disabled={!mappings.energy || !mappings.absorption}
        >
          Confirm
        </Button>
      </div>
    </SimpleDialog>
  );
}
