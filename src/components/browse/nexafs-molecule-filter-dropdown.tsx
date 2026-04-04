"use client";

import { useState, useEffect } from "react";
import { Dropdown, Input, Label } from "@heroui/react";
import { BeakerIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { trpc } from "~/trpc/client";

const searchInputClass =
  "border-border bg-surface text-foreground placeholder:text-muted w-full rounded-lg border px-3 py-2 text-sm focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20";

export type NexafsMoleculeFilterDropdownProps = {
  moleculeId: string | undefined;
  onMoleculeChange: (id: string | undefined) => void;
};

export function NexafsMoleculeFilterDropdown({
  moleculeId,
  onMoleculeChange,
}: NexafsMoleculeFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: options = [], isLoading } =
    trpc.experiments.browseMoleculeOptions.useQuery(
      { query: debounced || undefined, limit: 60 },
      { staleTime: 30_000, enabled: isOpen },
    );

  const { data: summary } = trpc.experiments.browseMoleculeSummary.useQuery(
    { id: moleculeId! },
    { enabled: !!moleculeId, staleTime: 60_000 },
  );

  const hasSelection = !!moleculeId;
  const displayName = summary?.iupacname ?? (hasSelection ? "Molecule" : null);

  return (
    <Dropdown isOpen={isOpen} onOpenChange={setIsOpen}>
      <Dropdown.Trigger
        aria-label="Filter by molecule"
        aria-pressed={hasSelection}
        className={`border-border bg-surface text-foreground focus-visible:ring-accent flex h-12 max-w-[min(100%,220px)] min-h-12 shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 transition-colors hover:bg-default focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${hasSelection ? "border-accent/40 bg-accent/15 text-accent" : "text-muted"}`}
      >
        <BeakerIcon className="h-5 w-5 shrink-0 stroke-[1.5]" aria-hidden />
        <span className="truncate text-left text-sm font-medium">
          {hasSelection && displayName ? displayName : "Molecule"}
        </span>
      </Dropdown.Trigger>
      <Dropdown.Popover className="border-border bg-surface max-h-[min(320px,50vh)] w-[min(100vw-2rem,320px)] overflow-hidden rounded-2xl border py-0.5 shadow-xl">
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
              }}
              className="text-muted focus-visible:ring-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-default focus:outline-none focus-visible:ring-2"
            >
              <XMarkIcon className="h-4 w-4 shrink-0" aria-hidden />
              Any molecule
            </button>
          ) : null}
        </div>
        {isLoading ? (
          <div className="text-muted px-3 py-2 text-sm">Loading…</div>
        ) : options.length === 0 ? (
          <div className="text-muted px-3 py-2 text-sm">No molecules match</div>
        ) : (
          <Dropdown.Menu
            aria-label="Choose molecule"
            selectionMode="none"
            className="max-h-[min(260px,45vh)] overflow-y-auto py-0.5 outline-none"
            onAction={(key) => {
              onMoleculeChange(String(key));
              setIsOpen(false);
            }}
          >
            {options.map((m) => (
              <Dropdown.Item
                key={m.id}
                id={m.id}
                textValue={m.iupacname}
                className="min-h-0 py-1.5"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Label className="truncate text-sm font-medium">
                    {m.iupacname}
                  </Label>
                  <span className="text-muted font-mono text-xs tabular-nums">
                    {m.chemicalformula}
                  </span>
                </div>
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        )}
      </Dropdown.Popover>
    </Dropdown>
  );
}
