"use client";

import React from "react";
import { Label } from "@heroui/react";
import { trpc } from "~/trpc/client";
import {
  getTagChipClass,
  getTagGradient,
  getTagInlineStyle,
} from "~/lib/tag-colors";
import {
  CategoryTagsMultiSelect,
  type MoleculePendingTag,
} from "~/components/molecules/category-tag-picker";
import type { MoleculeView } from "~/types/molecule";

export type { MoleculePendingTag };

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
  inlineLayout?: boolean;
  deferNewTagPersistence?: boolean;
  pendingTags?: MoleculePendingTag[];
  onPendingTagsChange?: (pending: MoleculePendingTag[]) => void;
}

export function CategoryTagGroupEditable({
  tagIds,
  onTagIdsChange,
  label = "Category tags",
  description,
  className,
  inlineLayout = false,
  deferNewTagPersistence = false,
  pendingTags = [],
  onPendingTagsChange,
}: CategoryTagGroupEditableProps) {
  const { data: allTags = [], isLoading } = trpc.molecules.listTags.useQuery(
    undefined,
    { staleTime: 5 * 60 * 1000 },
  );

  const selectedTagIdsSet = new Set(tagIds);

  const handleSelectedChange = (keys: Set<string>) => {
    onTagIdsChange([...keys]);
  };

  return (
    <div className={className}>
      {description ? (
        <div
          className={`flex items-center gap-1 ${inlineLayout ? "mb-1" : "mb-1.5"}`}
        >
          <Label
            className={
              inlineLayout
                ? "text-text-secondary text-sm font-medium"
                : "text-sm font-medium text-slate-700 dark:text-slate-300"
            }
          >
            {label}
          </Label>
          {description}
        </div>
      ) : (
        <Label
          className={
            inlineLayout
              ? "text-text-secondary mb-1 block text-sm font-medium"
              : "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
          }
        >
          {label}
        </Label>
      )}
      <CategoryTagsMultiSelect
        allTags={allTags}
        selectedTagIds={selectedTagIdsSet}
        onSelectedTagIdsChange={handleSelectedChange}
        pendingTags={deferNewTagPersistence ? pendingTags : []}
        onPendingTagsChange={
          deferNewTagPersistence ? onPendingTagsChange : undefined
        }
        deferNewTagPersistence={deferNewTagPersistence}
        isLoading={isLoading}
        ariaLabel="Category tags"
      />
    </div>
  );
}
