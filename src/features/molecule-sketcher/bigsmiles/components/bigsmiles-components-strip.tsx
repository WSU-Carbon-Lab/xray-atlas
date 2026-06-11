"use client";

import type { BigSmilesComponentsModel } from "../types";
import { BigSmilesBlockCard } from "./bigsmiles-block-card";

type BigSmilesComponentsStripProps = {
  model: BigSmilesComponentsModel;
  showAccent: boolean;
};

function BlockConnector() {
  return (
    <div
      className="text-muted flex shrink-0 items-center self-center px-1"
      aria-hidden="true"
    >
      <span className="border-muted h-px w-6 border-t-2" />
      <span className="mx-0.5 text-lg font-light">|</span>
      <span className="border-muted h-px w-6 border-t-2" />
    </div>
  );
}

/**
 * Horizontal strip of block cards with junction connectors for block-copolymer topology.
 */
export function BigSmilesComponentsStrip({
  model,
  showAccent,
}: BigSmilesComponentsStripProps) {
  const isBlockCopolymer = model.topology === "block_copolymer";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-2">
        <p className="text-foreground text-sm font-medium">Components</p>
        <span className="text-muted text-xs capitalize">
          {model.topology.replaceAll("_", " ")}
        </span>
        <span className="text-muted text-xs">({model.sourceLabel})</span>
      </div>

      <div
        className="flex flex-nowrap items-stretch gap-0 overflow-x-auto pb-2"
        role="list"
        aria-label="BigSMILES block components"
      >
        {model.blocks.map((block, index) => (
          <div key={`${block.label}-${index}`} className="flex items-stretch">
            {index > 0 && isBlockCopolymer ? <BlockConnector /> : null}
            <div role="listitem">
              <BigSmilesBlockCard
                block={block}
                index={index}
                showAccent={showAccent}
              />
            </div>
          </div>
        ))}
      </div>

      {model.rawNotationPreview ? (
        <div className="border-border bg-surface-2/20 rounded-md border p-3">
          <p className="text-muted text-xs font-medium">Notation preview</p>
          <p className="text-foreground mt-1 font-mono text-xs break-all">
            {model.rawNotationPreview}
          </p>
        </div>
      ) : null}
    </div>
  );
}
