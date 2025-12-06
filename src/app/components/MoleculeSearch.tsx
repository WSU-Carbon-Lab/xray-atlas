"use client";

import React, { useState, useEffect, useRef } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { LoadingSkeleton } from "./LoadingState";
import Link from "next/link";

interface MoleculeSearchProps {
  onResultClick?: (moleculeId: string) => void;
  placeholder?: string;
  className?: string;
  showResults?: boolean;
}

export function MoleculeSearch({
  onResultClick,
  placeholder = "Search molecules by name, formula, CAS number...",
  className = "",
  showResults = true,
}: MoleculeSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounce search query - reduced from 300ms to 150ms for faster response
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Search query
  const { data, isLoading, isError } = trpc.molecules.searchAdvanced.useQuery(
    {
      query: debouncedQuery,
      limit: 5,
      offset: 0,
    },
    {
      enabled: debouncedQuery.length >= 1, // Enable search with just 1 character
      staleTime: 60000, // Cache for 60 seconds
      gcTime: 300000, // Keep in cache for 5 minutes
    },
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
  };

  const handleResultClick = (moleculeId: string) => {
    if (onResultClick) {
      onResultClick(moleculeId);
    } else {
      router.push(`/molecules/${moleculeId}`);
    }
    setIsOpen(false);
    setQuery("");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (debouncedQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(debouncedQuery)}`);
      setIsOpen(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setDebouncedQuery("");
    setIsOpen(false);
  };

  const hasResults = data && data.results.length > 0;
  const showDropdown = isOpen && showResults && debouncedQuery.length > 0;

  return (
    <div ref={searchRef} className={`relative w-full ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="focus:border-wsu-crimson focus:ring-wsu-crimson dark:focus:border-wsu-crimson w-full rounded-lg border border-gray-300 bg-white py-3 pr-12 pl-12 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </form>

      {/* Results Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
          {isLoading && (
            <div className="p-4">
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <LoadingSkeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </div>
          )}

          {isError && (
            <div className="p-4 text-sm text-red-600 dark:text-red-400">
              Error loading search results
            </div>
          )}

          {!isLoading && !isError && hasResults && (
            <div className="max-h-96 overflow-y-auto">
              {data.results.map(
                (molecule: {
                  id: string;
                  commonName: string;
                  iupacName: string;
                  chemicalFormula: string;
                }) => (
                  <button
                    key={molecule.id}
                    onClick={() => handleResultClick(molecule.id)}
                    className="w-full border-b border-gray-200 px-4 py-3 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {molecule.commonName || molecule.iupacName}
                      </span>
                      {molecule.commonName !== molecule.iupacName && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {molecule.iupacName}
                        </span>
                      )}
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {molecule.chemicalFormula}
                      </span>
                    </div>
                  </button>
                ),
              )}
              <Link
                href={`/browse?q=${encodeURIComponent(debouncedQuery)}`}
                className="text-wsu-crimson block border-t border-gray-200 px-4 py-3 text-center text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                onClick={() => setIsOpen(false)}
              >
                View all results ({data.total})
              </Link>
            </div>
          )}

          {!isLoading &&
            !isError &&
            !hasResults &&
            debouncedQuery.length >= 1 && (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                No molecules found for &quot;{debouncedQuery}&quot;
              </div>
            )}
        </div>
      )}
    </div>
  );
}
