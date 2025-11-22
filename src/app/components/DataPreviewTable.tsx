"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface DataPreviewTableProps {
  data: Record<string, unknown>[];
  maxRows?: number;
  title?: string;
}

export function DataPreviewTable({
  data,
  maxRows = 5,
  title,
}: DataPreviewTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = maxRows;

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No data to display
        </p>
      </div>
    );
  }

  // Get column headers from first row
  const headers = Object.keys(data[0] ?? {});
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const pageData = data.slice(startIndex, endIndex);

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") {
      // Format numbers with appropriate precision
      if (Number.isInteger(value)) return value.toString();
      return value.toFixed(6).replace(/\.?0+$/, "");
    }
    if (typeof value === "boolean") {
      return value.toString();
    }
    if (typeof value === "bigint") {
      return value.toString();
    }
    if (typeof value === "symbol") {
      return value.toString();
    }
    if (typeof value === "function") {
      return "[Function]";
    }
    if (typeof value === "object") {
      // Handle objects with JSON.stringify to avoid [object Object]
      return JSON.stringify(value);
    }
    // Should never reach here, but handle as fallback
    return "[Unknown type]";
  };

  return (
    <div className="space-y-4">
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {data.length} total row{data.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-700 uppercase dark:text-gray-300"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {pageData.map((row, rowIndex) => (
              <tr
                key={startIndex + rowIndex}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                {headers.map((header) => (
                  <td
                    key={header}
                    className="px-4 py-3 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100"
                  >
                    {formatValue(row[header])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Showing {startIndex + 1} to {Math.min(endIndex, data.length)} of{" "}
            {data.length} rows
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
