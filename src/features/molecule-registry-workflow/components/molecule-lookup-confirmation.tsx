"use client";

import { useId } from "react";
import { cn } from "@heroui/styles";
import {
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { Button, Chip, Description } from "@heroui/react";
import { ChemicalFormula } from "~/components/ui/chemical-formula";
import { RegistryDepictionThumbnail } from "./registry-depiction-thumbnail";
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
  onConfirm: () => void;
  onDismiss: () => void;
  onSelectCandidate?: (candidate: MoleculeLookupCandidate) => void;
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
 * Inline confirmation card shown after identifier lookup succeeds. Contributors
 * confirm before fields are populated ("Use this record") or continue editing.
 */
export function MoleculeLookupConfirmation({
  pending,
  isDark,
  onConfirm,
  onDismiss,
  onSelectCandidate,
  busy = false,
}: MoleculeLookupConfirmationProps) {
  const titleId = useId();
  const { identity } = pending;
  const badge = SOURCE_BADGE[identity.source];
  const multi = (pending.candidates?.length ?? 0) > 1;

  return (
    <section
      aria-labelledby={titleId}
      aria-live="polite"
      className={cn(
        "border-accent/30 bg-surface motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-[180ms] rounded-xl border shadow-sm",
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
          <div className="flex flex-wrap items-center gap-2">
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
                Suggested {pending.compoundKindSuggestion.kind.replace("_", " ")}
              </Chip>
            ) : null}
          </div>
          <p className="text-success flex items-center gap-1.5 text-xs font-medium">
            <CheckCircleIcon className="h-4 w-4 shrink-0" aria-hidden />
            Match found — review before applying to the form.
          </p>
          <h3
            id={titleId}
            className="text-foreground text-base font-semibold tracking-tight sm:text-lg"
          >
            {identity.displayName}
          </h3>
          {identity.chemicalFormula ? (
            <p className="text-muted text-sm">
              <ChemicalFormula
                formula={identity.chemicalFormula}
                className="text-foreground font-medium"
              />
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

      {multi && pending.candidates ? (
        <ul className="border-border mt-4 space-y-2 border-t pt-4" role="listbox" aria-label="PubChem matches">
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

      {pending.warnings.length > 0 ? (
        <ul className="text-warning mt-3 list-inside list-disc space-y-1 text-xs">
          {pending.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onPress={onConfirm}
          isDisabled={busy || multi}
        >
          Use this record
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onPress={onDismiss}
          isDisabled={busy}
        >
          Keep editing
        </Button>
        {multi ? (
          <Description className="text-muted text-xs">
            Select a structure above, then confirm.
          </Description>
        ) : null}
      </div>
    </section>
  );
}
