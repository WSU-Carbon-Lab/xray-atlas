"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Button, ErrorMessage, Label } from "@heroui/react";
import { MolfileSvgEditor } from "react-ocl";
import { Molecule, Resources } from "openchemlib";
import { trpc } from "~/trpc/client";
import {
  applyMoleculeSvgCpkTheme,
  applyMoleculeSvgCpkThemeToElement,
} from "~/lib/molecule-svg-cpk-theme";
import { getBaseUrl } from "~/utils/getBaseUrl";
import { LAB_STRUCTURE_PANE_HEIGHT_PX } from "../constants";

const EDITOR_WIDTH = 480;
const EDITOR_HEIGHT = LAB_STRUCTURE_PANE_HEIGHT_PX;

function defaultMolfileV3(): string {
  return Molecule.fromSmiles("C").toMolfileV3();
}

export interface MoleculeStructureEditorLabProps {
  /**
   * When set, replaces the editor content with a molfile generated from this
   * SMILES string (for example the catalog value for the molecule loaded above).
   */
  seedSmiles?: string | null;
}

/**
 * Phase 0 lab-only structure editor: OpenChemLib + SVG editing surface, dry-run
 * SVG export, and server-side isomeric SMILES via `moleculeStructure.canonicalizeMolfile`.
 * Does not write to storage or contribute flows. Depiction colors follow the same
 * CPK light/dark rules as `MoleculeImageSVG`.
 */
