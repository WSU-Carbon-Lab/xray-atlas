"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { trpc } from "~/trpc/client";
import { getTagChipClass, getTagInlineStyle } from "~/lib/tag-colors";

export interface TagFilterBarProps {
  selectedTagIds: Set<string>;
  onRemove: (tagId: string) => void;
  className?: string;
}

export function TagFilterBar({
  selectedTagIds,
  onRemove,
  className = "",
}: TagFilterBarProps) {
  const { data: tags = [], isLoading } = trpc.molecules.listTags.useQuery(
    undefined,
    { staleTime: 5 * 60 * 1000 },
  );

  const tagById = new Map(tags.map((t) => [t.id, t]));
  const selectedTags = [...selectedTagIds]
    .map((id) => tagById.get(id))
    .filter((t): t is NonNullable<typeof t> => t != null)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (selectedTags.length === 0) return null;

  if (isLoading && selectedTags.length === 0) {
    return (
      <div
        className={`border-border-default bg-surface-1 dark:bg-surface-2 rounded-lg border px-4 py-3 ${className}`}
        aria-hidden
      >
        <div className="bg-surface-3 h-6 animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div
      className={`border-border-default bg-surface-1 dark:bg-surface-2 flex flex-wrap items-center gap-2 rounded-lg border px-4 py-3 shadow-sm ${className}`}
      role="region"
      aria-label="Active tag filters"
    >
      {selectedTags.map((tag) => {
        const chipClass = getTagChipClass(tag);
        const inlineStyle = getTagInlineStyle(tag);
        return (
          <span
            key={tag.id}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${chipClass}`}
            style={inlineStyle}
          >
            {tag.name}
            <button
              type="button"
              onClick={() => onRemove(tag.id)}
              aria-label={`Remove ${tag.name} filter`}
              className="focus-visible:ring-accent -mr-0.5 rounded p-0.5 transition-colors hover:bg-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 dark:hover:bg-white/10"
            >
              <XMarkIcon className="h-3.5 w-3.5" aria-hidden />
            </button>
          </span>
        );
      })}
    </div>
  );
}
