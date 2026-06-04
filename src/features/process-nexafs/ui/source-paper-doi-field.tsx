"use client";

import { useCallback, useEffect, useMemo, useState, type Key } from "react";
import { skipToken } from "@tanstack/react-query";
import {
  Button,
  ComboBox,
  ErrorMessage,
  Input,
  Label,
  ListBox,
  ScrollShadow,
  Spinner,
} from "@heroui/react";
import {
  classifyPublicationLookupQuery,
  isPublicationLookupQueryReady,
} from "~/lib/doi";
import {
  formatPublicationAuthorsPreview,
  type PublicationCitation,
} from "~/lib/publication-citation";
import { trpc } from "~/trpc/client";
import { nexafsPublicationDoiHref } from "~/components/nexafs/nexafs-publication-verification-control";

export type SourcePaperDoiFieldValue = {
  doi: string;
  citation: PublicationCitation | null;
};

type SourcePaperDoiFieldProps = {
  value: SourcePaperDoiFieldValue;
  onChange: (next: SourcePaperDoiFieldValue) => void;
  disabled?: boolean;
  showLabel?: boolean;
  helperText?: string;
  /** When false, omits the resolved citation preview block below the ComboBox. */
  showCitationPreview?: boolean;
};

function SourcePaperCitationPreview({
  citation,
}: {
  citation: PublicationCitation;
}) {
  const authors = formatPublicationAuthorsPreview(citation);
  const href = nexafsPublicationDoiHref(citation.doi);
  return (
    <div className="border-border bg-surface-2/60 rounded-lg border p-3">
      <p className="text-foreground text-sm font-medium leading-snug">
        {citation.title}
      </p>
      {authors ? (
        <p className="text-muted mt-1 text-xs leading-snug">{authors}</p>
      ) : null}
      <p className="text-muted mt-1 text-xs">
        {[citation.journal, citation.year != null ? String(citation.year) : null]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent mt-2 inline-block text-xs font-medium hover:underline"
      >
        {citation.doi}
      </a>
    </div>
  );
}

/**
 * ComboBox-driven source publication DOI field with debounced Crossref lookup and citation preview.
 */
export function SourcePaperDoiField({
  value,
  onChange,
  disabled = false,
  showLabel = true,
  helperText = "Link this dataset to the peer-reviewed paper that reports the original measurement.",
  showCitationPreview = true,
}: SourcePaperDoiFieldProps) {
  const [query, setQuery] = useState(value.doi);
  const [debouncedQuery, setDebouncedQuery] = useState(value.doi);
  const [selectedKey, setSelectedKey] = useState<Key | null>(
    value.citation ? value.citation.doi : null,
  );
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    setQuery(value.doi);
    setDebouncedQuery(value.doi);
    setSelectedKey(value.citation ? value.citation.doi : null);
  }, [value.citation, value.doi]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const classification = useMemo(
    () => classifyPublicationLookupQuery(debouncedQuery),
    [debouncedQuery],
  );

  const lookupEnabled = isPublicationLookupQueryReady(
    classification.mode,
    debouncedQuery,
  );

  const {
    data: lookupData,
    isFetching: isLookingUp,
    isError: lookupFailed,
  } = trpc.experiments.lookupPublicationDoi.useQuery(
    lookupEnabled ? { query: debouncedQuery } : skipToken,
    { staleTime: 60_000, retry: false },
  );

  const suggestions = useMemo(() => {
    if (lookupData?.kind === "suggestions") {
      return lookupData.suggestions;
    }
    return [];
  }, [lookupData]);

  useEffect(() => {
    if (!lookupEnabled || isLookingUp) {
      return;
    }
    if (lookupFailed) {
      setLookupError("Publication lookup failed. Try again.");
      return;
    }
    if (!lookupData) {
      return;
    }
    if (lookupData.kind === "not_found") {
      setLookupError(
        classification.mode === "doi"
          ? "DOI not found in Crossref or DataCite."
          : "No matching publications found.",
      );
      if (classification.mode === "doi") {
        onChange({ doi: "", citation: null });
        setSelectedKey(null);
      }
      return;
    }
    if (lookupData.kind === "resolved") {
      if (value.citation?.doi === lookupData.citation.doi) {
        setLookupError(null);
        return;
      }
      setLookupError(null);
      onChange({
        doi: lookupData.citation.doi,
        citation: lookupData.citation,
      });
      setSelectedKey(lookupData.citation.doi);
      setQuery(lookupData.citation.title);
      return;
    }
    setLookupError(null);
  }, [
    classification.mode,
    isLookingUp,
    lookupData,
    lookupEnabled,
    lookupFailed,
    onChange,
    value.citation?.doi,
  ]);

  const applyCitation = useCallback(
    (citation: PublicationCitation) => {
      setLookupError(null);
      setSelectedKey(citation.doi);
      setQuery(citation.title);
      onChange({ doi: citation.doi, citation });
    },
    [onChange],
  );

  const emptyStateMessage = useMemo(() => {
    if (!query.trim()) {
      return "Enter a DOI or search by paper title.";
    }
    if (!lookupEnabled) {
      return classification.mode === "doi"
        ? "Enter a valid DOI (10.xxxx/...)."
        : "Type at least 3 characters to search.";
    }
    if (isLookingUp) {
      return "Looking up publication...";
    }
    if (lookupFailed) {
      return "Lookup failed. Try again.";
    }
    if (lookupData?.kind === "not_found") {
      return "No matching publication.";
    }
    return "Select a publication from the list.";
  }, [
    classification.mode,
    isLookingUp,
    lookupData?.kind,
    lookupEnabled,
    lookupFailed,
    query,
  ]);

  const handleClear = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    setSelectedKey(null);
    setLookupError(null);
    onChange({ doi: "", citation: null });
  }, [onChange]);

  return (
    <div className="flex flex-col gap-2">
      {showLabel ? (
        <div>
          <Label htmlFor="source-paper-doi-search">Source publication</Label>
          {helperText ? (
            <p className="text-muted mt-0.5 text-xs">{helperText}</p>
          ) : null}
        </div>
      ) : null}

      <ComboBox
        fullWidth
        isDisabled={disabled}
        aria-label="Source publication DOI or title search"
        inputValue={query}
        onInputChange={(next) => {
          setQuery(next);
          setSelectedKey(null);
          setLookupError(null);
          if (!next.trim()) {
            onChange({ doi: "", citation: null });
          }
        }}
        selectedKey={selectedKey != null ? String(selectedKey) : null}
        onSelectionChange={(key) => {
          if (key == null) {
            return;
          }
          const selectedDoi = String(key);
          const hit = suggestions.find((row) => row.doi === selectedDoi);
          if (hit) {
            applyCitation(hit);
            setSelectedKey(selectedDoi);
          }
        }}
        items={suggestions}
        allowsEmptyCollection
      >
        <ComboBox.InputGroup>
          <Input
            id="source-paper-doi-search"
            placeholder="DOI or paper title"
            autoComplete="off"
          />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <div data-attribution-nested-overlay="true">
            <ScrollShadow
              className="max-h-56 min-h-0"
              hideScrollBar
              orientation="vertical"
            >
              <ListBox
                aria-label="Publication search results"
                renderEmptyState={() => (
                  <div className="text-muted flex items-center gap-2 px-3 py-2 text-xs">
                    {isLookingUp ? (
                      <Spinner size="sm" color="current" />
                    ) : null}
                    {emptyStateMessage}
                  </div>
                )}
              >
                {suggestions.map((hit) => (
                  <ListBox.Item
                    key={hit.doi}
                    id={hit.doi}
                    textValue={`${hit.title} ${hit.doi}`}
                  >
                    <div className="flex min-w-0 flex-col gap-0.5 py-0.5">
                      <span className="text-foreground line-clamp-2 text-sm font-medium">
                        {hit.title}
                      </span>
                      <span className="text-muted text-xs">{hit.doi}</span>
                    </div>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </ScrollShadow>
          </div>
        </ComboBox.Popover>
      </ComboBox>

      {lookupError ? <ErrorMessage>{lookupError}</ErrorMessage> : null}

      {showCitationPreview && value.citation ? (
        <div className="flex flex-col gap-2">
          <SourcePaperCitationPreview citation={value.citation} />
          <Button
            type="button"
            size="sm"
            variant="tertiary"
            isDisabled={disabled}
            onPress={handleClear}
          >
            Clear source publication
          </Button>
        </div>
      ) : null}
    </div>
  );
}
