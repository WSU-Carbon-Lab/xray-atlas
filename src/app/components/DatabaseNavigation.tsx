"use client";

import React, { useState } from "react";
import { FunnelIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { DefaultButton as Button } from "./Button";

export interface Filter {
  field: string;
  value: string;
  label: string;
}

interface DatabaseNavigationProps {
  filters?: Filter[];
  onFilterChange?: (filters: Filter[]) => void;
  sortBy?: string;
  onSortChange?: (sortBy: string) => void;
  totalResults?: number;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function DatabaseNavigation({
  filters = [],
  onFilterChange,
  sortBy = "relevance",
  onSortChange,
  totalResults,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}: DatabaseNavigationProps) {
  const [showFilters, setShowFilters] = useState(false);

  const handleRemoveFilter = (index: number) => {
    if (onFilterChange) {
      const newFilters = filters.filter((_, i) => i !== index);
      onFilterChange(newFilters);
    }
  };

  const handleClearAllFilters = () => {
    if (onFilterChange) {
      onFilterChange([]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters and Sort Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Active Filters */}
        {filters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filters:
            </span>
            {filters.map((filter, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                <span className="font-medium">{filter.label}:</span>
                <span>{filter.value}</span>
                <button
                  onClick={() => handleRemoveFilter(index)}
                  className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              onClick={handleClearAllFilters}
              className="text-sm text-wsu-crimson hover:underline"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Sort and Filter Toggle */}
        <div className="flex items-center gap-3">
          {onSortChange && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="sort-select"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Sort:
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-wsu-crimson focus:outline-none focus:ring-2 focus:ring-wsu-crimson dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="relevance">Relevance</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
              </select>
            </div>
          )}

          {onFilterChange && (
            <Button
              variant="bordered"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <FunnelIcon className="h-4 w-4" />
              Filters
            </Button>
          )}
        </div>
      </div>

      {/* Results Count */}
      {totalResults !== undefined && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {totalResults} {totalResults === 1 ? "result" : "results"} found
        </div>
      )}

      {/* Pagination */}
      {onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="bordered"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </Button>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="bordered"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
