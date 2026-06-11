"use client";

import {
  Button,
  Chip,
  Description,
  Label,
  TextField,
  InputGroup,
} from "@heroui/react";
import { ArrowUpIcon } from "@heroicons/react/24/outline";
import { FieldTooltip } from "~/components/ui/field-tooltip";
import { normalizeMoleculeSynonym } from "~/lib/molecule-synonym-dedupe";

export type MoleculePreferredIdentityProps = {
  preferredName: string;
  iupacName: string;
  onPreferredNameChange: (name: string) => void;
  onIupacNameChange: (name: string) => void;
  synonyms: string[];
  onPromoteSynonym: (synonym: string) => void;
  className?: string;
};

/**
 * Preferred display name chip and systematic IUPAC field for registry contribute.
 * Synonym promotion is one-click from the synonyms field below.
 */
export function MoleculePreferredIdentity({
  preferredName,
  iupacName,
  onPreferredNameChange,
  onIupacNameChange,
  synonyms,
  onPromoteSynonym,
  className = "",
}: MoleculePreferredIdentityProps) {
  const trimmedPreferred = preferredName.trim();
  const showPromotableSynonyms = synonyms.filter(
    (synonym) =>
      normalizeMoleculeSynonym(synonym).toLowerCase() !==
      trimmedPreferred.toLowerCase(),
  );

  return (
    <div className={className}>
      <Label className="text-foreground mb-2 flex items-center gap-1 text-sm font-medium">
        Preferred name
        <FieldTooltip description="Primary label shown on browse cards and molecule detail. Search and lookup populate this field; promote any synonym to replace it." />
      </Label>
      {trimmedPreferred.length > 0 ? (
        <Chip
          size="lg"
          variant="soft"
          color="accent"
          className="max-w-full px-3 py-1.5 text-base font-semibold"
        >
          <span className="min-w-0 truncate" title={trimmedPreferred}>
            {trimmedPreferred}
          </span>
        </Chip>
      ) : (
        <Description className="text-muted text-sm">
          Search or draw a structure to set the preferred name.
        </Description>
      )}

      {showPromotableSynonyms.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          <Description className="text-muted text-xs">
            Promote a synonym to preferred name:
          </Description>
          <div className="flex flex-wrap gap-1.5">
            {showPromotableSynonyms.slice(0, 6).map((synonym) => (
              <Button
                key={synonym}
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 max-w-full gap-1 px-2 text-xs"
                onPress={() => onPromoteSynonym(synonym)}
                aria-label={`Promote ${synonym} to preferred name`}
              >
                <ArrowUpIcon className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{synonym}</span>
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <TextField
        name="preferredNameEdit"
        value={preferredName}
        onChange={onPreferredNameChange}
        variant="secondary"
        fullWidth
        className="mt-4"
      >
        <Label className="text-foreground mb-1.5 text-sm font-medium">
          Edit preferred name
        </Label>
        <InputGroup variant="secondary" fullWidth>
          <InputGroup.Input
            placeholder="Common or catalog name"
            autoComplete="off"
            aria-label="Edit preferred name"
          />
        </InputGroup>
      </TextField>

      <TextField
        name="iupacName"
        value={iupacName}
        onChange={onIupacNameChange}
        isRequired
        variant="secondary"
        fullWidth
        className="mt-4"
      >
        <Label className="text-foreground mb-1.5 flex items-center gap-1 text-sm font-medium">
          IUPAC name (registry label)
          <FieldTooltip description="Systematic name stored as the primary registry key. Lookup fills this when available." />
        </Label>
        <InputGroup variant="secondary" fullWidth>
          <InputGroup.Input
            placeholder="Systematic name"
            autoComplete="off"
            title={iupacName.trim().length > 0 ? iupacName : undefined}
            className="line-clamp-2"
          />
        </InputGroup>
      </TextField>
    </div>
  );
}
