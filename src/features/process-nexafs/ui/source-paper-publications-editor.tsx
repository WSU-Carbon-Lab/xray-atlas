"use client";

import { useCallback, useMemo, useState } from "react";
import { Button, Chip } from "@heroui/react";
import { X } from "lucide-react";
import type { PublicationCitation } from "~/lib/publication-citation";
import { nexafsPublicationDoiHref } from "~/components/nexafs/nexafs-publication-verification-control";
import {
  SourcePaperDoiField,
  type SourcePaperDoiFieldValue,
} from "./source-paper-doi-field";

type SourcePaperPublicationsEditorProps = {
  publications: PublicationCitation[];
  onChange: (next: PublicationCitation[]) => void;
  disabled?: boolean;
};

function PublicationChip({
  citation,
  onRemove,
  disabled,
}: {
  citation: PublicationCitation;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <Chip size="sm" variant="soft" className="border-border bg-surface-2/60 border">
      <Chip.Label className="max-w-[14rem] truncate text-xs font-medium">
        <a
          href={nexafsPublicationDoiHref(citation.doi)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          {citation.doi}
        </a>
      </Chip.Label>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label={`Remove source publication ${citation.doi}`}
        isDisabled={disabled}
        className="text-muted hover:text-danger -mr-1 min-h-6 min-w-6"
        onPress={onRemove}
      >
        <X className="size-3" aria-hidden />
      </Button>
    </Chip>
  );
}

/**
 * Manages a list of verified source publication citations during NEXAFS upload.
 */
export function SourcePaperPublicationsEditor({
  publications,
  onChange,
  disabled = false,
}: SourcePaperPublicationsEditorProps) {
  const [draft, setDraft] = useState<SourcePaperDoiFieldValue>({
    doi: "",
    citation: null,
  });

  const existingDois = useMemo(
    () => new Set(publications.map((publication) => publication.doi)),
    [publications],
  );

  const handleAdd = useCallback(() => {
    if (!draft.citation) {
      return;
    }
    if (existingDois.has(draft.citation.doi)) {
      setDraft({ doi: "", citation: null });
      return;
    }
    onChange([...publications, draft.citation]);
    setDraft({ doi: "", citation: null });
  }, [draft.citation, existingDois, onChange, publications]);

  const handleRemove = useCallback(
    (doi: string) => {
      onChange(publications.filter((publication) => publication.doi !== doi));
    },
    [onChange, publications],
  );

  return (
    <div className="flex flex-col gap-3">
      {publications.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {publications.map((publication) => (
            <PublicationChip
              key={publication.doi}
              citation={publication}
              disabled={disabled}
              onRemove={() => handleRemove(publication.doi)}
            />
          ))}
        </div>
      ) : null}
      <SourcePaperDoiField
        value={draft}
        onChange={setDraft}
        disabled={disabled}
        helperText="Add one or more peer-reviewed papers that report the original measurement."
      />
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          isDisabled={disabled || !draft.citation}
          onPress={handleAdd}
        >
          Add source publication
        </Button>
      </div>
    </div>
  );
}
