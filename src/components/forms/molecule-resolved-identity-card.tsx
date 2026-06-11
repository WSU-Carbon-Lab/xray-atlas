"use client";

import { useId, useMemo, useState } from "react";
import { cn } from "@heroui/styles";
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import {
  Button,
  Chip,
  Description,
  Label,
  ListBox,
  Select,
  Switch,
} from "@heroui/react";
import { FieldTooltip } from "~/components/ui/field-tooltip";
import {
  MOLECULE_COMPOUND_KINDS,
  formatMoleculeFormulaForKind,
  moleculeCompoundKindLabel,
  parseRepeatUnitFormula,
  type MoleculeCompoundKind,
} from "~/lib/molecule-compound-kind";
import { slugifyMoleculeSynonym } from "~/lib/molecule-slug";
import type {
  MoleculeResolvedIdentity,
  MoleculeResolvedIdentitySource,
  MoleculeIdentityPreviewSnapshot,
} from "~/features/molecule-registry-workflow";
import { ChemicalFormula } from "~/components/ui/chemical-formula";

export type { MoleculeResolvedIdentity, MoleculeResolvedIdentitySource };

export type MoleculeResolvedIdentityCardProps = {
  identity: MoleculeResolvedIdentity;
  warnings: string[];
  compoundKind: MoleculeCompoundKind;
  onCompoundKindChange: (kind: MoleculeCompoundKind) => void;
  chemicalFormula: string;
  registryStub: boolean;
  onRegistryStubChange: (stub: boolean) => void;
  hasStructure: boolean;
  polymerKindSuggested: boolean;
  previewSnapshot?: MoleculeIdentityPreviewSnapshot | null;
};

const SOURCE_BADGE: Record<
  MoleculeResolvedIdentitySource,
  { label: string; color: "accent" | "success" | "warning" }
> = {
  atlas: { label: "Atlas catalog", color: "accent" },
  pubchem: { label: "PubChem", color: "success" },
  cas: { label: "CAS verified", color: "warning" },
};

function sourceStatusLine(identity: MoleculeResolvedIdentity): string {
  switch (identity.source) {
    case "atlas":
      return "Linked to an existing Atlas registry record. Edits update metadata in place.";
    case "pubchem":
      return identity.casVerified
        ? "PubChem populated name and formula. CAS registry number cross-checked."
        : "PubChem populated name and formula.";
    case "cas":
      return "CAS lookup populated identifiers and structure fields when available.";
    default: {
      const _exhaustive: never = identity.source;
      return _exhaustive;
    }
  }
}

/**
 * Dedicated panel for resolved external or Atlas identity after identifier search.
 */
