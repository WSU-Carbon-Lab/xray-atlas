"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { DefaultButton as Button } from "~/app/components/Button";
import { SimpleDialog } from "~/app/components/SimpleDialog";
import { SpectrumPlot } from "~/app/components/plots/SpectrumPlot";
import { Chip, Slider } from "@heroui/react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
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
  onConfirm: (
    mappings: CSVColumnMappings,
    fixedValues?: { theta?: string; phi?: string },
  ) => void;
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
  const [thetaMode, setThetaMode] = useState<"column" | "fixed">("column");
  const [phiMode, setPhiMode] = useState<"column" | "fixed">("column");
  const [fixedTheta, setFixedTheta] = useState<string>("");
  const [fixedPhi, setFixedPhi] = useState<string>("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openStatusDropdown, setOpenStatusDropdown] = useState<
    "energy" | "absorption" | "theta" | "phi" | null
  >(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node)
      ) {
        setOpenStatusDropdown(null);
      }
    };

    if (openDropdown || openStatusDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openDropdown, openStatusDropdown]);

  // Auto-detect columns on open
  useEffect(() => {
    if (columns.length === 0 || !isOpen) return;

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
  }, [columns, isOpen]);

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

    const fixedValues: { theta?: string; phi?: string } = {};
    if (thetaMode === "fixed" && fixedTheta) {
      fixedValues.theta = fixedTheta;
    }
    if (phiMode === "fixed" && fixedPhi) {
      fixedValues.phi = fixedPhi;
    }

    const finalMappings = { ...mappings };
    if (thetaMode === "fixed") {
      finalMappings.theta = undefined;
    }
    if (phiMode === "fixed") {
      finalMappings.phi = undefined;
    }

    onConfirm(finalMappings, Object.keys(fixedValues).length > 0 ? fixedValues : undefined);
  };

  const handleAssignColumn = (
    columnName: string,
    assignment: "energy" | "absorption" | "theta" | "phi" | "none",
  ) => {
    const newMappings = { ...mappings };

    if (assignment === "none") {
      if (columnName === mappings.energy) {
        newMappings.energy = "";
      } else if (columnName === mappings.absorption) {
        newMappings.absorption = "";
      } else if (columnName === mappings.theta) {
        newMappings.theta = undefined;
      } else if (columnName === mappings.phi) {
        newMappings.phi = undefined;
      }
    } else {
      if (assignment === "energy") {
        newMappings.energy = columnName;
        if (mappings.energy && mappings.energy !== columnName) {
          newMappings.energy = columnName;
        }
      } else if (assignment === "absorption") {
        newMappings.absorption = columnName;
        if (mappings.absorption && mappings.absorption !== columnName) {
          newMappings.absorption = columnName;
        }
      } else if (assignment === "theta") {
        newMappings.theta = columnName;
        if (mappings.theta && mappings.theta !== columnName) {
          newMappings.theta = columnName;
        }
      } else if (assignment === "phi") {
        newMappings.phi = columnName;
        if (mappings.phi && mappings.phi !== columnName) {
          newMappings.phi = columnName;
        }
      }

      if (mappings.energy === columnName && assignment !== "energy") {
        newMappings.energy = "";
      }
      if (mappings.absorption === columnName && assignment !== "absorption") {
        newMappings.absorption = "";
      }
      if (mappings.theta === columnName && assignment !== "theta") {
        newMappings.theta = undefined;
      }
      if (mappings.phi === columnName && assignment !== "phi") {
        newMappings.phi = undefined;
      }
    }

    setMappings(newMappings);
    setOpenDropdown(null);
  };

  const getColumnMappingType = (columnName: string): "energy" | "absorption" | "theta" | "phi" | null => {
    if (columnName === mappings.energy) return "energy";
    if (columnName === mappings.absorption) return "absorption";
    if (columnName === mappings.theta) return "theta";
    if (columnName === mappings.phi) return "phi";
    return null;
  };

  const getColumnColor = (type: "energy" | "absorption" | "theta" | "phi"): "accent" | "default" | "success" | "warning" | "danger" => {
    switch (type) {
      case "energy":
        return "accent";
      case "absorption":
        return "default";
      case "theta":
        return "warning";
      case "phi":
        return "success";
    }
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
      maxWidth="max-w-5xl"
    >
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Assign columns using the dropdown widgets in the table headers. Required: Energy and Absorption.
      </div>

      {/* Column Assignment Status - Moved to Top */}
      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {/* Energy */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Chip
                size="sm"
                variant="primary"
                color={mappings.energy ? "accent" : "default"}
                className="h-6 px-2.5 text-xs font-semibold text-white"
              >
                Energy
              </Chip>
              <span className="text-red-500">*</span>
            </label>
            <div className="relative" ref={openStatusDropdown === "energy" ? statusDropdownRef : null}>
              <button
                type="button"
                onClick={() =>
                  setOpenStatusDropdown(
                    openStatusDropdown === "energy" ? null : "energy",
                  )
                }
                className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                  mappings.energy
                    ? "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-200"
                    : "border-gray-300 bg-white text-gray-500 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:border-gray-500"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">
                    {mappings.energy || "Select column..."}
                  </span>
                  <ChevronDownIcon className="h-3 w-3 shrink-0" />
                </div>
              </button>
              {openStatusDropdown === "energy" && (
                <div className="absolute left-0 top-full z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMappings({ ...mappings, energy: "" });
                        setOpenStatusDropdown(null);
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                    >
                      None
                    </button>
                    {columns.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => {
                          setMappings({ ...mappings, energy: col });
                          setOpenStatusDropdown(null);
                        }}
                        className={`w-full px-3 py-1.5 text-left text-xs ${
                          mappings.energy === col
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        }`}
                      >
                        {col} {mappings.energy === col && "✓"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Absorption */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Chip
                size="sm"
                variant="primary"
                color={mappings.absorption ? "accent" : "default"}
                className="h-6 px-2.5 text-xs font-semibold text-white"
              >
                Absorption
              </Chip>
              <span className="text-red-500">*</span>
            </label>
            <div className="relative" ref={openStatusDropdown === "absorption" ? statusDropdownRef : null}>
              <button
                type="button"
                onClick={() =>
                  setOpenStatusDropdown(
                    openStatusDropdown === "absorption" ? null : "absorption",
                  )
                }
                className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                  mappings.absorption
                    ? "border-purple-300 bg-purple-50 text-purple-900 dark:border-purple-700 dark:bg-purple-900/20 dark:text-purple-200"
                    : "border-gray-300 bg-white text-gray-500 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:border-gray-500"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">
                    {mappings.absorption || "Select column..."}
                  </span>
                  <ChevronDownIcon className="h-3 w-3 shrink-0" />
                </div>
              </button>
              {openStatusDropdown === "absorption" && (
                <div className="absolute left-0 top-full z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMappings({ ...mappings, absorption: "" });
                        setOpenStatusDropdown(null);
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                    >
                      None
                    </button>
                    {columns.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => {
                          setMappings({ ...mappings, absorption: col });
                          setOpenStatusDropdown(null);
                        }}
                        className={`w-full px-3 py-1.5 text-left text-xs ${
                          mappings.absorption === col
                            ? "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200"
                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        }`}
                      >
                        {col} {mappings.absorption === col && "✓"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Theta */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Chip
                size="sm"
                variant="primary"
                color={
                  thetaMode === "column" && mappings.theta
                    ? "warning"
                    : thetaMode === "fixed" && fixedTheta
                      ? "warning"
                      : "default"
                }
                className="h-6 px-2.5 text-xs font-semibold text-white"
              >
                Theta
              </Chip>
            </label>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-gray-600 dark:text-gray-400">
                <span>Column</span>
                <span>Fixed</span>
              </div>
              <Slider
                step={1}
                minValue={0}
                maxValue={1}
                value={thetaMode === "column" ? 0 : 1}
                onChange={(value) => {
                  const numValue =
                    typeof value === "number"
                      ? value
                      : Array.isArray(value) && value.length > 0
                        ? value[0]
                        : 0;
                  const newMode = numValue === 0 ? "column" : "fixed";
                  setThetaMode(newMode);
                  if (newMode === "column") {
                    setFixedTheta("");
                  } else {
                    setMappings({ ...mappings, theta: undefined });
                  }
                }}
                className="w-full"
                aria-label="Theta mode"
              >
                <Slider.Track className="bg-gray-200 dark:bg-gray-700">
                  <Slider.Fill className="bg-accent dark:bg-accent-light" />
                  <Slider.Thumb />
                </Slider.Track>
              </Slider>
            </div>
            {thetaMode === "column" ? (
              <div className="relative" ref={openStatusDropdown === "theta" ? statusDropdownRef : null}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenStatusDropdown(
                      openStatusDropdown === "theta" ? null : "theta",
                    )
                  }
                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                    mappings.theta
                      ? "border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-700 dark:bg-orange-900/20 dark:text-orange-200"
                      : "border-gray-300 bg-white text-gray-500 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:border-gray-500"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">
                      {mappings.theta ?? "Select column..."}
                    </span>
                    <ChevronDownIcon className="h-3 w-3 shrink-0" />
                  </div>
                </button>
                {openStatusDropdown === "theta" && (
                  <div className="absolute left-0 top-full z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setMappings({ ...mappings, theta: undefined });
                          setOpenStatusDropdown(null);
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                      >
                        None
                      </button>
                      {columns.map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => {
                            setMappings({ ...mappings, theta: col });
                            setOpenStatusDropdown(null);
                          }}
                          className={`w-full px-3 py-1.5 text-left text-xs ${
                            mappings.theta === col
                              ? "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-200"
                              : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                          }`}
                        >
                          {col} {mappings.theta === col && "✓"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <input
                type="number"
                value={fixedTheta}
                onChange={(e) => setFixedTheta(e.target.value)}
                placeholder="Fixed value (°)"
                step="0.01"
                className="w-full rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-xs text-orange-900 placeholder:text-orange-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-orange-700 dark:bg-orange-900/20 dark:text-orange-200 dark:placeholder:text-orange-500 dark:focus:ring-orange-800"
              />
            )}
          </div>

          {/* Phi */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Chip
                size="sm"
                variant="primary"
                color={
                  phiMode === "column" && mappings.phi
                    ? "success"
                    : phiMode === "fixed" && fixedPhi
                      ? "success"
                      : "default"
                }
                className="h-6 px-2.5 text-xs font-semibold text-white"
              >
                Phi
              </Chip>
            </label>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-gray-600 dark:text-gray-400">
                <span>Column</span>
                <span>Fixed</span>
              </div>
              <Slider
                step={1}
                minValue={0}
                maxValue={1}
                value={phiMode === "column" ? 0 : 1}
                onChange={(value) => {
                  const numValue =
                    typeof value === "number"
                      ? value
                      : Array.isArray(value) && value.length > 0
                        ? value[0]
                        : 0;
                  const newMode = numValue === 0 ? "column" : "fixed";
                  setPhiMode(newMode);
                  if (newMode === "column") {
                    setFixedPhi("");
                  } else {
                    setMappings({ ...mappings, phi: undefined });
                  }
                }}
                className="w-full"
                aria-label="Phi mode"
              >
                <Slider.Track className="bg-gray-200 dark:bg-gray-700">
                  <Slider.Fill className="bg-accent dark:bg-accent-light" />
                  <Slider.Thumb />
                </Slider.Track>
              </Slider>
            </div>
            {phiMode === "column" ? (
              <div className="relative" ref={openStatusDropdown === "phi" ? statusDropdownRef : null}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenStatusDropdown(
                      openStatusDropdown === "phi" ? null : "phi",
                    )
                  }
                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                    mappings.phi
                      ? "border-teal-300 bg-teal-50 text-teal-900 dark:border-teal-700 dark:bg-teal-900/20 dark:text-teal-200"
                      : "border-gray-300 bg-white text-gray-500 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:border-gray-500"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">
                      {mappings.phi ?? "Select column..."}
                    </span>
                    <ChevronDownIcon className="h-3 w-3 shrink-0" />
                  </div>
                </button>
                {openStatusDropdown === "phi" && (
                  <div className="absolute left-0 top-full z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setMappings({ ...mappings, phi: undefined });
                          setOpenStatusDropdown(null);
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                      >
                        None
                      </button>
                      {columns.map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => {
                            setMappings({ ...mappings, phi: col });
                            setOpenStatusDropdown(null);
                          }}
                          className={`w-full px-3 py-1.5 text-left text-xs ${
                            mappings.phi === col
                              ? "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-200"
                              : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                          }`}
                        >
                          {col} {mappings.phi === col && "✓"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <input
                type="number"
                value={fixedPhi}
                onChange={(e) => setFixedPhi(e.target.value)}
                placeholder="Fixed value (°)"
                step="0.01"
                className="w-full rounded-lg border border-teal-300 bg-teal-50 px-3 py-2 text-xs text-teal-900 placeholder:text-teal-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200 dark:border-teal-700 dark:bg-teal-900/20 dark:text-teal-200 dark:placeholder:text-teal-500 dark:focus:ring-teal-800"
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Left Side: Data Table */}
        {previewRows.length > 0 && (
          <div className="flex flex-col">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Data Preview (first {previewRows.length} rows)
            </label>
            <div className="flex-1 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700" style={{ minHeight: '500px', maxHeight: '500px' }}>
              <table className="min-w-full divide-y divide-gray-200 text-xs dark:divide-gray-700">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {columns.map((col) => {
                      const mappingType = getColumnMappingType(col);
                      const isMapped = mappingType !== null;

                      return (
                        <th
                          key={col}
                          className="relative px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="truncate flex-1">{col}</span>
                            {isMapped && (
                              <Chip
                                size="sm"
                                variant="primary"
                                color={getColumnColor(mappingType)}
                                className="h-5 shrink-0 px-2 text-[10px] font-semibold text-white"
                              >
                                {mappingType === "energy"
                                  ? "Energy"
                                  : mappingType === "absorption"
                                    ? "Absorption"
                                    : mappingType === "theta"
                                      ? "Theta"
                                      : "Phi"}
                              </Chip>
                            )}
                            <div className="relative shrink-0" ref={openDropdown === col ? dropdownRef : null}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdown(openDropdown === col ? null : col);
                                }}
                                className={`rounded p-0.5 transition-colors ${
                                  isMapped
                                    ? "hover:bg-white/50 dark:hover:bg-gray-700/50"
                                    : "hover:bg-gray-200 dark:hover:bg-gray-700"
                                }`}
                                title="Assign column"
                              >
                                <ChevronDownIcon className="h-3.5 w-3.5" />
                              </button>
                              {openDropdown === col && (
                                <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
                                  <div className="py-1">
                                    <button
                                      type="button"
                                      onClick={() => handleAssignColumn(col, "energy")}
                                      className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition-colors ${
                                        mappingType === "energy"
                                          ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                      }`}
                                    >
                                      <Chip
                                        size="sm"
                                        variant="primary"
                                        color="accent"
                                        className="h-5 px-2 text-[10px] font-semibold text-white"
                                      >
                                        Energy
                                      </Chip>
                                      {mappingType === "energy" && <span className="ml-auto">✓</span>}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAssignColumn(col, "absorption")}
                                      className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition-colors ${
                                        mappingType === "absorption"
                                          ? "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200"
                                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                      }`}
                                    >
                                      <Chip
                                        size="sm"
                                        variant="primary"
                                        color="accent"
                                        className="h-5 px-2 text-[10px] font-semibold text-white"
                                      >
                                        Absorption
                                      </Chip>
                                      {mappingType === "absorption" && <span className="ml-auto">✓</span>}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAssignColumn(col, "theta")}
                                      className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition-colors ${
                                        mappingType === "theta"
                                          ? "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-200"
                                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                      }`}
                                    >
                                      <Chip
                                        size="sm"
                                        variant="primary"
                                        color="warning"
                                        className="h-5 px-2 text-[10px] font-semibold text-white"
                                      >
                                        Theta
                                      </Chip>
                                      {mappingType === "theta" && <span className="ml-auto">✓</span>}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAssignColumn(col, "phi")}
                                      className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition-colors ${
                                        mappingType === "phi"
                                          ? "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-200"
                                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                      }`}
                                    >
                                      <Chip
                                        size="sm"
                                        variant="primary"
                                        color="success"
                                        className="h-5 px-2 text-[10px] font-semibold text-white"
                                      >
                                        Phi
                                      </Chip>
                                      {mappingType === "phi" && <span className="ml-auto">✓</span>}
                                    </button>
                                    {isMapped && (
                                      <>
                                        <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                                        <button
                                          type="button"
                                          onClick={() => handleAssignColumn(col, "none")}
                                          className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                          Unassign
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      {columns.map((col) => {
                        return (
                          <td
                            key={col}
                            className="px-2 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100"
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
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Right Side: Preview Graph */}
        <div className="flex flex-col">
          {previewPoints.length > 0 && mappings.energy && mappings.absorption ? (
            <div className="flex flex-1 flex-col rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800" style={{ minHeight: '500px', maxHeight: '500px' }}>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Preview Graph
              </label>
              <div className="flex-1">
                <SpectrumPlot points={previewPoints} height={450} />
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50" style={{ minHeight: '500px', maxHeight: '500px' }}>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Assign Energy and Absorption columns to see preview
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={handleConfirm}
          isDisabled={!mappings.energy || !mappings.absorption}
        >
          Confirm
        </Button>
      </div>
    </SimpleDialog>
  );
}
