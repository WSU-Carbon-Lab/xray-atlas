"use client";

import { useId, useMemo } from "react";
import { cn } from "@heroui/styles";
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import {
  Checkbox,
  Chip,
  Description,
  Label,
  ListBox,
  Select,
} from "@heroui/react";
import { ChemicalFormula } from "~/components/ui/chemical-formula";
import { FieldTooltip } from "~/components/ui/field-tooltip";
import {
  MOLECULE_COMPOUND_KINDS,
  formatMoleculeFormulaForKind,
  moleculeCompoundKindLabel,
  parseMoleculeCompoundKind,
  parseRepeatUnitFormula,
  type MoleculeCompoundKind,
} from "~/lib/molecule-compound-kind";
import { slugifyMoleculeSynonym } from "~/lib/molecule-slug";
import { RegistryDepictionThumbnail } from "./registry-depiction-thumbnail";
import { dedupeChemistryWarnings } from "../utils/chemistry-consistency";
import type {
  MoleculeLookupCandidate,
  MoleculePendingLookup,
  MoleculeResolvedIdentitySource,
} from "../types";

const SOURCE_BADGE: Record<
  MoleculeResolvedIdentitySource,
  { label: string; color: "accent" | "success" | "warning" }
> = {
  atlas: { label: "Atlas catalog", color: "accent" },
  pubchem: { label: "PubChem", color: "success" },
  cas: { label: "CAS verified", color: "warning" },
};

export type MoleculeLookupConfirmationProps = {
  pending: MoleculePendingLookup;
  isDark: boolean;
  isApplied: boolean;
  onApplyToggle: (applied: boolean) => void;
  onSelectCandidate?: (candidate: MoleculeLookupCandidate) => void;
  compoundKind: MoleculeCompoundKind;
  onCompoundKindChange: (kind: MoleculeCompoundKind) => void;
  chemicalFormula: string;
  polymerKindSuggested: boolean;
  displayWarnings?: string[];
  busy?: boolean;
};

function LookupPreviewDepiction({
  smiles,
  isDark,
  label,
}: {
  smiles: string | null;
  isDark: boolean;
  label: string;
}) {
  return (
    <RegistryDepictionThumbnail
      smiles={smiles}
      isDark={isDark}
      label={label}
      enlargeable
    />
  );
}

/**
 * Unified match card for Atlas, PubChem, or CAS lookup results. One card persists
 * from match through apply; the apply checkbox toggles whether the record is
 * linked to the contribute form.
 */
