"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Input,
} from "@heroui/react";
import type {
  CSVColumnMappings,
} from "~/app/contribute/nexafs/types";

interface InlineColumnMappingProps {
  columns: string[];
  rawData: Record<string, unknown>[];
  mappings: CSVColumnMappings;
  fixedTheta?: string;
  fixedPhi?: string;
  onMappingsChange: (mappings: CSVColumnMappings) => void;
  onFixedValuesChange?: (values: { theta?: string; phi?: string }) => void;
}

const COLUMN_COLORS = {
  energy: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    border: "border-blue-300 dark:border-blue-700",
    text: "text-blue-900 dark:text-blue-200",
  },
  absorption: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    border: "border-purple-300 dark:border-purple-700",
    text: "text-purple-900 dark:text-purple-200",
  },
  theta: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    border: "border-orange-300 dark:border-orange-700",
    text: "text-orange-900 dark:text-orange-200",
  },
  phi: {
    bg: "bg-teal-100 dark:bg-teal-900/30",
    border: "border-teal-300 dark:border-teal-700",
    text: "text-teal-900 dark:text-teal-200",
  },
} as const;

export function InlineColumnMapping({
  columns,
  rawData,
  mappings,
  fixedTheta = "",
  fixedPhi = "",
  onMappingsChange,
  onFixedValuesChange,
}: InlineColumnMappingProps) {
  const [thetaMode, setThetaMode] = useState<"column" | "fixed">(
    mappings.theta ? "column" : fixedTheta ? "fixed" : "column",
  );
  const [phiMode, setPhiMode] = useState<"column" | "fixed">(
    mappings.phi ? "column" : fixedPhi ? "fixed" : "column",
  );
  const [localFixedTheta, setLocalFixedTheta] = useState<string>(fixedTheta);
  const [localFixedPhi, setLocalFixedPhi] = useState<string>(fixedPhi);
  const [fixedThetaColumn, setFixedThetaColumn] = useState<string | null>(null);
  const [fixedPhiColumn, setFixedPhiColumn] = useState<string | null>(null);

  useEffect(() => {
    setLocalFixedTheta(fixedTheta);
  }, [fixedTheta]);

  useEffect(() => {
    setLocalFixedPhi(fixedPhi);
  }, [fixedPhi]);

  useEffect(() => {
    if (mappings.theta) {
      setThetaMode("column");
    } else if (fixedTheta) {
      setThetaMode("fixed");
    }
  }, [mappings.theta, fixedTheta]);

  useEffect(() => {
    if (mappings.phi) {
      setPhiMode("column");
    } else if (fixedPhi) {
      setPhiMode("fixed");
    }
  }, [mappings.phi, fixedPhi]);

  const getColumnMappingType = (
    columnName: string,
  ): "energy" | "absorption" | "theta" | "phi" | null => {
    if (columnName === mappings.energy) return "energy";
    if (columnName === mappings.absorption) return "absorption";
    if (columnName === mappings.theta) return "theta";
    if (columnName === mappings.phi) return "phi";
    return null;
  };

  const handleAssignColumn = (
    columnName: string,
    type: "energy" | "absorption" | "theta" | "phi" | "none",
  ) => {
    const newMappings = { ...mappings };

    if (type === "none") {
      if (mappings.energy === columnName) newMappings.energy = "";
      if (mappings.absorption === columnName) newMappings.absorption = "";
      if (mappings.theta === columnName) newMappings.theta = "";
      if (mappings.phi === columnName) newMappings.phi = "";
    } else {
      if (type === "energy") {
        if (mappings.absorption === columnName) newMappings.absorption = "";
        if (mappings.theta === columnName) newMappings.theta = "";
        if (mappings.phi === columnName) newMappings.phi = "";
        newMappings.energy = columnName;
      } else if (type === "absorption") {
        if (mappings.energy === columnName) newMappings.energy = "";
        if (mappings.theta === columnName) newMappings.theta = "";
        if (mappings.phi === columnName) newMappings.phi = "";
        newMappings.absorption = columnName;
      } else if (type === "theta") {
        if (mappings.energy === columnName) newMappings.energy = "";
        if (mappings.absorption === columnName) newMappings.absorption = "";
        if (mappings.phi === columnName) newMappings.phi = "";
        newMappings.theta = columnName;
        setThetaMode("column");
      } else if (type === "phi") {
        if (mappings.energy === columnName) newMappings.energy = "";
        if (mappings.absorption === columnName) newMappings.absorption = "";
        if (mappings.theta === columnName) newMappings.theta = "";
        newMappings.phi = columnName;
        setPhiMode("column");
      }
    }

    onMappingsChange(newMappings);
  };

  const handleFixedValueChange = (type: "theta" | "phi", value: string) => {
    if (type === "theta") {
      setLocalFixedTheta(value);
      setThetaMode("fixed");
      const newMappings = { ...mappings };
      if (newMappings.theta) {
        newMappings.theta = "";
      }
      onMappingsChange(newMappings);
      onFixedValuesChange?.({ theta: value });
    } else {
      setLocalFixedPhi(value);
      setPhiMode("fixed");
      const newMappings = { ...mappings };
      if (newMappings.phi) {
        newMappings.phi = "";
      }
      onMappingsChange(newMappings);
      onFixedValuesChange?.({ phi: value });
    }
  };

  const previewRows = rawData.slice(0, 10).map((row, index) => ({
    ...row,
    __rowIndex: index,
  }));

  const getDisplayValue = (row: Record<string, unknown>, col: string) => {
    if (thetaMode === "fixed" && localFixedTheta && fixedThetaColumn === col) {
      return localFixedTheta;
    }
    if (phiMode === "fixed" && localFixedPhi && fixedPhiColumn === col) {
      return localFixedPhi;
    }

    const cellVal = row[col];
    if (cellVal === null || cellVal === undefined) return "";
    if (typeof cellVal === "string" || typeof cellVal === "number")
      return String(cellVal);
    return JSON.stringify(cellVal);
  };

  return (
    <div className="space-y-4">
      {previewRows.length > 0 && (
        <div className="flex flex-col">
          <Table
            aria-label="CSV data preview with column mapping"
            classNames={{
              wrapper: "max-h-[600px] border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm",
            }}
          >
            <TableHeader>
              {columns.map((col) => {
                const mappingType = getColumnMappingType(col);
                const isMapped = mappingType !== null;
                const isFixedThetaCol = thetaMode === "fixed" && fixedThetaColumn === col;
                const isFixedPhiCol = phiMode === "fixed" && fixedPhiColumn === col;
                const colorScheme = isFixedThetaCol
                  ? COLUMN_COLORS.theta
                  : isFixedPhiCol
                    ? COLUMN_COLORS.phi
                    : mappingType
                      ? COLUMN_COLORS[mappingType]
                      : null;

                return (
                  <TableColumn key={col}>
                    <Dropdown>
                      <DropdownTrigger>
                        <div
                          className={`flex-1 rounded-lg border-2 px-3 py-2 cursor-pointer transition-all hover:shadow-md ${
                            colorScheme
                              ? `${colorScheme.bg} ${colorScheme.border} ${colorScheme.text}`
                              : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                          } shadow-sm`}
                        >
                          <span className="text-sm font-semibold">{col}</span>
                        </div>
                      </DropdownTrigger>
                      <DropdownMenu
                        aria-label="Column assignment"
                        classNames={{
                          base: "bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-2xl min-w-[200px] p-2 gap-1",
                        }}
                        onAction={(key) => {
                          if (key === "none") {
                            handleAssignColumn(col, "none");
                            if (fixedThetaColumn === col) {
                              setFixedThetaColumn(null);
                              setThetaMode("column");
                            }
                            if (fixedPhiColumn === col) {
                              setFixedPhiColumn(null);
                              setPhiMode("column");
                            }
                          } else if (key === "theta-fixed") {
                            setFixedThetaColumn(col);
                            setThetaMode("fixed");
                            handleAssignColumn(col, "none");
                          } else if (key === "phi-fixed") {
                            setFixedPhiColumn(col);
                            setPhiMode("fixed");
                            handleAssignColumn(col, "none");
                          } else {
                            handleAssignColumn(
                              col,
                              key as "energy" | "absorption" | "theta" | "phi",
                            );
                            if (fixedThetaColumn === col) {
                              setFixedThetaColumn(null);
                              setThetaMode("column");
                            }
                            if (fixedPhiColumn === col) {
                              setFixedPhiColumn(null);
                              setPhiMode("column");
                            }
                          }
                        }}
                      >
                        <DropdownItem
                          key="energy"
                          className={`rounded-lg ${
                            mappingType === "energy"
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200"
                              : ""
                          }`}
                          textValue="Energy"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Energy</span>
                            {mappingType === "energy" && (
                              <span className="text-blue-600 dark:text-blue-400">✓</span>
                            )}
                          </div>
                        </DropdownItem>
                        <DropdownItem
                          key="absorption"
                          className={`rounded-lg ${
                            mappingType === "absorption"
                              ? "bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200"
                              : ""
                          }`}
                          textValue="Absorption"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Absorption</span>
                            {mappingType === "absorption" && (
                              <span className="text-purple-600 dark:text-purple-400">✓</span>
                            )}
                          </div>
                        </DropdownItem>
                        <DropdownItem
                          key="theta"
                          className={`rounded-lg ${
                            mappingType === "theta"
                              ? "bg-orange-100 dark:bg-orange-900/30 text-orange-900 dark:text-orange-200"
                              : ""
                          }`}
                          textValue="Theta"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Theta</span>
                            {mappingType === "theta" && (
                              <span className="text-orange-600 dark:text-orange-400">✓</span>
                            )}
                          </div>
                        </DropdownItem>
                        <DropdownItem
                          key="theta-fixed"
                          textValue="Theta (Fixed Value)"
                          closeOnSelect={false}
                          className="rounded-lg"
                          onPress={() => {
                            setThetaMode("fixed");
                            setFixedThetaColumn(col);
                            handleAssignColumn(col, "none");
                          }}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-orange-900 dark:text-orange-200">
                                Theta (Fixed)
                              </span>
                              {thetaMode === "fixed" && localFixedTheta && (
                                <span className="text-orange-600 dark:text-orange-400 text-xs">✓</span>
                              )}
                            </div>
                            <Input
                              type="number"
                              size="sm"
                              placeholder="Enter value (°)"
                              value={localFixedTheta}
                              onChange={(e) => {
                                const value = e.target.value;
                                setLocalFixedTheta(value);
                                handleFixedValueChange("theta", value);
                              }}
                              onFocus={() => {
                                setThetaMode("fixed");
                              }}
                              classNames={{
                                base: "w-full",
                                input: "text-xs",
                                inputWrapper: "h-8 rounded-lg border-2 border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20",
                              }}
                            />
                          </div>
                        </DropdownItem>
                        <DropdownItem
                          key="phi"
                          className={`rounded-lg ${
                            mappingType === "phi"
                              ? "bg-teal-100 dark:bg-teal-900/30 text-teal-900 dark:text-teal-200"
                              : ""
                          }`}
                          textValue="Phi"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Phi</span>
                            {mappingType === "phi" && (
                              <span className="text-teal-600 dark:text-teal-400">✓</span>
                            )}
                          </div>
                        </DropdownItem>
                        <DropdownItem
                          key="phi-fixed"
                          textValue="Phi (Fixed Value)"
                          closeOnSelect={false}
                          className="rounded-lg"
                          onPress={() => {
                            setPhiMode("fixed");
                            setFixedPhiColumn(col);
                            handleAssignColumn(col, "none");
                          }}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-teal-900 dark:text-teal-200">
                                Phi (Fixed)
                              </span>
                              {phiMode === "fixed" && localFixedPhi && (
                                <span className="text-teal-600 dark:text-teal-400 text-xs">✓</span>
                              )}
                            </div>
                            <Input
                              type="number"
                              size="sm"
                              placeholder="Enter value (°)"
                              value={localFixedPhi}
                              onChange={(e) => {
                                const value = e.target.value;
                                setLocalFixedPhi(value);
                                handleFixedValueChange("phi", value);
                              }}
                              onFocus={() => {
                                setPhiMode("fixed");
                              }}
                              classNames={{
                                base: "w-full",
                                input: "text-xs",
                                inputWrapper: "h-8 rounded-lg border-2 border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-900/20",
                              }}
                            />
                          </div>
                        </DropdownItem>
                        {isMapped ? (
                          <>
                            <DropdownItem
                              key="divider"
                              isReadOnly
                              className="h-0 p-0 my-1"
                            >
                              <div className="border-t border-gray-300 dark:border-gray-600" />
                            </DropdownItem>
                            <DropdownItem
                              key="none"
                              className="text-danger rounded-lg"
                              color="danger"
                              textValue="Unassign"
                            >
                              <span className="text-sm font-medium">Unassign</span>
                            </DropdownItem>
                          </>
                        ) : null}
                      </DropdownMenu>
                    </Dropdown>
                  </TableColumn>
                );
              })}
            </TableHeader>
            <TableBody items={previewRows}>
              {(row) => {
                const rowIndex = (row as typeof row & { __rowIndex: number }).__rowIndex ?? previewRows.indexOf(row);
                return (
                  <TableRow key={`row-${rowIndex}`}>
                    {columns.map((col) => {
                      const displayValue = getDisplayValue(row, col);
                      const isFixedTheta = thetaMode === "fixed" && fixedThetaColumn === col && localFixedTheta;
                      const isFixedPhi = phiMode === "fixed" && fixedPhiColumn === col && localFixedPhi;

                      return (
                        <TableCell
                          key={`${rowIndex}-${col}`}
                          className={
                            isFixedTheta
                              ? `${COLUMN_COLORS.theta.bg} ${COLUMN_COLORS.theta.text} font-medium`
                              : isFixedPhi
                                ? `${COLUMN_COLORS.phi.bg} ${COLUMN_COLORS.phi.text} font-medium`
                                : ""
                          }
                        >
                          {displayValue}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              }}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