export function MoleculeResolvedIdentityCard({
  identity,
  warnings,
  compoundKind,
  onCompoundKindChange,
  chemicalFormula,
  registryStub,
  onRegistryStubChange,
  hasStructure,
  polymerKindSuggested,
  previewSnapshot = null,
}: MoleculeResolvedIdentityCardProps) {
  const nameId = useId();
  const [nameExpanded, setNameExpanded] = useState(false);

  const badge = SOURCE_BADGE[identity.source];
  const statusLine = sourceStatusLine(identity);
  const longName = identity.displayName.trim().length > 72;
  const formulaRepeatUnit = parseRepeatUnitFormula(
    identity.chemicalFormula ?? chemicalFormula,
  );
  const formulaDisplay =
    compoundKind === "polymer" || compoundKind === "macromolecule"
      ? formatMoleculeFormulaForKind(formulaRepeatUnit, compoundKind)
      : (identity.chemicalFormula ?? chemicalFormula).trim();

  const atlasHref = useMemo(() => {
    if (!identity.atlasMoleculeId) return null;
    const slug = slugifyMoleculeSynonym(identity.displayName);
    return `/molecules/${slug}`;
  }, [identity.atlasMoleculeId, identity.displayName]);

  const pubChemHref = identity.pubChemCid
    ? `https://pubchem.ncbi.nlm.nih.gov/compound/${identity.pubChemCid}`
    : null;

  const showRegistryStub = !hasStructure;

  const previewSmiles =
    previewSnapshot?.previewSmiles ?? identity.previewSmiles;

  return (
    <div
      className={cn(
        "border-accent/25 bg-surface relative overflow-hidden rounded-xl border",
        "from-accent-soft/20 via-surface to-muted/15 bg-gradient-to-br",
        "motion-safe:transition-[opacity,transform] motion-safe:duration-[180ms] motion-safe:ease-out",
        "px-4 py-4 shadow-sm sm:px-5",
      )}
      aria-labelledby={nameId}
    >
      <div
        className="via-accent/35 pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
        aria-hidden
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Chip size="sm" variant="soft" color={badge.color}>
              {badge.label}
            </Chip>
            {identity.casVerified && identity.source === "pubchem" ? (
              <Chip size="sm" variant="soft" color="warning">
                CAS cross-check
              </Chip>
            ) : null}
            {polymerKindSuggested ? (
              <Chip size="sm" variant="soft" color="default">
                Suggested polymer
              </Chip>
            ) : null}
          </div>
          <p className="text-success flex items-center gap-1.5 text-xs font-medium">
            <CheckCircleIcon className="h-4 w-4 shrink-0" aria-hidden />
            {statusLine}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <h3
          id={nameId}
          title={identity.displayName.trim()}
          className={cn(
            "text-foreground text-base font-semibold tracking-tight sm:text-lg",
            !nameExpanded && longName ? "line-clamp-2" : undefined,
          )}
        >
          {identity.displayName.trim()}
        </h3>
        {longName ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-accent -ml-2 h-7 min-h-7 px-2 text-xs"
            onPress={() => setNameExpanded((prev) => !prev)}
          >
            {nameExpanded ? "Show less" : "Show full name"}
          </Button>
        ) : null}
        {formulaDisplay.length > 0 ? (
          <p className="text-muted text-sm">
            <ChemicalFormula
              formula={formulaDisplay}
              className="text-foreground font-medium"
            />
            {compoundKind === "polymer" || compoundKind === "macromolecule" ? (
              <span className="text-muted ml-1.5 text-xs">
                repeat-unit notation
              </span>
            ) : null}
          </p>
        ) : null}
      </div>

      {previewSmiles ? (
        <p className="text-muted sr-only">
          Structure preview available for {previewSmiles}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {identity.pubChemCid ? (
          <a
            href={pubChemHref ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-visible:ring-accent inline-flex rounded-full"
          >
            <Chip
              size="sm"
              variant="soft"
              color="default"
              className="hover:bg-default/40 pointer-events-none transition-colors"
            >
              CID {identity.pubChemCid}
            </Chip>
          </a>
        ) : null}
        {identity.casNumber ? (
          <Chip size="sm" variant="soft" color="default">
            CAS {identity.casNumber}
          </Chip>
        ) : null}
      </div>

      <div className="border-border/80 mt-4 grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
        <Select
          selectedKey={compoundKind}
          onSelectionChange={(key) => {
            if (typeof key !== "string") return;
            onCompoundKindChange(key as MoleculeCompoundKind);
          }}
          aria-label="Compound kind"
        >
          <Label className="text-foreground mb-1.5 flex items-center gap-1 text-sm font-medium">
            Compound kind
            <FieldTooltip description="Classifies the registry entry for formula notation and browse filters. Auto-suggested when PubChem names or formulas indicate a polymer." />
          </Label>
          <Select.Trigger className="border-border bg-surface min-h-11 w-full rounded-lg border">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox aria-label="Compound kind">
              {MOLECULE_COMPOUND_KINDS.map((kind) => (
                <ListBox.Item
                  key={kind}
                  textValue={moleculeCompoundKindLabel(kind)}
                >
                  {moleculeCompoundKindLabel(kind)}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        {showRegistryStub ? (
          <div className="flex flex-col justify-end gap-1.5 pb-0.5">
            <Switch
              isSelected={registryStub}
              onChange={onRegistryStubChange}
              size="sm"
            >
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Content>
                <Label className="text-foreground text-sm">
                  Registry stub (no structure yet)
                </Label>
              </Switch.Content>
            </Switch>
            <Description className="text-muted text-xs">
              {identity.pubChemCid || identity.casNumber
                ? "Appropriate when you have PubChem or CAS identity but no SMILES or SVG depiction yet. Requires CID or CAS on save."
                : "Defer structure until a depiction is available. Requires PubChem CID or CAS on save."}
            </Description>
          </div>
        ) : null}
      </div>

      {warnings.length > 0 ? (
        <ul className="text-warning mt-3 list-inside list-disc space-y-1 text-xs">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      {pubChemHref || atlasHref ? (
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
    </div>
  );
}

export { applyCompoundKindSuggestionIfDefault } from "~/features/molecule-registry-workflow";