export function MoleculeLookupConfirmation({
  pending,
  isDark,
  isApplied,
  onApplyToggle,
  onSelectCandidate,
  compoundKind,
  onCompoundKindChange,
  chemicalFormula,
  polymerKindSuggested,
  displayWarnings,
  busy = false,
}: MoleculeLookupConfirmationProps) {
  const titleId = useId();
  const applyCheckboxId = useId();
  const { identity } = pending;
  const badge = SOURCE_BADGE[identity.source];
  const candidateCount = pending.candidates?.length ?? 0;
  const showCandidatePicker = candidateCount > 0;
  const uniqueWarnings = dedupeChemistryWarnings(
    displayWarnings ?? pending.warnings,
  );
  const applyDisabled = busy || showCandidatePicker;

  const formulaRepeatUnit = parseRepeatUnitFormula(
    identity.chemicalFormula ?? chemicalFormula,
  );
  const formulaDisplay =
    compoundKind === "polymer" || compoundKind === "macromolecule"
      ? formatMoleculeFormulaForKind(formulaRepeatUnit, compoundKind)
      : (identity.chemicalFormula ?? chemicalFormula).trim();

  const pubChemHref = identity.pubChemCid
    ? `https://pubchem.ncbi.nlm.nih.gov/compound/${identity.pubChemCid}`
    : null;

  const atlasHref = useMemo(() => {
    if (!identity.atlasMoleculeId) return null;
    return `/molecules/${slugifyMoleculeSynonym(identity.displayName)}`;
  }, [identity.atlasMoleculeId, identity.displayName]);

  return (
    <section
      aria-labelledby={titleId}
      aria-live="polite"
      className={cn(
        "border-accent/30 bg-surface motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-[180ms] rounded-xl border shadow-sm",
        isApplied && "border-accent/40 from-accent-soft/15 bg-gradient-to-br to-surface",
        "px-4 py-4 sm:px-5",
      )}
    >
      <div className="flex flex-wrap items-start gap-4">
        <LookupPreviewDepiction
          smiles={identity.previewSmiles}
          isDark={isDark}
          label={`Structure preview for ${identity.displayName}`}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <Chip size="sm" variant="soft" color={badge.color}>
                {badge.label}
              </Chip>
              {identity.casVerified && identity.source === "pubchem" ? (
                <Chip size="sm" variant="soft" color="warning">
                  CAS cross-check
                </Chip>
              ) : null}
              {pending.compoundKindSuggestion?.suggested ? (
                <Chip size="sm" variant="soft" color="default">
                  Suggested{" "}
                  {pending.compoundKindSuggestion.kind.replace("_", " ")}
                </Chip>
              ) : null}
              {polymerKindSuggested && isApplied ? (
                <Chip size="sm" variant="soft" color="default">
                  Suggested polymer
                </Chip>
              ) : null}
            </div>
            <Checkbox
              id={applyCheckboxId}
              isSelected={isApplied}
              isDisabled={applyDisabled}
              onChange={(selected) => onApplyToggle(Boolean(selected))}
              aria-label={
                isApplied
                  ? "Remove applied record from the form"
                  : "Apply this record to the form"
              }
              className="shrink-0"
            >
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Checkbox.Content>
                <Label className="text-foreground text-sm font-medium">
                  {isApplied ? "Applied" : "Apply"}
                </Label>
              </Checkbox.Content>
            </Checkbox>
          </div>
          <p
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium",
              isApplied ? "text-accent" : "text-success",
            )}
          >
            <CheckCircleIcon className="h-4 w-4 shrink-0" aria-hidden />
            {isApplied
              ? "Record linked to the form. Uncheck to remove imported fields."
              : "Match found — check Apply to populate the form."}
          </p>
          <h3
            id={titleId}
            className="text-foreground text-base font-semibold tracking-tight sm:text-lg"
          >
            {identity.displayName}
          </h3>
          {formulaDisplay.length > 0 ? (
            <p className="text-muted text-sm">
              <ChemicalFormula
                formula={formulaDisplay}
                className="text-foreground font-medium"
              />
              {compoundKind === "polymer" ||
              compoundKind === "macromolecule" ? (
                <span className="text-muted ml-1.5 text-xs">
                  repeat-unit notation
                </span>
              ) : null}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {identity.pubChemCid ? (
              <Chip size="sm" variant="soft">
                CID {identity.pubChemCid}
              </Chip>
            ) : null}
            {identity.casNumber ? (
              <Chip size="sm" variant="soft">
                CAS {identity.casNumber}
              </Chip>
            ) : null}
          </div>
        </div>
      </div>

      {showCandidatePicker && pending.candidates ? (
        <ul
          className="border-border mt-4 space-y-2 border-t pt-4"
          role="listbox"
          aria-label="PubChem matches"
        >
          {pending.candidates.map((candidate) => (
            <li key={candidate.cid}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="border-border hover:border-accent/40 focus-visible:ring-accent flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors focus:outline-none focus-visible:ring-2"
                onClick={() => onSelectCandidate?.(candidate)}
                disabled={busy}
              >
                <LookupPreviewDepiction
                  smiles={candidate.previewSmiles}
                  isDark={isDark}
                  label={candidate.title}
                />
                <span className="min-w-0 flex-1">
                  <span className="text-foreground block text-sm font-medium">
                    {candidate.title}
                  </span>
                  <span className="text-muted block truncate text-xs">
                    {candidate.formula ? `${candidate.formula} · ` : ""}
                    CID {candidate.cid}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {uniqueWarnings.length > 0 ? (
        <ul className="text-warning mt-3 list-inside list-disc space-y-1 text-xs">
          {uniqueWarnings.map((warning, index) => (
            <li key={`${index}-${warning}`}>{warning}</li>
          ))}
        </ul>
      ) : null}

      {showCandidatePicker ? (
        <Description className="text-muted mt-3 text-xs">
          Select a structure above before applying this record.
        </Description>
      ) : null}

      {isApplied ? (
        <div className="border-border/80 mt-4 border-t pt-4">
          <Select
            selectedKey={compoundKind}
            onSelectionChange={(key) => {
              if (typeof key !== "string") return;
              const kind = parseMoleculeCompoundKind(key);
              if (kind === null) return;
              onCompoundKindChange(kind);
            }}
            aria-label="Compound kind"
            className="max-w-md"
          >
            <Label className="text-foreground mb-1.5 flex items-center gap-1 text-sm font-medium">
              Compound kind
              <FieldTooltip description="Classifies the registry entry for formula notation and browse filters." />
            </Label>
            <Select.Trigger className="border-border bg-surface min-h-11 w-full rounded-lg border">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox aria-label="Compound kind">
                {MOLECULE_COMPOUND_KINDS.map((kind) => (
                  <ListBox.Item
                    id={kind}
                    key={kind}
                    textValue={moleculeCompoundKindLabel(kind)}
                  >
                    {moleculeCompoundKindLabel(kind)}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      ) : null}

      {isApplied && (pubChemHref || atlasHref) ? (
        <div className="border-border/60 mt-4 flex flex-wrap gap-3 border-t pt-3">
          {pubChemHref ? (
            <a
              href={pubChemHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-90"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" />
              View on PubChem
            </a>
          ) : null}
          {atlasHref ? (
            <a
              href={atlasHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-90"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" />
              View in Atlas
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
