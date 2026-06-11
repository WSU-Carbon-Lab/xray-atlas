"use client";

import { useId } from "react";
import { Chip } from "@heroui/react";

import { blockAccentColor } from "../constants";
import type { BigSmilesBlockRecord } from "../types";
import { BlockStructureDepiction } from "./block-structure-depiction";

type BigSmilesBlockCardProps = {
  block: BigSmilesBlockRecord;
  index: number;
  showAccent: boolean;
};

/**
 * Single block card: label badge, 2D depiction, SMILES snippet, and orientation hint.
 */
export function BigSmilesBlockCard({
  block,
  index,
  showAccent,
}: BigSmilesBlockCardProps) {
  const baseId = useId();
  const accent = blockAccentColor(index);

  return (
    <article
      className="border-border bg-surface flex min-w-[220px] max-w-[280px] flex-col gap-2 rounded-lg border p-3 shadow-sm"
      aria-labelledby={`${baseId}-label`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Chip
          id={`${baseId}-label`}
          size="sm"
          variant="secondary"
          className="font-semibold"
          style={
            showAccent
              ? { borderColor: accent, color: accent }
              : undefined
          }
        >
          <Chip.Label>Block {block.label}</Chip.Label>
        </Chip>
        {block.repeatRole ? (
          <span className="text-muted text-xs">{block.repeatRole}</span>
        ) : null}
      </div>

      <BlockStructureDepiction
        fragmentSmiles={block.fragmentSmiles}
        width={240}
        height={150}
        svgId={`${baseId}-depiction`}
        accentColor={accent}
        showAccent={showAccent}
      />

      {block.orientationHint ? (
        <p className="text-muted text-xs">{block.orientationHint}</p>
      ) : null}

      {block.bondDescriptor ? (
        <p className="text-muted font-mono text-xs">{block.bondDescriptor}</p>
      ) : null}

      <p
        className="text-foreground font-mono text-xs break-all"
        title={block.fragmentSmiles}
      >
        {block.fragmentSmiles}
      </p>
    </article>
  );
}
