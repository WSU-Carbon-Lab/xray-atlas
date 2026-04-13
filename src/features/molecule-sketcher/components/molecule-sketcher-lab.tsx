"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button, Card, Input, Label } from "@heroui/react";
import { trpc } from "~/trpc/client";
import { MoleculeImageSVG } from "~/components/molecules/molecule-image-svg";
import { LAB_STRUCTURE_PANE_HEIGHT_PX } from "../constants";

const MoleculeStructureEditorLab = dynamic(
  () =>
    import("./molecule-structure-editor-lab").then(
      (m) => m.MoleculeStructureEditorLab,
    ),
  {
    ssr: false,
    loading: () => (
      <p className="text-muted text-sm">Loading structure editor…</p>
    ),
  },
);

/**
 * Sandbox lab: load a catalog molecule, then compare editor-derived SMILES,
 * formula, and structure to stored catalog values and the cached SVG.
 */
export function MoleculeSketcherLab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [moleculeId, setMoleculeId] = useState<string | null>(null);
  const [uuidInput, setUuidInput] = useState("");
  const [uuidError, setUuidError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 150);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const { data: suggestData, isFetching: isSuggesting } =
    trpc.molecules.autosuggest.useQuery(
      { query: debouncedSearch, limit: 12 },
      { enabled: debouncedSearch.length >= 1, staleTime: 60_000 },
    );

  const {
    data: molecule,
    isLoading: isMoleculeLoading,
    error: moleculeError,
  } = trpc.molecules.getById.useQuery(
    { id: moleculeId! },
    { enabled: Boolean(moleculeId) },
  );

  const loadByUuid = () => {
    setUuidError(null);
    const parsed = z.string().uuid().safeParse(uuidInput.trim());
    if (!parsed.success) {
      setUuidError("Enter a valid molecule UUID.");
      return;
    }
    setMoleculeId(parsed.data);
  };

  const suggestions = suggestData?.results ?? [];

  return (
    <Card className="border-border bg-surface overflow-hidden">
      <Card.Header className="border-border border-b px-5 py-4">
        <h2 className="text-foreground text-lg font-semibold tracking-tight">
          Editor vs stored structure
        </h2>
        <p className="text-muted mt-1 text-sm">
          Load a molecule, then compare the drawn structure (SMILES and formula from
          the editor) to the catalog record and cached depiction.
        </p>
      </Card.Header>
      <Card.Content className="space-y-6 px-5 py-6">
        <section
          className="space-y-5"
          aria-labelledby="lab-load-heading"
        >
          <h3
            id="lab-load-heading"
            className="text-foreground text-sm font-semibold"
          >
            Load molecule
          </h3>
          <p className="text-muted text-sm">
            Search the catalog or paste a molecule UUID from the database.
          </p>
          <div className="space-y-2">
            <Label className="text-foreground text-sm font-medium">Search</Label>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name, synonym, formula, CAS, PubChem CID"
              variant="secondary"
              autoComplete="off"
              aria-label="Search molecules for lab preview"
            />
            {debouncedSearch.length >= 1 && (
              <div
                className="border-border bg-surface-2/20 max-h-52 overflow-y-auto rounded-md border"
                role="listbox"
                aria-label="Molecule search results"
              >
                {isSuggesting && (
                  <p className="text-muted p-3 text-sm">Searching…</p>
                )}
                {!isSuggesting && suggestions.length === 0 && (
                  <p className="text-muted p-3 text-sm">No matches.</p>
                )}
                {!isSuggesting &&
                  suggestions.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      role="option"
                      aria-selected={moleculeId === r.id}
                      className="hover:bg-default border-border block w-full border-b px-3 py-2.5 text-left text-sm last:border-b-0"
                      onClick={() => {
                        setMoleculeId(r.id);
                        setSearchQuery("");
                        setDebouncedSearch("");
                      }}
                    >
                      <span className="text-foreground font-medium">
                        {r.commonName}
                      </span>
                      <span className="text-muted block truncate text-xs">
                        {r.iupacName}
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-foreground text-sm font-medium">
              Molecule UUID
            </Label>
            <div className="flex flex-wrap gap-2">
              <Input
                value={uuidInput}
                onChange={(e) => {
                  setUuidInput(e.target.value);
                  setUuidError(null);
                }}
                placeholder="00000000-0000-0000-0000-000000000000"
                variant="secondary"
                className="min-w-[16rem] flex-1 font-mono text-sm"
                autoComplete="off"
                aria-label="Molecule UUID"
                aria-invalid={uuidError ? true : undefined}
                aria-describedby={uuidError ? "labs-uuid-error" : undefined}
              />
              <Button type="button" variant="secondary" onPress={loadByUuid}>
                Load
              </Button>
            </div>
            {uuidError ? (
              <p id="labs-uuid-error" className="text-danger text-sm" role="alert">
                {uuidError}
              </p>
            ) : null}
          </div>
        </section>

        <div
          className="border-border grid grid-cols-1 gap-6 border-t pt-6 lg:grid-cols-2 lg:items-stretch"
          role="group"
          aria-label="Editor and stored structure comparison"
        >
          <section className="flex min-w-0 flex-col space-y-3">
            <h3 className="text-foreground text-sm font-semibold">
              Editor (calculated)
            </h3>
            <p className="text-muted text-sm">
              Draw with OpenChemLib. SMILES and formula update from the current
              structure. Server canonicalization and SVG export are dry-run only.
            </p>
            <MoleculeStructureEditorLab
              seedSmiles={
                moleculeId && molecule && !moleculeError
                  ? molecule.SMILES
                  : null
              }
            />
          </section>

          <section className="flex min-w-0 flex-col space-y-3">
            <h3 className="text-foreground text-sm font-semibold">
              Stored (catalog)
            </h3>
            <p className="text-muted text-sm">
              SMILES and formula are the database values. The image is the cached SVG
              from `molecules.imageurl`.
            </p>
            <div className="space-y-2">
              <div className="min-w-0">
                <Label className="text-foreground text-xs font-medium">
                  SMILES (stored)
                </Label>
                {!moleculeId ? (
                  <p className="text-muted mt-0.5 text-xs">Load a molecule to show catalog SMILES.</p>
                ) : isMoleculeLoading ? (
                  <p className="text-muted mt-0.5 text-xs">Loading…</p>
                ) : moleculeError ? (
                  <p className="text-danger mt-0.5 text-xs" role="alert">
                    {moleculeError.message}
                  </p>
                ) : molecule ? (
                  <p className="text-foreground mt-0.5 font-mono text-xs break-all">
                    {molecule.SMILES.trim() !== ""
                      ? molecule.SMILES
                      : "—"}
                  </p>
                ) : null}
              </div>
              <div className="min-w-0">
                <Label className="text-foreground text-xs font-medium">
                  Formula (stored)
                </Label>
                {!moleculeId ? (
                  <p className="text-muted mt-0.5 text-xs">Load a molecule to show catalog formula.</p>
                ) : isMoleculeLoading ? (
                  <p className="text-muted mt-0.5 text-xs">Loading…</p>
                ) : moleculeError ? (
                  <p className="text-muted mt-0.5 text-xs">—</p>
                ) : molecule ? (
                  <p className="text-foreground mt-0.5 font-mono text-xs break-all">
                    {molecule.chemicalFormula.trim() !== ""
                      ? molecule.chemicalFormula
                      : "—"}
                  </p>
                ) : null}
              </div>
            </div>
            <div
              className="border-border bg-surface-2/10 flex w-full flex-1 flex-col overflow-hidden rounded-lg border"
              style={{
                height: LAB_STRUCTURE_PANE_HEIGHT_PX,
                minHeight: LAB_STRUCTURE_PANE_HEIGHT_PX,
              }}
            >
              <div className="flex min-h-0 flex-1 items-center justify-center p-3">
                {!moleculeId && (
                  <p className="text-muted px-2 text-center text-sm">
                    Load a molecule to preview its stored structure image.
                  </p>
                )}
                {moleculeId && isMoleculeLoading && (
                  <p className="text-muted text-sm">Loading…</p>
                )}
                {moleculeId && moleculeError && (
                  <p className="text-danger px-2 text-center text-sm" role="alert">
                    {moleculeError.message}
                  </p>
                )}
                {moleculeId && molecule && !moleculeError && (
                  <>
                    {molecule.imageUrl ? (
                      <MoleculeImageSVG
                        imageUrl={molecule.imageUrl}
                        name={molecule.name}
                        className="flex h-full max-h-full w-full max-w-full items-center justify-center [&_svg]:max-h-full [&_svg]:w-auto [&_svg]:max-w-full"
                      />
                    ) : (
                      <p className="text-muted px-2 text-center text-sm">
                        No structure image on file for this molecule.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </Card.Content>
    </Card>
  );
}