export function MoleculeStructureEditorLab({
  seedSmiles,
}: MoleculeStructureEditorLabProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const editorHostRef = useRef<HTMLDivElement>(null);

  const [molfile, setMolfile] = useState(defaultMolfileV3);
  const [resourcesError, setResourcesError] = useState<string | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [svgExportRaw, setSvgExportRaw] = useState<string | null>(null);
  const [svgExportError, setSvgExportError] = useState<string | null>(null);
  const [canonicalResult, setCanonicalResult] = useState<{
    isomericSmiles: string;
    idCode: string;
  } | null>(null);

  const themedExportSvg = useMemo(() => {
    if (!svgExportRaw) return null;
    return applyMoleculeSvgCpkTheme(svgExportRaw, isDark);
  }, [svgExportRaw, isDark]);

  const canonicalize = trpc.moleculeStructure.canonicalizeMolfile.useMutation({
    onSuccess: (data) => {
      setCanonicalResult(data);
    },
    onError: () => {
      setCanonicalResult(null);
    },
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const url = `${getBaseUrl()}/api/ocl-resources`;
        await Resources.registerFromUrl(url);
      } catch (e) {
        if (!cancelled) {
          const msg =
            e instanceof Error ? e.message : "Failed to load OpenChemLib resources.";
          setResourcesError(msg);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (seedSmiles === undefined || seedSmiles === null) {
      return;
    }
    const trimmed = seedSmiles.trim();
    if (!trimmed) {
      return;
    }
    try {
      const mol = Molecule.fromSmiles(trimmed);
      setMolfile(mol.toMolfileV3());
      setSeedError(null);
    } catch {
      setSeedError(
        "Catalog SMILES could not be parsed into the editor. Draw or paste a molfile instead.",
      );
    }
  }, [seedSmiles]);

  const recolorEditorSvg = useCallback(() => {
    const svg = editorHostRef.current?.querySelector("svg");
    if (svg) {
      applyMoleculeSvgCpkThemeToElement(svg, isDark);
    }
  }, [isDark]);

  useEffect(() => {
    const host = editorHostRef.current;
    if (!host) return;
    recolorEditorSvg();
    const obs = new MutationObserver(() => {
      requestAnimationFrame(() => recolorEditorSvg());
    });
    obs.observe(host, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [molfile, recolorEditorSvg]);

  const runCanonicalize = useCallback(() => {
    setCanonicalResult(null);
    canonicalize.mutate({ molfile });
  }, [canonicalize, molfile]);

  const runSvgExport = useCallback(() => {
    setSvgExportRaw(null);
    setSvgExportError(null);
    try {
      const mol = Molecule.fromMolfile(molfile);
      const svg = mol.toSVG(EDITOR_WIDTH, EDITOR_HEIGHT, "lab-structure-svg", {
        autoCrop: true,
        autoCropMargin: 12,
      });
      setSvgExportRaw(svg);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "SVG export failed.";
      setSvgExportError(msg);
    }
  }, [molfile]);

  const editorDerived = useMemo(() => {
    try {
      const mol = Molecule.fromMolfile(molfile);
      return {
        ok: true as const,
        isomericSmiles: mol.toIsomericSmiles(),
        formula: mol.getMolecularFormula().formula,
      };
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not read the current structure.";
      return { ok: false as const, message };
    }
  }, [molfile]);

  return (
    <div className="space-y-4">
      {resourcesError ? (
        <ErrorMessage className="text-sm font-medium" role="alert">
          OpenChemLib resources failed to load ({resourcesError}). The editor may
          not work correctly until this succeeds.
        </ErrorMessage>
      ) : null}
      {seedError ? (
        <ErrorMessage className="text-sm font-medium" role="alert">
          {seedError}
        </ErrorMessage>
      ) : null}

      <div className="space-y-2">
        <div className="min-w-0">
          <Label className="text-foreground text-xs font-medium">SMILES (editor)</Label>
          {editorDerived.ok ? (
            <p className="text-foreground mt-0.5 font-mono text-xs break-all">
              {editorDerived.isomericSmiles}
            </p>
          ) : (
            <p className="text-muted mt-0.5 text-xs" role="status">
              {editorDerived.message}
            </p>
          )}
        </div>
        <div className="min-w-0">
          <Label className="text-foreground text-xs font-medium">
            Formula (calculated)
          </Label>
          {editorDerived.ok ? (
            <p className="text-foreground mt-0.5 font-mono text-xs break-all">
              {editorDerived.formula}
            </p>
          ) : (
            <p className="text-muted mt-0.5 text-xs">—</p>
          )}
        </div>
      </div>

      <div
        ref={editorHostRef}
        className="border-border bg-surface-2/10 flex w-full max-w-full items-center justify-center overflow-hidden rounded-lg border"
        style={{
          height: LAB_STRUCTURE_PANE_HEIGHT_PX,
          minHeight: LAB_STRUCTURE_PANE_HEIGHT_PX,
        }}
      >
        <div className="flex max-h-full max-w-full items-center justify-center overflow-auto">
          <MolfileSvgEditor
            molfile={molfile}
            width={EDITOR_WIDTH}
            height={EDITOR_HEIGHT}
            onChange={setMolfile}
            mdlFormat="V3000"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onPress={runCanonicalize}>
          {canonicalize.isPending ? "Canonicalizing…" : "Canonicalize (server)"}
        </Button>
        <Button type="button" variant="secondary" size="sm" onPress={runSvgExport}>
          Export SVG (dry run)
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onPress={() => setMolfile(defaultMolfileV3())}
        >
          Reset to methane
        </Button>
      </div>

      {canonicalize.error ? (
        <ErrorMessage className="text-sm font-medium" role="alert">
          {canonicalize.error.message}
        </ErrorMessage>
      ) : null}

      {canonicalResult ? (
        <div className="space-y-1 text-sm">
          <Label className="text-foreground text-xs font-medium">
            Server isomeric SMILES
          </Label>
          <p className="text-foreground font-mono text-xs break-all">
            {canonicalResult.isomericSmiles}
          </p>
          <Label className="text-muted mt-2 block text-xs font-medium">
            OCL idcode
          </Label>
          <p className="text-muted font-mono text-xs break-all">
            {canonicalResult.idCode}
          </p>
        </div>
      ) : null}

      {svgExportError ? (
        <ErrorMessage className="text-sm font-medium" role="alert">
          {svgExportError}
        </ErrorMessage>
      ) : null}

      {themedExportSvg ? (
        <div className="space-y-2">
          <Label className="text-foreground text-xs font-medium">
            SVG preview (CPK-themed, not uploaded)
          </Label>
          <div
            className={`border-border bg-background max-h-80 overflow-auto rounded border p-3 [&_svg]:mx-auto [&_svg]:max-w-full ${isDark ? "dark" : ""}`}
            dangerouslySetInnerHTML={{ __html: themedExportSvg }}
          />
        </div>
      ) : null}
    </div>
  );
}
