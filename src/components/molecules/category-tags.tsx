"use client";

import React from "react";
import { Label } from "@heroui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { trpc } from "~/trpc/client";
import {
  getTagChipClass,
  getTagGradient,
  getTagInlineStyle,
} from "~/lib/tag-colors";
import { TagsDropdown } from "~/components/browse/tags-dropdown";
import type { MoleculeView } from "~/types/molecule";

export const PREVIEW_GRADIENTS = [
  "from-indigo-500/20 to-purple-500/20",
  "from-blue-500/20 to-cyan-500/20",
  "from-emerald-500/20 to-teal-500/20",
  "from-amber-500/20 to-orange-500/20",
  "from-rose-500/20 to-pink-500/20",
  "from-violet-500/20 to-purple-500/20",
] as const;

export const DEFAULT_PREVIEW_GRADIENT = "from-slate-500/20 to-slate-600/20";

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function getPreviewGradient(molecule: MoleculeView): string {
  const firstTag = molecule.moleculeTags?.[0];
  if (firstTag) {
    const gradient = getTagGradient(firstTag);
    if (gradient) return gradient;
  }
  if (molecule.id) {
    const idx = hashString(molecule.id) % PREVIEW_GRADIENTS.length;
    return PREVIEW_GRADIENTS[idx] ?? DEFAULT_PREVIEW_GRADIENT;
  }
  return DEFAULT_PREVIEW_GRADIENT;
}

export interface MoleculeTagsProps {
  molecule: MoleculeView;
}

export function MoleculeTags({ molecule }: MoleculeTagsProps) {
  const tags = molecule.moleculeTags ?? [];
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.slice(0, 5).map((tag) => {
        const chipClass = getTagChipClass(tag);
        const inlineStyle = getTagInlineStyle(tag);
        return (
          <span
            key={tag.id}
            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${chipClass}`}
            style={inlineStyle}
          >
            {tag.name}
          </span>
        );
      })}
      {tags.length > 5 ? (
        <span className="text-text-tertiary inline-flex items-center rounded-md px-2.5 py-1 text-xs">
          +{tags.length - 5} more
        </span>
      ) : null}
    </div>
  );
}

export type CategoryTag = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
};

export interface CategoryTagGroupEditableProps {
  tagIds: string[];
  onTagIdsChange: (tagIds: string[]) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}

export function CategoryTagGroupEditable({
  tagIds,
  onTagIdsChange,
  label = "Category tags",
  description,
  className,
}: CategoryTagGroupEditableProps) {
  const { data: allTags = [], isLoading } = trpc.molecules.listTags.useQuery(
    undefined,
    { staleTime: 5 * 60 * 1000 },
  );
  const tagById = new Map(allTags.map((t) => [t.id, t]));
  const selectedTags = tagIds
    .map((id) => tagById.get(id))
    .filter((t): t is NonNullable<typeof t> => t != null)
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedTagIdsSet = new Set(tagIds);

  const handleSelectionChange = (keys: Set<string>) => {
    onTagIdsChange([...keys]);
  };

  const removeTagId = (tagId: string) => {
    onTagIdsChange(tagIds.filter((id) => id !== tagId));
  };

  const utils = trpc.useUtils();
  const findOrCreateTag = trpc.molecules.findOrCreateTag.useMutation();

  const handleCreateTag = async (name: string): Promise<string> => {
    const tag = await findOrCreateTag.mutateAsync({ name: name.trim() });
    void utils.molecules.listTags.invalidate();
    return tag.id;
  };

  return (
    <div className={className}>
      {description ? (
        <div className="mb-1.5 flex items-center gap-1">
          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
          </Label>
          {description}
        </div>
      ) : (
        <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </Label>
      )}
      <div
        className="border-border-default bg-surface-1 dark:bg-surface-2 flex min-h-12 flex-wrap items-center gap-2 rounded-lg border px-4 py-3 shadow-sm"
        role="region"
        aria-label="Category tags"
      >
        {selectedTags.length === 0 && !isLoading ? (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            No category tags selected
          </span>
        ) : null}
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
                onClick={() => removeTagId(tag.id)}
                aria-label={`Remove ${tag.name}`}
                className="focus-visible:ring-accent -mr-0.5 rounded p-0.5 transition-colors hover:bg-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 dark:hover:bg-white/10"
              >
                <XMarkIcon className="h-3.5 w-3.5" aria-hidden />
              </button>
            </span>
          );
        })}
      </div>
      <div className="mt-2">
        <TagsDropdown
          selectedTagIds={selectedTagIdsSet}
          onSelectionChange={handleSelectionChange}
          ariaLabel="Add category tag"
          allowCreateFromInput
          onCreateTag={handleCreateTag}
        />
      </div>
    </div>
  );
}
