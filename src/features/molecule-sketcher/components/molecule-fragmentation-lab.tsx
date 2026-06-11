"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  Button,
  Checkbox,
  ErrorMessage,
  Input,
  Label,
  ListBox,
  Select,
} from "@heroui/react";
import { Molecule } from "openchemlib";

import {
  BigSmilesComponentsStrip,
  fragmentationResultToComponentsModel,
} from "../bigsmiles";
import { applyMoleculeSvgCpkThemeToElement } from "~/lib/molecule-svg-cpk-theme";
import {
  formatBondLabel,
  fragmentMoleculeByBondIndices,
  FRAGMENTATION_POLICY_VERSION,
  listCandidateCutBonds,
  type FragmentationGranularity,
  type FragmentationResult,
} from "../utils/smiles-fragmentation";

const FRAGMENT_HUES = [
  12, 210, 135, 285, 48, 330, 175, 245, 75, 305, 155, 22,
];

function fragmentBorderHue(index: number): string {
  return `hsl(${FRAGMENT_HUES[index % FRAGMENT_HUES.length]!} 70% 42%)`;
}

function parseBondIndexList(raw: string): number[] {
  return raw
    .split(/[\s,]+/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n));
}

function FragmentDepiction({
  smiles,
  width,
  height,
  svgId,
  accentColor,
  showAccent,
}: {
  smiles: string;
  width: number;
  height: number;
  svgId: string;
  accentColor: string;
  showAccent: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mol: Molecule;
    try {
      mol = Molecule.fromSmiles(smiles);
    } catch {
      return;
    }
    const svg = mol.toSVG(width, height, svgId, {});
    const host = hostRef.current;
    if (!host) {
      return;
    }
    host.innerHTML = svg;
    const el = host.querySelector("svg");
    if (el) {
      applyMoleculeSvgCpkThemeToElement(el, isDark);
    }
  }, [smiles, width, height, svgId, isDark]);

  return (
    <div
      className="border-border bg-surface overflow-hidden rounded-md border"
      style={{
        borderWidth: showAccent ? 3 : 1,
        borderColor: showAccent ? accentColor : undefined,
      }}
    >
      <div
        ref={hostRef}
        className="flex min-h-[120px] items-center justify-center [&_svg]:max-h-full [&_svg]:w-auto"
      />
    </div>
  );
}

type MoleculeFragmentationLabProps = {
  /** Optional SMILES from the structure editor to copy into the fragmentation input. */
  editorSmiles?: string | null;
};

