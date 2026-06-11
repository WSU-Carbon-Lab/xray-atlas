"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  Button,
  Card,
  ErrorMessage,
  Input,
  Label,
  Switch,
  Tooltip,
} from "@heroui/react";
import {
  Camera,
  ClipboardPaste,
  Copy,
  Download,
  RotateCcw,
  RotateCw,
  X,
} from "lucide-react";

import { trpc } from "~/trpc/client";
import {
  DATABASE_DEPICTION_HEIGHT_PX,
  DATABASE_DEPICTION_WIDTH_PX,
  LAB_STRUCTURE_PANE_CLASS,
  LAB_STRUCTURE_PANE_HEIGHT_PX,
} from "../constants";
import { useMoleculeDrawState } from "../hooks/use-molecule-draw-state";
import { DatabaseBuildWorkflowHint } from "./database-build-workflow-hint";
import { DatabasePrepSection } from "./database-prep-section";
import { MoleculeDrawCanvas } from "./molecule-draw-canvas";
import { MoleculeDrawToolbar } from "./molecule-draw-toolbar";
import { ensureOclResourcesBrowser } from "../utils/ocl-resources.browser";

/**
 * ChemDraw-style interactive molecule drawer for the sandbox: tool modes,
 * canonical SMILES output, polymer bookends, block fragment SMILES, and
 * database-ready SVG snapshots.
 */
