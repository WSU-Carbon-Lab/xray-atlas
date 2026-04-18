"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type { MouseEvent as ReactMouseEvent } from "react";
import { Button, ErrorMessage, Label } from "@heroui/react";
import { MolfileSvgEditor } from "react-ocl";
import { Molecule, Resources } from "openchemlib";
import { trpc } from "~/trpc/client";
import {
  applyMoleculeSvgCpkTheme,
  applyMoleculeSvgCpkThemeToElement,
} from "~/lib/molecule-svg-cpk-theme";
import { getBaseUrl } from "~/utils/getBaseUrl";
import {
  expandAllAbbreviatedAlkylLabels,
  scrubMolfileCustomLabels,
} from "../utils/alkyl-label-expand";
import { abbreviateTerminalAlkylChains } from "../utils/carbon-chain-abbr";
import { applyDepictionCoalescence } from "../utils/depiction-coalescence";
import {
  findBondIndex,
  flipSmallerFragmentAcrossBond,
  heavyAtomsAreBonded,
  rotateFragmentAroundBondPivot,
} from "../utils/bond-fragment-transforms";
import {
  alignBondVectorToAxis,
  cleanupMolecule2DSpacing,
  heavyAtomCentroid2D,
  rotateAllCoordsAroundPoint,
  translateAllCoords,
} from "../utils/molecule-2d-transforms";
import { LAB_STRUCTURE_PANE_HEIGHT_PX } from "../constants";

const EDITOR_WIDTH = 480;
const EDITOR_HEIGHT = LAB_STRUCTURE_PANE_HEIGHT_PX;

const TRANSLATE_SCALE = 0.045;

const HISTORY_MAX = 5;

type ViewTool = "draw" | "translate" | "rotate" | "align" | "pivot";

const PIVOT_ROTATE_STEP_DEG = 15;

function defaultMolfileV3(): string {
  return scrubMolfileCustomLabels(Molecule.fromSmiles("C").toMolfileV3());
}

function molfileV3FromMolecule(mol: Molecule): string {
  return scrubMolfileCustomLabels(mol.toMolfileV3());
}

export interface MoleculeStructureEditorLabProps {
  seedSmiles?: string | null;
}

