"use client";

import { Label, Description } from "@heroui/react";
import { FieldTooltip } from "~/components/ui/field-tooltip";
import {
  CategoryTagsMultiSelect,
  type CategoryTagPickerTag,
  type MoleculePendingTag,
} from "~/components/molecules/category-tag-picker";

export interface MoleculeTagsFieldProps {
  allTags: CategoryTagPickerTag[];
  tagIds: string[];
  onTagIdsChange: (tagIds: string[]) => void;
  pendingTags: MoleculePendingTag[];
  onPendingTagsChange: (pending: MoleculePendingTag[]) => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Registry contribute tags field with stacked chip strip and browse-aligned picker.
 */
export function MoleculeTagsField({
  allTags,
  tagIds,
  onTagIdsChange,
  pendingTags,
  onPendingTagsChange,
  isLoading = false,
  className = "",
}: MoleculeTagsFieldProps) {
  const selectedTagIdsSet = new Set(tagIds);
  const totalCount = tagIds.length + pendingTags.length;

  const handleSelectedChange = (keys: Set<string>) => {
    onTagIdsChange([...keys]);
  };

  const summary =
    totalCount === 0
      ? "Optional browse filters such as OPV, polymer, or material class."
      : `${totalCount} tag${totalCount === 1 ? "" : "s"} selected. Open the picker to add or remove.`;

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center gap-1">
        <Label className="text-foreground text-sm font-medium">Tags</Label>
        <FieldTooltip description="Optional browse filters such as OPV, polymer, or material class." />
      </div>
      <Description className="text-muted mb-2 text-xs">{summary}</Description>

      <CategoryTagsMultiSelect
        allTags={allTags}
        selectedTagIds={selectedTagIdsSet}
        onSelectedTagIdsChange={handleSelectedChange}
        pendingTags={pendingTags}
        onPendingTagsChange={onPendingTagsChange}
        deferNewTagPersistence
        isLoading={isLoading}
        layout="stacked"
        ariaLabel="Category tags"
      />
    </div>
  );
}