export function MoleculeDrawLab() {
  const state = useMoleculeDrawState();
  const { resolvedTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);
  useEffect(() => {
    setThemeMounted(true);
  }, []);
  useEffect(() => {
    void ensureOclResourcesBrowser().catch(() => undefined);
  }, []);
  const isDark = themeMounted && resolvedTheme === "dark";

  const [loadSmilesInput, setLoadSmilesInput] = useState("");
  const [moleculeSearchQuery, setMoleculeSearchQuery] = useState("");
  const [debouncedMoleculeSearch, setDebouncedMoleculeSearch] = useState("");
  const [clickToPlaceFragment, setClickToPlaceFragment] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [snapshotSvg, setSnapshotSvg] = useState<string | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedMoleculeSearch(moleculeSearchQuery.trim()),
      150,
    );
    return () => clearTimeout(timer);
  }, [moleculeSearchQuery]);

  const { data: suggestData, isFetching: isSuggesting } =
    trpc.molecules.autosuggest.useQuery(
      { query: debouncedMoleculeSearch, limit: 12 },
      { enabled: debouncedMoleculeSearch.length >= 1, staleTime: 60_000 },
    );

  const catalogSuggestions = suggestData?.results ?? [];

  const hasStructure = state.molecule.getAllAtoms() > 0;

  const bookendOk = state.bookendExtraction?.ok ? state.bookendExtraction : null;
  const blockFragments =
    state.chunkResult?.ok === true ? state.chunkResult.fragments : null;

  const copyText = useCallback(async (text: string, successMessage: string) => {
    if (text.length === 0) {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(successMessage);
    } catch {
      setCopyFeedback("Copy failed.");
    }
    setTimeout(() => setCopyFeedback(null), 2000);
  }, []);

  const loadCatalogSmiles = useCallback(
    (smiles: string, mode: "replace" | "fragment") => {
      const trimmed = smiles.trim();
      if (trimmed.length === 0) {
        return;
      }
      setLoadSmilesInput(trimmed);
      if (mode === "replace") {
        state.loadSmiles(trimmed);
        return;
      }
      if (clickToPlaceFragment) {
        state.queueSmilesFragmentPlacement(trimmed);
        return;
      }
      state.addSmilesFragmentAt(trimmed, state.defaultFragmentCenter());
    },
    [clickToPlaceFragment, state],
  );

  const generateSnapshot = useCallback(() => {
    setSnapshotError(null);
    const result = state.generateDatabaseSnapshot(isDark);
    if (!result.ok) {
      setSnapshotSvg(null);
      setSnapshotError(result.message);
      return;
    }
    setSnapshotSvg(result.svg);
    setSnapshotError(null);
  }, [isDark, state]);

  const downloadSnapshot = useCallback(() => {
    if (snapshotSvg === null) {
      return;
    }
    const blob = new Blob([snapshotSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "molecule-depiction.svg";
    anchor.click();
    URL.revokeObjectURL(url);
    setCopyFeedback("Downloaded database snapshot SVG.");
    setTimeout(() => setCopyFeedback(null), 2000);
  }, [snapshotSvg]);

  const blockSmilesList =
    blockFragments !== null
      ? blockFragments.map((fragment) => fragment.smiles).join("\n")
      : "";

  return (
    <Card className="border-border bg-surface overflow-hidden">
      <Card.Header className="border-border border-b px-5 py-4">
        <h2 className="text-foreground text-lg font-semibold tracking-tight">
          Interactive molecule drawer
        </h2>
        <p className="text-muted mt-1 max-w-3xl text-sm">
          Draw bonds, place or fuse ring templates, assign heteroatoms, mark
          polymer bookends or block cuts, then tidy and generate a database SVG
          snapshot. Output is canonical SMILES (repeat-unit and block fragments).
          The V2000 molfile is the editing source of truth.
        </p>
      </Card.Header>
      <Card.Content className="space-y-5 px-5 py-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="border-border space-y-2 rounded-lg border p-3">
            <Label htmlFor="draw-smiles-out">Canonical SMILES</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="draw-smiles-out"
                readOnly
                value={state.smiles}
                placeholder="Draw a structure to emit SMILES"
                className="min-w-0 flex-1 font-mono text-xs"
              />
              <Tooltip delay={300}>
                <Tooltip.Trigger>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onPress={() => void copyText(state.smiles, "Copied SMILES.")}
                    isDisabled={state.smiles.length === 0}
                    aria-label="Copy SMILES"
                    className="min-w-9 px-2"
                  >
                    <Copy className="h-4 w-4" aria-hidden />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content placement="bottom">Copy canonical SMILES</Tooltip.Content>
              </Tooltip>
            </div>
            {state.containsDativeBond ? (
              <p className="text-muted text-xs">
                Structure contains a dative bond; canonical SMILES may omit
                coordination semantics.
              </p>
            ) : null}
          </div>

          <div className="border-border space-y-3 rounded-lg border p-3">
            <div>
              <Label htmlFor="draw-load-smiles">SMILES import</Label>
              <p className="text-muted mt-1 text-xs">
                Paste SMILES, search the Atlas catalog, or focus the canvas and
                use Cmd+V / Ctrl+V to paste from the clipboard.
              </p>
            </div>
            <Input
              id="draw-load-smiles"
              value={loadSmilesInput}
              onChange={(e) => setLoadSmilesInput(e.target.value)}
              placeholder="e.g. c1ccsc1 or CCO"
              className="font-mono text-xs"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onPress={() => {
                  state.loadSmiles(loadSmilesInput);
                }}
                isDisabled={loadSmilesInput.trim().length === 0}
              >
                Replace canvas
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onPress={() => {
                  if (clickToPlaceFragment) {
                    state.queueSmilesFragmentPlacement(loadSmilesInput);
                  } else {
                    state.addSmilesFragmentAt(
                      loadSmilesInput,
                      state.defaultFragmentCenter(),
                    );
                  }
                }}
                isDisabled={loadSmilesInput.trim().length === 0}
              >
                Add fragment
              </Button>
              <div className="text-muted inline-flex items-center gap-1.5 text-xs">
                <ClipboardPaste className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>Paste on canvas</span>
              </div>
            </div>
            <Switch
              isSelected={clickToPlaceFragment}
              onChange={setClickToPlaceFragment}
              size="sm"
            >
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Content>
                <Label className="text-xs">Click canvas to place next fragment</Label>
              </Switch.Content>
            </Switch>
          </div>
        </div>

        <div className="border-border space-y-2 rounded-lg border p-3">
          <Label htmlFor="draw-catalog-search">Atlas molecule search</Label>
          <p className="text-muted text-xs">
            Search catalog molecules by name, synonym, formula, CAS, or PubChem
            CID. Pick a result to load its stored SMILES.
          </p>
          <Input
            id="draw-catalog-search"
            value={moleculeSearchQuery}
            onChange={(e) => setMoleculeSearchQuery(e.target.value)}
            placeholder="Search molecules"
            variant="secondary"
            autoComplete="off"
            aria-label="Search Atlas molecules"
          />
          {debouncedMoleculeSearch.length >= 1 ? (
            <div
              className="border-border bg-surface-2/20 max-h-52 overflow-y-auto rounded-md border"
              role="listbox"
              aria-label="Atlas molecule search results"
            >
              {isSuggesting ? (
                <p className="text-muted p-3 text-sm">Searching…</p>
              ) : null}
              {!isSuggesting && catalogSuggestions.length === 0 ? (
                <p className="text-muted p-3 text-sm">No matches.</p>
              ) : null}
              {!isSuggesting &&
                catalogSuggestions.map((result) => (
                  <div
                    key={result.id}
                    className="border-border hover:bg-default border-b px-3 py-2 last:border-b-0"
                  >
                    <p className="text-foreground text-sm font-medium">
                      {result.commonName || result.iupacName}
                    </p>
                    <p className="text-muted truncate font-mono text-xs">
                      {result.smiles}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="text-xs"
                        onPress={() => loadCatalogSmiles(result.smiles, "replace")}
                        isDisabled={result.smiles.trim().length === 0}
                      >
                        Replace canvas
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onPress={() => loadCatalogSmiles(result.smiles, "fragment")}
                        isDisabled={result.smiles.trim().length === 0}
                      >
                        Add fragment
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          ) : null}
        </div>

        {copyFeedback !== null ? (
          <p className="text-muted text-xs" role="status">
            {copyFeedback}
          </p>
        ) : null}

        <DatabaseBuildWorkflowHint />

        <MoleculeDrawToolbar
          tool={state.tool}
          onTool={state.setTool}
          drawBondKind={state.drawBondKind}
          onDrawBondKind={state.setDrawBondKind}
          layoutTool={state.layoutTool}
          onLayoutTool={state.setLayoutTool}
          alignAtomCount={state.alignAtoms.length}
          pivotAtomCount={state.pivotAtoms.length}
          onRunAlignAxis={state.alignAlongAxis}
          onClearAlignPicks={state.clearAlignPicks}
          onClearPivotPicks={state.clearPivotPicks}
          onRunPivotFlip={state.pivotFlip}
          onRunPivotRotate={state.pivotRotate}
          onPrepareForDatabase={state.prepareForDatabase}
          onTidySpacing={state.cleanupSpacing}
          onStabilize={state.stabilize}
          onUndo={state.undo}
          onRedo={state.redo}
          onClear={state.clearAll}
          canUndo={state.canUndo}
          canRedo={state.canRedo}
          hasStructure={hasStructure}
          selectedRingTemplate={state.selectedRingTemplate}
          onSelectRingTemplate={state.selectRingTemplate}
          onSelectCageByCarbonCount={state.selectCageByCarbonCount}
          cageDepictionMode={state.cageDepictionMode}
          onCageDepictionMode={state.setCageDepictionMode}
          showCageOrbitTool={
            state.cageDepictionMode === "3d" &&
            (state.hasCageDepiction ||
              state.selectedRingTemplate.category === "cage")
          }
          onResetCageView={state.resetCageView}
        />

        {state.layoutError !== null ? (
          <ErrorMessage>{state.layoutError}</ErrorMessage>
        ) : null}
        {state.layoutNote !== null ? (
          <p className="text-muted text-xs" role="status">
            {state.layoutNote}
          </p>
        ) : null}

        {state.polymerError !== null ? (
          <ErrorMessage>{state.polymerError}</ErrorMessage>
        ) : null}

        {state.selectedAtoms.length > 0 ? (
          <div className="border-border bg-muted/20 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
            <p className="text-muted text-xs">
              {state.selectedAtoms.length} atom
              {state.selectedAtoms.length === 1 ? "" : "s"} selected
            </p>
            <Tooltip delay={300}>
              <Tooltip.Trigger>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onPress={() => state.rotateSelectedByDegrees(-15)}
                  aria-label="Rotate selection -15 degrees"
                  className="min-w-9 px-2"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content placement="bottom">
                Rotate selection -15° (Shift+R)
              </Tooltip.Content>
            </Tooltip>
            <Tooltip delay={300}>
              <Tooltip.Trigger>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onPress={() => state.rotateSelectedByDegrees(15)}
                  aria-label="Rotate selection +15 degrees"
                  className="min-w-9 px-2"
                >
                  <RotateCw className="h-4 w-4" aria-hidden />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content placement="bottom">
                Rotate selection +15° (R)
              </Tooltip.Content>
            </Tooltip>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onPress={state.classifySelectionAsBlock}
            >
              Classify as block
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onPress={state.clearSelection}
              aria-label="Clear selection"
              className="min-w-9 px-2"
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        ) : null}

        {state.pendingSmilesFragment !== null ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-muted text-xs" role="status">
              Click the canvas to place SMILES fragment. Escape cancels.
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onPress={state.cancelPendingSmilesFragment}
            >
              Cancel placement
            </Button>
          </div>
        ) : null}

        <div
          className={LAB_STRUCTURE_PANE_CLASS}
          style={{
            height: LAB_STRUCTURE_PANE_HEIGHT_PX,
            minHeight: LAB_STRUCTURE_PANE_HEIGHT_PX,
          }}
        >
          <MoleculeDrawCanvas state={state} heightPx={LAB_STRUCTURE_PANE_HEIGHT_PX} />
        </div>

        <DatabasePrepSection
          hasStructure={hasStructure}
          compactSpacing={state.compactSpacingOnPrep}
          onCompactSpacingChange={state.setCompactSpacingOnPrep}
          onPrepareForDatabase={state.prepareForDatabase}
          onTidySpacing={state.cleanupSpacing}
          onExpandAlkyl={state.expandAlkylTails}
          prepWarnings={state.prepAssessment.warnings}
        />

        <div className="border-border space-y-3 rounded-lg border p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-foreground text-sm font-medium">Database snapshot</p>
              <p className="text-muted mt-1 max-w-2xl text-xs">
                Runs upload prep (abbreviate alkyl tails and nitriles, preserve
                orientation
                {state.compactSpacingOnPrep ? ", compact layout spacing" : ""}),
                then renders an OCL SVG with CPK theming matching catalog
                depictions ({DATABASE_DEPICTION_WIDTH_PX}×
                {DATABASE_DEPICTION_HEIGHT_PX}).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Tooltip delay={300}>
                <Tooltip.Trigger>
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onPress={generateSnapshot}
                    isDisabled={!hasStructure}
                    aria-label="Generate database snapshot"
                  >
                    <Camera className="h-4 w-4" aria-hidden />
                    Generate snapshot
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content placement="bottom">
                  Prepare for upload and render catalog-style SVG
                </Tooltip.Content>
              </Tooltip>
              <Tooltip delay={300}>
                <Tooltip.Trigger>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onPress={() => {
                      if (snapshotSvg !== null) {
                        void copyText(snapshotSvg, "Copied snapshot SVG.");
                      }
                    }}
                    isDisabled={snapshotSvg === null}
                    aria-label="Copy snapshot SVG"
                    className="min-w-9 px-2"
                  >
                    <Copy className="h-4 w-4" aria-hidden />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content placement="bottom">Copy snapshot SVG</Tooltip.Content>
              </Tooltip>
              <Tooltip delay={300}>
                <Tooltip.Trigger>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onPress={downloadSnapshot}
                    isDisabled={snapshotSvg === null}
                    aria-label="Download snapshot SVG"
                    className="min-w-9 px-2"
                  >
                    <Download className="h-4 w-4" aria-hidden />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content placement="bottom">
                  Download molecule-depiction.svg
                </Tooltip.Content>
              </Tooltip>
            </div>
          </div>
          {snapshotError !== null ? <ErrorMessage>{snapshotError}</ErrorMessage> : null}
          {snapshotSvg !== null ? (
            <div
              className="border-border bg-surface flex items-center justify-center overflow-hidden rounded-md border p-3"
              style={{ minHeight: 120 }}
            >
              <div
                className="max-h-48 w-full max-w-md [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-h-48 [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: snapshotSvg }}
              />
            </div>
          ) : null}
        </div>

        {(state.bookends.open !== null || state.bookends.close !== null) && (
          <div className="border-border bg-muted/30 space-y-2 rounded-lg border p-4">
            <p className="text-foreground text-sm font-medium">Repeat unit</p>
            <p className="text-muted text-xs">
              {state.bookends.open === null
                ? "Place opening [ on an acyclic single bond."
                : state.bookends.close === null
                  ? "Place closing ] on another acyclic single bond."
                  : "Both bookends set."}
            </p>
            {bookendOk !== null ? (
              <div className="space-y-2">
                <div>
                  <p className="text-muted text-xs">Repeat unit SMILES</p>
                  <code className="text-foreground block break-all font-mono text-xs">
                    {bookendOk.repeatUnitSmiles}
                  </code>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onPress={() =>
                    void copyText(bookendOk.repeatUnitSmiles, "Copied repeat unit SMILES.")
                  }
                >
                  Copy repeat unit SMILES
                </Button>
              </div>
            ) : state.bookendExtraction !== null && !state.bookendExtraction.ok ? (
              <ErrorMessage>{state.bookendExtraction.error}</ErrorMessage>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onPress={state.clearBookends}
            >
              Clear bookends
            </Button>
          </div>
        )}

        {(state.chunkMarks.length > 0 || state.chunkResult !== null) && (
          <div className="border-border bg-muted/30 space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-foreground text-sm font-medium">Block fragments</p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onPress={state.clearChunkCuts}
              >
                Clear cuts
              </Button>
            </div>
            {state.chunkResult !== null && !state.chunkResult.ok ? (
              <ErrorMessage>{state.chunkResult.error}</ErrorMessage>
            ) : null}
            {blockFragments !== null && blockFragments.length > 0 ? (
              <div className="space-y-2">
                <p className="text-muted text-xs">Block SMILES (one per line)</p>
                <ul className="space-y-2">
                  {blockFragments.map((fragment) => (
                    <li key={fragment.index}>
                      <span className="text-muted text-xs">Block {fragment.index + 1}</span>
                      <code className="text-foreground mt-0.5 block break-all font-mono text-xs">
                        {fragment.smiles}
                      </code>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onPress={() =>
                    void copyText(blockSmilesList, "Copied block SMILES list.")
                  }
                >
                  Copy block SMILES list
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
