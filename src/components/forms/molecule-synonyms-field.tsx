"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Button,
  Chip,
  Description,
  ErrorMessage,
  InputGroup,
  Label,
  TextField,
} from "@heroui/react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { FieldTooltip } from "~/components/ui/field-tooltip";
import {
  appendUniqueMoleculeSynonym,
  moleculeSynonymIsDuplicate,
  normalizeMoleculeSynonym,
} from "~/lib/molecule-synonym-dedupe";

export interface MoleculeSynonymsFieldProps {
  synonyms: string[];
  onSynonymsChange: (synonyms: string[]) => void;
  importedSynonyms?: ReadonlySet<string>;
  className?: string;
}

/**
 * Registry contribute synonyms editor with chip remove, Enter-to-add, dedupe,
 * and optional PubChem-import styling for externally populated names.
 */
export function MoleculeSynonymsField({
  synonyms,
  onSynonymsChange,
  importedSynonyms,
  className = "",
}: MoleculeSynonymsFieldProps) {
  const [draft, setDraft] = useState("");
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const importedLower = useMemo(() => {
    if (!importedSynonyms || importedSynonyms.size === 0) return null;
    return new Set(
      [...importedSynonyms].map((synonym) =>
        normalizeMoleculeSynonym(synonym).toLowerCase(),
      ),
    );
  }, [importedSynonyms]);

  const tryAddSynonym = useCallback(() => {
    const normalized = normalizeMoleculeSynonym(draft);
    if (normalized.length === 0) {
      setDuplicateError(null);
      return;
    }
    if (moleculeSynonymIsDuplicate(normalized, synonyms)) {
      setDuplicateError(`"${normalized}" is already listed.`);
      return;
    }
    onSynonymsChange(appendUniqueMoleculeSynonym(synonyms, normalized));
    setDraft("");
    setDuplicateError(null);
  }, [draft, onSynonymsChange, synonyms]);

  const removeSynonym = useCallback(
    (index: number) => {
      onSynonymsChange(synonyms.filter((_, i) => i !== index));
      setDuplicateError(null);
    },
    [onSynonymsChange, synonyms],
  );

  const summary =
    synonyms.length === 0
      ? "No synonyms yet. Add abbreviations and alternate names."
      : `${synonyms.length} synonym${synonyms.length === 1 ? "" : "s"}. Press Enter to add another.`;

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center gap-1">
        <Label className="text-foreground text-sm font-medium">Synonyms</Label>
        <FieldTooltip description="Alternative names and abbreviations stored as searchable synonyms." />
      </div>
      <Description className="text-muted mb-2 text-xs">{summary}</Description>

      <div className="border-border bg-surface space-y-3 rounded-xl border p-3">
        <div
          className={
            synonyms.length > 0
              ? "scrollshadow-tags-x flex max-h-32 min-h-10 flex-wrap items-center gap-1.5 overflow-y-auto overscroll-contain py-0.5"
              : "text-muted min-h-10 text-sm"
          }
          aria-live="polite"
        >
          {synonyms.length === 0 ? (
            <span>Imported or manual synonyms appear here.</span>
          ) : (
            synonyms.map((synonym, index) => {
              const isImported =
                importedLower?.has(
                  normalizeMoleculeSynonym(synonym).toLowerCase(),
                ) ?? false;
              return (
                <Chip
                  key={`${synonym}-${index}`}
                  size="sm"
                  variant={isImported ? "soft" : "secondary"}
                  className={
                    isImported
                      ? "border-accent/30 bg-accent/10 text-foreground max-w-full gap-1 border border-dashed pr-0.5"
                      : "border-border bg-surface-2 text-foreground max-w-full gap-1 border pr-0.5"
                  }
                >
                  <span className="min-w-0 truncate" title={synonym}>
                    {synonym}
                  </span>
                  {isImported ? (
                    <span className="text-muted shrink-0 text-[10px] font-medium tracking-wide uppercase">
                      PubChem
                    </span>
                  ) : null}
                  <Button
                    type="button"
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    className="text-muted hover:text-foreground h-5 min-h-5 w-5 min-w-5 shrink-0"
                    aria-label={`Remove synonym ${synonym}`}
                    onPress={() => removeSynonym(index)}
                  >
                    <XMarkIcon className="h-3 w-3" aria-hidden />
                  </Button>
                </Chip>
              );
            })
          )}
        </div>

        <div className="border-border flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-end">
          <TextField
            name="newSynonym"
            value={draft}
            onChange={(value) => {
              setDraft(value);
              if (duplicateError) setDuplicateError(null);
            }}
            variant="secondary"
            fullWidth
            className="min-w-0 flex-1"
            isInvalid={duplicateError != null}
          >
            <InputGroup variant="secondary" fullWidth>
              <InputGroup.Input
                placeholder="Add synonym, press Enter"
                autoComplete="off"
                aria-label="New synonym"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    tryAddSynonym();
                  }
                }}
              />
            </InputGroup>
            {duplicateError ? (
              <ErrorMessage className="text-xs">{duplicateError}</ErrorMessage>
            ) : null}
          </TextField>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 sm:mb-0.5"
            isDisabled={normalizeMoleculeSynonym(draft).length === 0}
            onPress={tryAddSynonym}
            aria-label="Add synonym"
          >
            <PlusIcon className="h-4 w-4 shrink-0" aria-hidden />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