export function MoleculeStructureEditorLab({
  seedSmiles,
}: MoleculeStructureEditorLabProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const containerRef = useRef<HTMLDivElement>(null);
  const molfileRef = useRef<string>(defaultMolfileV3());
  const displayedMolRef = useRef<string>(defaultMolfileV3());
  const burstStartRef = useRef<string | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const historyMuteRef = useRef(false);
  const viewDragSnapshotRef = useRef<string | null>(null);

  const [molfile, setMolfile] = useState(defaultMolfileV3);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const commitHistoryPoint = useCallback((snapshot: string) => {
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = undefined;
    burstStartRef.current = null;
    setUndoStack((u) => [...u, snapshot].slice(-HISTORY_MAX));
    setRedoStack([]);
  }, []);

  const onEditorChange = useCallback(
    (raw: string) => {
      if (historyMuteRef.current) {
        historyMuteRef.current = false;
        const scrubbed = scrubMolfileCustomLabels(raw);
        molfileRef.current = scrubbed;
        displayedMolRef.current = scrubbed;
        setMolfile(scrubbed);
        burstStartRef.current = null;
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = undefined;
        return;
      }
      const scrubbed = scrubMolfileCustomLabels(raw);
      if (scrubbed === displayedMolRef.current) return;
      burstStartRef.current ??= displayedMolRef.current;
      molfileRef.current = scrubbed;
      displayedMolRef.current = scrubbed;
      setMolfile(scrubbed);
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        idleTimerRef.current = undefined;
        const start = burstStartRef.current;
        burstStartRef.current = null;
        if (start !== null && start !== scrubbed) {
          setUndoStack((u) => [...u, start].slice(-HISTORY_MAX));
          setRedoStack([]);
        }
      }, 420);
    },
    [],
  );

  const undo = useCallback(() => {
    setUndoStack((u) => {
      if (u.length === 0) return u;
      const prev = u[u.length - 1]!;
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = undefined;
      burstStartRef.current = null;
      historyMuteRef.current = true;
      const cur = molfileRef.current;
      setRedoStack((r) => [cur, ...r].slice(0, HISTORY_MAX));
      molfileRef.current = prev;
      displayedMolRef.current = prev;
      setMolfile(prev);
      return u.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack((r) => {
      if (r.length === 0) return r;
      const next = r[0]!;
      historyMuteRef.current = true;
      const cur = molfileRef.current;
      setUndoStack((u) => [...u, cur].slice(-HISTORY_MAX));
      molfileRef.current = next;
      displayedMolRef.current = next;
      setMolfile(next);
      return r.slice(1);
    });
  }, []);
  const [resourcesError, setResourcesError] = useState<string | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [svgExportRaw, setSvgExportRaw] = useState<string | null>(null);
  const [svgExportError, setSvgExportError] = useState<string | null>(null);
  const [canonicalResult, setCanonicalResult] = useState<{
    isomericSmiles: string;
    idCode: string;
  } | null>(null);

  const [viewTool, setViewTool] = useState<ViewTool>("draw");
  const [alignAtoms, setAlignAtoms] = useState<number[]>([]);
  const [pivotAtoms, setPivotAtoms] = useState<number[]>([]);
  const [viewError, setViewError] = useState<string | null>(null);
  const [abbrDone, setAbbrDone] = useState<number | null>(null);
  const [expandDone, setExpandDone] = useState<number | null>(null);
  const [coalesceNote, setCoalesceNote] = useState<string | null>(null);
  const [layoutNote, setLayoutNote] = useState<string | null>(null);

  const dragRef = useRef<{
    lastAngle: number;
    pointerId: number;
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
      commitHistoryPoint(molfileRef.current);
      const next = molfileV3FromMolecule(mol);
      molfileRef.current = next;
      displayedMolRef.current = next;
      setMolfile(next);
      setSeedError(null);
    } catch {
      setSeedError(
        "Catalog SMILES could not be parsed into the editor. Draw or paste a molfile instead.",
      );
    }
  }, [seedSmiles, commitHistoryPoint]);

  useEffect(() => {
    if (viewTool !== "align") {
      setAlignAtoms([]);
    }
  }, [viewTool]);

  useEffect(() => {
    if (viewTool !== "pivot") {
      setPivotAtoms([]);
    }
  }, [viewTool]);

  const recolorEditorSvg = useCallback(() => {
    const svg = containerRef.current?.querySelector("svg");
    if (svg) {
      applyMoleculeSvgCpkThemeToElement(svg, isDark);
    }
  }, [isDark]);

  useEffect(() => {
    const host = containerRef.current;
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
        suppressChiralText: true,
        suppressCIPParity: true,
        suppressESR: true,
        noStereoProblem: true,
      });
      setSvgExportRaw(svg);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "SVG export failed.";
      setSvgExportError(msg);
    }
  }, [molfile]);

  const mutateMolFromRef = useCallback(
    (mutate: (m: Molecule) => void, options?: { skipHistory?: boolean }) => {
      setViewError(null);
      try {
        if (!options?.skipHistory) {
          commitHistoryPoint(molfileRef.current);
        }
        const mol = Molecule.fromMolfile(molfileRef.current);
        mutate(mol);
        const next = molfileV3FromMolecule(mol);
        molfileRef.current = next;
        displayedMolRef.current = next;
        setMolfile(next);
      } catch (e) {
        setViewError(e instanceof Error ? e.message : "Structure update failed.");
      }
    },
    [commitHistoryPoint],
  );

  const onAtomClickLab = useCallback(
    (atomId: number, event: ReactMouseEvent<SVGElement>) => {
      if (viewTool === "align") {
        event.preventDefault();
        setViewError(null);
        setAlignAtoms((prev) => {
          if (prev.length === 0) return [atomId];
          if (prev.length === 1) {
            if (prev[0] === atomId) return prev;
            return [prev[0]!, atomId];
          }
          return [atomId];
        });
        return;
      }
      if (viewTool === "pivot") {
        event.preventDefault();
        setViewError(null);
        setPivotAtoms((prev) => {
          if (prev.length === 0) return [atomId];
          if (prev.length === 1) {
            if (prev[0] === atomId) return prev;
            const a = prev[0]!;
            let mol: Molecule;
            try {
              mol = Molecule.fromMolfile(molfile);
            } catch (err) {
              queueMicrotask(() =>
                setViewError(
                  err instanceof Error
                    ? err.message
                    : "Could not read the structure from the molfile.",
                ),
              );
              return [a];
            }
            if (!heavyAtomsAreBonded(mol, a, atomId)) {
              queueMicrotask(() =>
                setViewError(
                  "Pivot: pick a bonded atom for the second click, or click a bond.",
                ),
              );
              return [a];
            }
            return [a, atomId];
          }
          return [atomId];
        });
      }
    },
    [viewTool, molfile],
  );

  const onBondClickLab = useCallback(
    (bondId: number, event: ReactMouseEvent<SVGElement>) => {
      if (viewTool !== "pivot") return;
      event.preventDefault();
      setViewError(null);
      try {
        const mol = Molecule.fromMolfile(molfile);
        const a = mol.getBondAtom(0, bondId);
        const b = mol.getBondAtom(1, bondId);
        setPivotAtoms([a, b]);
      } catch (e) {
        setViewError(e instanceof Error ? e.message : "Bond pick failed.");
      }
    },
    [viewTool, molfile],
  );

  const runAlignAxis = useCallback(
    (axis: "x" | "y") => {
      if (alignAtoms.length !== 2) return;
      mutateMolFromRef((mol) => {
        alignBondVectorToAxis(mol, alignAtoms[0]!, alignAtoms[1]!, axis);
      });
      setAlignAtoms([]);
    },
    [alignAtoms, mutateMolFromRef],
  );

  const endViewDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onViewOverlayPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (viewTool !== "rotate" && viewTool !== "translate") return;
      const el = containerRef.current;
      if (!el) return;
      viewDragSnapshotRef.current = molfileRef.current;
      e.currentTarget.setPointerCapture(e.pointerId);
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const a0 = Math.atan2(e.clientY - cy, e.clientX - cx);
      dragRef.current = { lastAngle: a0, pointerId: e.pointerId };
    },
    [viewTool],
  );

  const onViewOverlayPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const st = dragRef.current;
      if (st?.pointerId !== e.pointerId) return;
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (viewTool === "translate") {
        mutateMolFromRef(
          (mol) => {
            translateAllCoords(mol, e.movementX * TRANSLATE_SCALE, e.movementY * TRANSLATE_SCALE);
          },
          { skipHistory: true },
        );
        return;
      }
      if (viewTool === "rotate") {
        const a1 = Math.atan2(e.clientY - cy, e.clientX - cx);
        const delta = a1 - st.lastAngle;
        st.lastAngle = a1;
        mutateMolFromRef(
          (mol) => {
            const c = heavyAtomCentroid2D(mol);
            rotateAllCoordsAroundPoint(mol, c.x, c.y, delta);
          },
          { skipHistory: true },
        );
      }
    },
    [mutateMolFromRef, viewTool],
  );

  const onViewOverlayPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragRef.current?.pointerId !== e.pointerId) return;
      if (viewTool === "translate" || viewTool === "rotate") {
        const snap = viewDragSnapshotRef.current;
        viewDragSnapshotRef.current = null;
        if (snap !== null && snap !== molfileRef.current) {
          commitHistoryPoint(snap);
        }
      }
      endViewDrag();
    },
    [commitHistoryPoint, endViewDrag, viewTool],
  );

  const runDepictionCoalescence = useCallback(() => {
    setViewError(null);
    setLayoutNote(null);
    setAbbrDone(null);
    setExpandDone(null);
    setCoalesceNote(null);
    try {
      commitHistoryPoint(molfileRef.current);
      const mol = Molecule.fromMolfile(molfileRef.current);
      const { nitrileGroupsCoalesced, terminalMethylLabelsApplied } =
        applyDepictionCoalescence(mol);
      const next = molfileV3FromMolecule(mol);
      molfileRef.current = next;
      displayedMolRef.current = next;
      setMolfile(next);
      const parts: string[] = [
        "Stereochemistry cleared (including cis/trans and chiral bond cues).",
        nitrileGroupsCoalesced > 0
          ? `Coalesced ${nitrileGroupsCoalesced} C≡N group(s) to CN/NC labels.`
          : "No nitrile triple bonds to coalesce.",
        terminalMethylLabelsApplied
          ? "Labeled terminal methyl groups (CH₃) where implicit."
          : "No new terminal methyl labels added.",
      ];
      setCoalesceNote(parts.join(" "));
    } catch (e) {
      setViewError(e instanceof Error ? e.message : "Depiction coalescence failed.");
    }
  }, [commitHistoryPoint]);

  const abbreviateChains = useCallback(() => {
    setViewError(null);
    setLayoutNote(null);
    setAbbrDone(null);
    setExpandDone(null);
    setCoalesceNote(null);
    try {
      commitHistoryPoint(molfileRef.current);
      const mol = Molecule.fromMolfile(molfileRef.current);
      const n = abbreviateTerminalAlkylChains(mol);
      setAbbrDone(n);
      const next = molfileV3FromMolecule(mol);
      molfileRef.current = next;
      displayedMolRef.current = next;
      setMolfile(next);
    } catch (e) {
      setViewError(e instanceof Error ? e.message : "Abbreviation failed.");
    }
  }, [commitHistoryPoint]);

  const expandAbbreviatedChains = useCallback(() => {
    setViewError(null);
    setLayoutNote(null);
    setAbbrDone(null);
    setExpandDone(null);
    setCoalesceNote(null);
    try {
      commitHistoryPoint(molfileRef.current);
      const mol = Molecule.fromMolfile(molfileRef.current);
      const n = expandAllAbbreviatedAlkylLabels(mol);
      setExpandDone(n);
      const next = molfileV3FromMolecule(mol);
      molfileRef.current = next;
      displayedMolRef.current = next;
      setMolfile(next);
    } catch (e) {
      setViewError(e instanceof Error ? e.message : "Expand failed.");
    }
  }, [commitHistoryPoint]);

  const runPivotFlip = useCallback(() => {
    if (pivotAtoms.length !== 2) return;
    setViewError(null);
    setLayoutNote(null);
    mutateMolFromRef((mol) => {
      flipSmallerFragmentAcrossBond(mol, pivotAtoms[0]!, pivotAtoms[1]!);
    });
    setLayoutNote(
      "Mirrored the smaller substituent across the bond (symmetric flip).",
    );
  }, [pivotAtoms, mutateMolFromRef]);

  const runPivotRotate = useCallback(
    (deg: number) => {
      if (pivotAtoms.length !== 2) return;
      setViewError(null);
      setLayoutNote(null);
      const rad = (deg * Math.PI) / 180;
      mutateMolFromRef((mol) => {
        rotateFragmentAroundBondPivot(mol, pivotAtoms[0]!, pivotAtoms[1]!, rad);
      });
      setLayoutNote(
        `Rotated the side beyond the second atom by ${deg}° around the first atom (hinge).`,
      );
    },
    [pivotAtoms, mutateMolFromRef],
  );

  const cleanupSpacing = useCallback(() => {
    setViewError(null);
    setLayoutNote(null);
    setAbbrDone(null);
    setExpandDone(null);
    setCoalesceNote(null);
    try {
      commitHistoryPoint(molfileRef.current);
      const mol = Molecule.fromMolfile(molfileRef.current);
      cleanupMolecule2DSpacing(mol);
      const next = molfileV3FromMolecule(mol);
      molfileRef.current = next;
      displayedMolRef.current = next;
      setMolfile(next);
      setLayoutNote("Scaled the drawing slightly about its centroid.");
    } catch (e) {
      setViewError(e instanceof Error ? e.message : "Spacing cleanup failed.");
    }
  }, [commitHistoryPoint]);

  const resetFromOriginalSmiles = useCallback(() => {
    const trimmed = seedSmiles?.trim();
    if (!trimmed) return;
    setViewError(null);
    setLayoutNote(null);
    setAbbrDone(null);
    setExpandDone(null);
    setCoalesceNote(null);
    try {
      commitHistoryPoint(molfileRef.current);
      const mol = Molecule.fromSmiles(trimmed);
      const next = molfileV3FromMolecule(mol);
      molfileRef.current = next;
      displayedMolRef.current = next;
      setMolfile(next);
    } catch (e) {
      setViewError(e instanceof Error ? e.message : "Could not reset from SMILES.");
    }
  }, [commitHistoryPoint, seedSmiles]);

  const editorAtomHighlight = useMemo(() => {
    if (viewTool === "align" && alignAtoms.length > 0) return alignAtoms;
    if (viewTool === "pivot" && pivotAtoms.length > 0) return pivotAtoms;
    return undefined;
  }, [viewTool, alignAtoms, pivotAtoms]);

  const pivotBondHighlight = useMemo(() => {
    if (viewTool !== "pivot" || pivotAtoms.length !== 2) return undefined;
    try {
      const mol = Molecule.fromMolfile(molfile);
      const bi = findBondIndex(mol, pivotAtoms[0]!, pivotAtoms[1]!);
      return bi >= 0 ? [bi] : undefined;
    } catch {
      return undefined;
    }
  }, [viewTool, pivotAtoms, molfile]);

  const toolHint = useMemo(() => {
    switch (viewTool) {
      case "draw":
        return "Draw and edit bonds and atoms. Click an abbreviated alkyl label to type a formula (e.g. C4H9); valid CnH2n+1 labels render with true subscripts in the SVG; a leading bracket from the editor is removed automatically.";
      case "translate":
        return "Drag on the structure to move it.";
      case "rotate":
        return "Drag around the center of the pane to rotate the structure.";
      case "align":
        return alignAtoms.length === 0
          ? "Click a first atom."
          : alignAtoms.length === 1
            ? "Click a second atom (bonded or not), then choose Along X or Along Y."
            : "Choose Along X or Along Y, or Clear picks to start over.";
      case "pivot":
        return pivotAtoms.length === 0
          ? "Click the hinge atom first, then a bonded neighbor, or click a bond. Then use Flip or Rotate to reposition a wing."
          : pivotAtoms.length === 1
            ? "Click a bonded neighbor of the first atom, or click the bond between them."
            : "Flip mirrors the smaller fragment across the bond. Rotate turns the mate side around the first-picked atom (hinge).";
      default:
        return "";
    }
  }, [alignAtoms.length, pivotAtoms.length, viewTool]);

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

  const showViewOverlay = viewTool === "translate" || viewTool === "rotate";

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

      <div className="border-border flex flex-wrap items-center gap-2 rounded-lg border p-3">
        <span className="text-muted text-xs font-medium">Tool</span>
        <Button
          type="button"
          size="sm"
          variant={viewTool === "draw" ? "primary" : "secondary"}
          onPress={() => setViewTool("draw")}
        >
          Draw
        </Button>
        <Button
          type="button"
          size="sm"
          variant={viewTool === "translate" ? "primary" : "secondary"}
          onPress={() => setViewTool("translate")}
        >
          Move
        </Button>
        <Button
          type="button"
          size="sm"
          variant={viewTool === "rotate" ? "primary" : "secondary"}
          onPress={() => setViewTool("rotate")}
        >
          Rotate
        </Button>
        <Button
          type="button"
          size="sm"
          variant={viewTool === "align" ? "primary" : "secondary"}
          onPress={() => setViewTool("align")}
        >
          Align
        </Button>
        <Button
          type="button"
          size="sm"
          variant={viewTool === "pivot" ? "primary" : "secondary"}
          onPress={() => setViewTool("pivot")}
        >
          Pivot bond
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onPress={() => runAlignAxis("x")}
          isDisabled={alignAtoms.length !== 2}
        >
          Along X
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onPress={() => runAlignAxis("y")}
          isDisabled={alignAtoms.length !== 2}
        >
          Along Y
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onPress={() => setAlignAtoms([])}
          isDisabled={viewTool !== "align" || alignAtoms.length === 0}
        >
          Clear picks
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onPress={() => setPivotAtoms([])}
          isDisabled={viewTool !== "pivot" || pivotAtoms.length === 0}
        >
          Clear pivot
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onPress={runPivotFlip}
          isDisabled={viewTool !== "pivot" || pivotAtoms.length !== 2}
        >
          Flip across bond
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onPress={() => runPivotRotate(-PIVOT_ROTATE_STEP_DEG)}
          isDisabled={viewTool !== "pivot" || pivotAtoms.length !== 2}
        >
          Rotate -{PIVOT_ROTATE_STEP_DEG}°
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onPress={() => runPivotRotate(PIVOT_ROTATE_STEP_DEG)}
          isDisabled={viewTool !== "pivot" || pivotAtoms.length !== 2}
        >
          Rotate +{PIVOT_ROTATE_STEP_DEG}°
        </Button>
        <Button type="button" size="sm" variant="secondary" onPress={abbreviateChains}>
          Abbreviate alkyl tails
        </Button>
        <Button type="button" size="sm" variant="secondary" onPress={expandAbbreviatedChains}>
          Expand abbreviated tails
        </Button>
        <Button type="button" size="sm" variant="secondary" onPress={runDepictionCoalescence}>
          Coalesce depiction
        </Button>
        <Button type="button" size="sm" variant="secondary" onPress={cleanupSpacing}>
          Clean up spacing
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onPress={undo}
          isDisabled={undoStack.length === 0}
        >
          Undo
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onPress={redo}
          isDisabled={redoStack.length === 0}
        >
          Redo
        </Button>
      </div>
      <p className="text-muted text-xs" aria-live="polite">
        {toolHint}
        {abbrDone !== null && abbrDone > 0 ? ` Abbreviated ${abbrDone} tail(s).` : null}
        {expandDone !== null && expandDone > 0 ? ` Expanded ${expandDone} tail(s).` : null}
        {coalesceNote ? ` ${coalesceNote}` : null}
        {layoutNote ? ` ${layoutNote}` : null}
      </p>
      {viewError ? (
        <ErrorMessage className="text-sm font-medium" role="alert">
          {viewError}
        </ErrorMessage>
      ) : null}

      <div
        ref={containerRef}
        className="border-border bg-surface-2/10 relative flex w-full max-w-full items-center justify-center overflow-hidden rounded-lg border"
        style={{
          height: LAB_STRUCTURE_PANE_HEIGHT_PX,
          minHeight: LAB_STRUCTURE_PANE_HEIGHT_PX,
        }}
      >
        {showViewOverlay ? (
          <div
            className="touch-none absolute inset-0 z-10 cursor-grab active:cursor-grabbing"
            style={{ touchAction: "none" }}
            onPointerDown={onViewOverlayPointerDown}
            onPointerMove={onViewOverlayPointerMove}
            onPointerUp={onViewOverlayPointerUp}
            onPointerCancel={onViewOverlayPointerUp}
            aria-hidden
          />
        ) : null}
        <div className="flex max-h-full max-w-full items-center justify-center overflow-auto">
          <MolfileSvgEditor
            molfile={molfile}
            width={EDITOR_WIDTH}
            height={EDITOR_HEIGHT}
            onChange={onEditorChange}
            mdlFormat="V3000"
            suppressChiralText
            suppressCIPParity
            suppressESR
            noStereoProblem
            onAtomClick={onAtomClickLab}
            onBondClick={onBondClickLab}
            atomHighlight={editorAtomHighlight}
            bondHighlight={pivotBondHighlight}
            atomHighlightStrategy="merge"
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
          onPress={() => {
            commitHistoryPoint(molfileRef.current);
            const next = defaultMolfileV3();
            molfileRef.current = next;
            displayedMolRef.current = next;
            setMolfile(next);
          }}
        >
          Reset to methane
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onPress={resetFromOriginalSmiles}
          isDisabled={!seedSmiles?.trim()}
        >
          Reset from loaded SMILES
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
