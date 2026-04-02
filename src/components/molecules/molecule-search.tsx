"use client";

import React, { useState, useEffect, useRef } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { LoadingSkeleton } from "../feedback/loading-state";
import Link from "next/link";
import { toSimpleHeaderResult } from "~/lib/molecule-autosuggest";
import { canonicalMoleculeSlugFromView } from "~/lib/molecule-slug";

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
  const { data, isLoading, isError } = trpc.molecules.autosuggest.useQuery(
    {
      query: debouncedQuery,
      limit: 5,
    },
    {
      enabled: debouncedQuery.length >= 1,
      staleTime: 60000,
      gcTime: 300000,
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

  const handleResultClick = (slug: string, moleculeId: string) => {
    if (onResultClick) {
      onResultClick(moleculeId);
    } else {
      router.push(`/molecules/${slug}`);
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
          <MagnifyingGlassIcon className="text-muted absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="border-border bg-surface text-foreground placeholder:text-muted focus:border-accent focus:ring-accent w-full rounded-lg border py-3 pr-12 pl-12 focus:ring-2 focus:ring-offset-2 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="text-muted hover:text-foreground absolute top-1/2 right-4 -translate-y-1/2 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </form>

      {/* Results Dropdown */}
      {showDropdown && (
        <div className="border-border bg-surface absolute z-50 mt-2 w-full rounded-lg border shadow-xl">
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
            <div className="text-danger p-4 text-sm">
              Error loading search results
            </div>
          )}

          {!isLoading && !isError && hasResults && (
            <div className="max-h-96 overflow-y-auto">
              {data.results.map((rawItem) => {
                const molecule = toSimpleHeaderResult(rawItem);
                const slug = canonicalMoleculeSlugFromView({
                  name: molecule.commonName ?? molecule.iupacName,
                  iupacName: molecule.iupacName,
                });
                return (
                  <button
                    key={molecule.id}
                    onClick={() => handleResultClick(slug, molecule.id)}
                    className="border-border text-foreground hover:bg-default w-full border-b px-4 py-3 text-left transition-colors"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold">
                        {molecule.commonName || molecule.iupacName}
                      </span>
                      {molecule.commonName !== molecule.iupacName && (
                        <span className="text-muted text-xs">
                          {molecule.iupacName}
                        </span>
                      )}
                      <span className="text-muted text-sm">
                        {molecule.chemicalFormula}
                      </span>
                    </div>
                  </button>
                );
              })}
              <Link
                href={`/browse?q=${encodeURIComponent(debouncedQuery)}`}
                className="border-border text-accent hover:bg-default block border-t px-4 py-3 text-center text-sm font-medium transition-colors"
                onClick={() => setIsOpen(false)}
              >
                View all results ({data.results.length})
              </Link>
            </div>
          )}

          {!isLoading &&
            !isError &&
            !hasResults &&
            debouncedQuery.length >= 1 && (
              <div className="text-muted p-4 text-center text-sm">
                No molecules found for &quot;{debouncedQuery}&quot;
              </div>
            )}
        </div>
      )}
    </div>
  );
}
