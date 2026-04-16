"use client";

import { useState, useEffect } from "react";
import { Input } from "@heroui/react";
import { BeakerIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { trpc } from "~/trpc/client";
import { PopoverMenu, PopoverMenuContent } from "~/components/ui/popover-menu";

const searchInputClass =
  "border-border bg-surface text-foreground placeholder:text-muted w-full rounded-lg border px-3 py-2 text-sm focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20";

const triggerBase =
  "border-border bg-surface text-muted focus-visible:ring-accent flex h-12 max-w-[min(100%,220px)] min-h-12 shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 transition-colors hover:bg-default hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

export type NexafsMoleculeFilterDropdownProps = {
  moleculeId: string | undefined;
  onMoleculeChange: (id: string | undefined) => void;
};

export function NexafsMoleculeFilterDropdown({
  moleculeId,
  onMoleculeChange,
}: NexafsMoleculeFilterDropdownProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: options = [], isLoading } =
    trpc.experiments.browseMoleculeOptions.useQuery(
      { query: debounced || undefined, limit: 60 },
      { staleTime: 30_000, enabled: menuOpen },
    );

  const { data: summary } = trpc.experiments.browseMoleculeSummary.useQuery(
    { id: moleculeId! },
    { enabled: !!moleculeId, staleTime: 60_000 },
  );

  const hasSelection = !!moleculeId;
  const displayName = summary?.iupacname ?? (hasSelection ? "Molecule" : null);

  return (
    <PopoverMenu
      align="end"
      contentClassName="w-[min(100vw-2rem,320px)]"
      onOpenChange={setMenuOpen}
      renderTrigger={({ triggerProps, isOpen }) => (
        <button
          {...triggerProps}
          aria-label="Filter by molecule"
          aria-pressed={hasSelection}
          type="button"
          className={`${triggerBase} ${hasSelection ? "border-accent/40 bg-accent-soft text-accent hover:text-accent" : ""}`}
        >
          <BeakerIcon
            className="h-5 w-5 shrink-0 stroke-[1.5] text-current"
            aria-hidden
          />
          <span className="truncate text-left text-sm font-medium">
            {hasSelection && displayName ? displayName : "Molecule"}
          </span>
          <span className="sr-only">
            {isOpen ? "Close molecule filter" : "Open molecule filter"}
          </span>
        </button>
      )}
      renderContent={({ contentPositionClassName, contentProps, close }) => (
        <PopoverMenuContent
          {...contentProps}
          className={`${contentPositionClassName} max-h-[min(320px,50vh)] overflow-hidden rounded-2xl py-0.5`}
        >
          <div
            className="border-border space-y-1.5 border-b px-2 py-2"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search molecules with spectra…"
              aria-label="Search molecules that have NEXAFS data"
              className={searchInputClass}
            />
            {hasSelection ? (
              <button
                type="button"
                onClick={() => {
                  onMoleculeChange(undefined);
                  setSearchInput("");
                  close();
                }}
                className="text-muted focus-visible:ring-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-default focus:outline-none focus-visible:ring-2"
              >
                <XMarkIcon className="h-4 w-4 shrink-0" aria-hidden />
                Any molecule
              </button>
            ) : null}
          </div>
          <div
            className="max-h-[min(260px,45vh)] overflow-y-auto py-0.5"
            aria-label="Choose molecule"
          >
            {isLoading ? (
              <div className="text-muted px-3 py-2 text-sm">Loading…</div>
            ) : options.length === 0 ? (
              <div className="text-muted px-3 py-2 text-sm">No molecules match</div>
            ) : (
              options.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onMoleculeChange(m.id);
                    close();
                  }}
                  className="hover:bg-default flex w-full min-w-0 flex-col gap-0.5 px-3 py-1.5 text-left transition-colors"
                >
                  <span className="truncate text-sm font-medium">{m.iupacname}</span>
                  <span className="text-muted font-mono text-xs tabular-nums">
                    {m.chemicalformula}
                  </span>
                </button>
              ))
            )}
          </div>
        </PopoverMenuContent>
      )}
    />
  );
}
