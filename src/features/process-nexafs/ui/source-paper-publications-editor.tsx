"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@heroui/react";
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

function truncatePublicationTitle(title: string, maxLen: number): string {
  const trimmed = title.trim();
  if (trimmed.length <= maxLen) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

function SourcePublicationDoiLink({ doi }: { doi: string }) {
  return (
    <a
      href={nexafsPublicationDoiHref(doi)}
      target="_blank"
      rel="noopener noreferrer"
      className="focus-visible:ring-accent text-accent inline-block font-mono text-[10px] break-all hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      {doi}
    </a>
  );
}

function SourcePublicationListItem({
  citation,
  onRemove,
  disabled,
}: {
  citation: PublicationCitation;
  onRemove: () => void;
  disabled: boolean;
}) {
  const title = citation.title?.trim();
  return (
    <li className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        {title ? (
          <p className="text-foreground line-clamp-1 text-xs leading-snug">
            {truncatePublicationTitle(title, 72)}
          </p>
        ) : null}
        <SourcePublicationDoiLink doi={citation.doi} />
      </div>
      <Button
        type="button"
        isIconOnly
        size="sm"
        variant="ghost"
        className="text-muted hover:text-danger min-h-7 min-w-7 shrink-0"
        aria-label={`Remove source publication ${citation.doi}`}
        isDisabled={disabled}
        onPress={onRemove}
      >
        <X className="size-3" aria-hidden />
      </Button>
    </li>
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
    <section
      className="flex flex-col gap-2"
      aria-labelledby="source-publication-heading"
    >
      <div>
        <h2
          id="source-publication-heading"
          className="text-muted text-sm font-medium leading-none"
        >
          Source publication
        </h2>
        <p className="text-muted mt-1 text-xs leading-snug">
          Link peer-reviewed papers that report this measurement.
        </p>
      </div>

      {publications.length > 0 ? (
        <ul className="space-y-1.5">
          {publications.map((publication) => (
            <SourcePublicationListItem
              key={publication.doi}
              citation={publication}
              disabled={disabled}
              onRemove={() => handleRemove(publication.doi)}
            />
          ))}
        </ul>
      ) : null}

      <div data-attribution-nested-overlay="true">
        <SourcePaperDoiField
          value={draft}
          onChange={setDraft}
          disabled={disabled}
          showLabel={false}
          helperText=""
          showCitationPreview={false}
        />
      </div>

      {draft.citation ? (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="primary"
            className="h-8 min-h-8 px-3 text-xs"
            isDisabled={disabled}
            onPress={handleAdd}
          >
            Add source publication
          </Button>
        </div>
      ) : null}
    </section>
  );
}