export function MoleculeFragmentationLab({
  editorSmiles = null,
}: MoleculeFragmentationLabProps) {
  const baseId = useId();
  const [smiles, setSmiles] = useState("CCOCC");
  const [granularity, setGranularity] = useState<FragmentationGranularity>("medium");
  const [parseError, setParseError] = useState<string | null>(null);
  const [selectedBonds, setSelectedBonds] = useState<Set<number>>(new Set());
  const [extraBondText, setExtraBondText] = useState("");
  const [allowNonPolicyCuts, setAllowNonPolicyCuts] = useState(false);
  const [showFragmentColors, setShowFragmentColors] = useState(true);
  const [showBlockStrip, setShowBlockStrip] = useState(true);
  const [result, setResult] = useState<FragmentationResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const blockComponentsModel = useMemo(
    () => (result ? fragmentationResultToComponentsModel(result) : null),
    [result],
  );

  const molProbe = useMemo(() => {
    const t = smiles.trim();
    if (!t) {
      return null;
    }
    try {
      const m = Molecule.fromSmiles(t);
      return m;
    } catch {
      return null;
    }
  }, [smiles]);

  useEffect(() => {
    if (!molProbe) {
      setParseError(smiles.trim() ? "SMILES parse error." : null);
      return;
    }
    setParseError(null);
    const cands = listCandidateCutBonds(molProbe, granularity);
    setSelectedBonds(new Set(cands));
  }, [molProbe, granularity, smiles]);

  const candidateBonds = useMemo(() => {
    if (!molProbe) {
      return [];
    }
    return listCandidateCutBonds(molProbe, granularity);
  }, [molProbe, granularity]);

  const toggleBond = useCallback((bondIndex: number) => {
    setSelectedBonds((prev) => {
      const next = new Set(prev);
      if (next.has(bondIndex)) {
        next.delete(bondIndex);
      } else {
        next.add(bondIndex);
      }
      return next;
    });
  }, []);

  const runFragmentation = useCallback(() => {
    setRunError(null);
    const t = smiles.trim();
    if (!t) {
      setRunError("Enter a SMILES string.");
      return;
    }
    try {
      const extras = parseBondIndexList(extraBondText);
      const merged = new Set<number>([...selectedBonds, ...extras]);
      const out = fragmentMoleculeByBondIndices(
        t,
        [...merged],
        granularity,
        { allowNonCandidateCuts: allowNonPolicyCuts },
      );
      setResult(out);
    } catch (e) {
      setResult(null);
      setRunError(e instanceof Error ? e.message : "Fragmentation failed.");
    }
  }, [
    smiles,
    selectedBonds,
    extraBondText,
    granularity,
    allowNonPolicyCuts,
  ]);

  return (
    <section
      className="border-border space-y-4 border-t pt-6"
      aria-labelledby={`${baseId}-frag-heading`}
    >
      <div>
        <h3
          id={`${baseId}-frag-heading`}
          className="text-foreground text-sm font-semibold"
        >
          SMILES fragmentation
        </h3>
        <p className="text-muted mt-1 text-sm">
          Policy {FRAGMENTATION_POLICY_VERSION}: conjugation-aware acyclic singles,
          degree at both ends, no small-ring atoms; granularity adjusts
          pseudo-rotatable handling and functional-group emphasis. Cuts add wildcard
          attachment labels for paired reconnection.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label className="text-foreground text-sm font-medium">SMILES</Label>
            {editorSmiles?.trim() ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onPress={() => setSmiles(editorSmiles.trim())}
              >
                Use editor SMILES
              </Button>
            ) : null}
          </div>
          <Input
            value={smiles}
            onChange={(e) => setSmiles(e.target.value)}
            variant="secondary"
            className="font-mono text-sm"
            aria-label="SMILES input for fragmentation"
          />
          {parseError ? (
            <ErrorMessage className="text-sm">{parseError}</ErrorMessage>
          ) : null}
        </div>
        <div className="space-y-2">
          <Select
            value={granularity}
            onChange={(value) => {
              const v = value == null ? null : String(Array.isArray(value) ? value[0] : value);
              if (v === "coarse" || v === "medium" || v === "fine") {
                setGranularity(v);
              }
            }}
            aria-label="Fragmentation granularity"
          >
            <Label
              htmlFor={`${baseId}-granularity`}
              className="text-foreground text-sm font-medium"
            >
              Granularity
            </Label>
            <Select.Trigger
              id={`${baseId}-granularity`}
              className="min-h-[44px] w-full"
            >
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox aria-label="Granularity presets">
                <ListBox.Item key="coarse" textValue="coarse (amide/ester bias)">
                  coarse (amide/ester bias)
                </ListBox.Item>
                <ListBox.Item key="medium" textValue="medium (hybrid)">
                  medium (hybrid)
                </ListBox.Item>
                <ListBox.Item key="fine" textValue="fine (include pseudo-rotatable)">
                  fine (include pseudo-rotatable)
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
        <Checkbox
          id={`${baseId}-colors`}
          variant="secondary"
          className="items-start gap-3"
          isSelected={showFragmentColors}
          onChange={() => setShowFragmentColors((v) => !v)}
        >
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Content>
            <Label
              htmlFor={`${baseId}-colors`}
              className="text-foreground cursor-pointer text-sm font-normal"
            >
              Color-code fragments
            </Label>
          </Checkbox.Content>
        </Checkbox>
        <Checkbox
          id={`${baseId}-manual`}
          variant="secondary"
          className="items-start gap-3"
          isSelected={allowNonPolicyCuts}
          onChange={() => setAllowNonPolicyCuts((v) => !v)}
        >
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Content>
            <Label
              htmlFor={`${baseId}-manual`}
              className="text-foreground cursor-pointer text-sm font-normal"
            >
              Allow manual bonds outside policy
            </Label>
          </Checkbox.Content>
        </Checkbox>
        <Checkbox
          id={`${baseId}-strip`}
          variant="secondary"
          className="items-start gap-3"
          isSelected={showBlockStrip}
          onChange={() => setShowBlockStrip((v) => !v)}
        >
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Content>
            <Label
              htmlFor={`${baseId}-strip`}
              className="text-foreground cursor-pointer text-sm font-normal"
            >
              Show BigSMILES block strip
            </Label>
          </Checkbox.Content>
        </Checkbox>
      </div>

      {molProbe && candidateBonds.length > 0 ? (
        <div className="space-y-2">
          <Label className="text-foreground text-sm font-medium">
            Candidate cut bonds
          </Label>
          <div
            className="border-border max-h-40 space-y-1 overflow-y-auto rounded-md border p-3"
            role="group"
            aria-label="Candidate bonds for fragmentation"
          >
            {candidateBonds.map((bi) => {
              const cid = `${baseId}-bond-${bi}`;
              return (
                <Checkbox
                  key={bi}
                  id={cid}
                  variant="secondary"
                  className="items-start gap-2"
                  isSelected={selectedBonds.has(bi)}
                  onChange={() => toggleBond(bi)}
                >
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Content>
                    <Label
                      htmlFor={cid}
                      className="text-foreground cursor-pointer font-mono text-xs font-normal"
                    >
                      {formatBondLabel(molProbe, bi)}
                    </Label>
                  </Checkbox.Content>
                </Checkbox>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-muted text-sm">
          {molProbe
            ? "No candidate bonds for this structure at the current granularity."
            : "Enter a valid SMILES to list candidate bonds."}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-foreground text-sm font-medium">
            Extra bond indices (optional)
          </Label>
          <Input
            value={extraBondText}
            onChange={(e) => setExtraBondText(e.target.value)}
            placeholder="e.g. 0, 2"
            variant="secondary"
            className="font-mono text-sm"
            aria-label="Additional bond indices for fragmentation"
          />
          <p className="text-muted text-xs">
            0-based bond indices from OpenChemLib. Used with manual policy when
            enabled.
          </p>
        </div>
        <div className="flex items-end">
          <Button type="button" variant="primary" onPress={runFragmentation}>
            Apply cuts
          </Button>
        </div>
      </div>

      {runError ? (
        <ErrorMessage className="text-sm" role="alert">
          {runError}
        </ErrorMessage>
      ) : null}

      {result ? (
        <div className="space-y-3">
          <p className="text-muted text-xs">
            Policy {result.policyVersion}, granularity {result.granularity},{" "}
            {result.fragments.length} fragment(s), labels{" "}
            {result.cutBonds.map((c) => c.label).join(", ") || "none"}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.fragments.map((fr) => (
              <div key={fr.index} className="space-y-1">
                <p className="text-foreground text-xs font-medium">
                  Fragment {fr.index + 1}
                  {fr.cutLabels.length > 0
                    ? ` (attachment ${fr.cutLabels.map((l) => `:${l}`).join(", ")})`
                    : ""}
                </p>
                <FragmentDepiction
                  smiles={fr.smiles}
                  width={220}
                  height={140}
                  svgId={`${baseId}-f-${fr.index}`}
                  accentColor={fragmentBorderHue(fr.index)}
                  showAccent={showFragmentColors}
                />
                <p className="text-foreground font-mono text-xs break-all">
                  {fr.smiles}
                </p>
              </div>
            ))}
          </div>
          {showBlockStrip && blockComponentsModel ? (
            <div className="border-border border-t pt-4">
              <BigSmilesComponentsStrip
                model={blockComponentsModel}
                showAccent={showFragmentColors}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
