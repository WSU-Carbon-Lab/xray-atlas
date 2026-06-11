"use client";

import { useState } from "react";
import type { Molecule } from "openchemlib";

import {
  WorkflowBookendDepiction,
  WorkflowChunkSliceDepiction,
  WorkflowExampleFrame,
  WorkflowMiniDepiction,
} from "./workflow-mini-depiction";
import { prepareMoleculeForDatabase } from "../utils/molecule-graph-editing";
import type {
  DatabaseWorkflowDrawVariant,
  DatabaseWorkflowTidyVariant,
} from "./workflow-tool-strip";

/** SMILES for a three-carbon propane sketch (draw step, Chain tab). */
export const WORKFLOW_DRAW_PROPANE_SMILES = "CCC";

/** SMILES for propene with a central double bond (draw step, Double tab). */
export const WORKFLOW_DRAW_PROPENE_SMILES = "C=CC";

/** SMILES for benzene drawn from a ring template (draw step, Ring tab). */
export const WORKFLOW_DRAW_BENZENE_SMILES = "c1ccccc1";

/** 2,5-dimethylthiophene repeat unit for the bookends step (alpha stubs opposite sides). */
export const WORKFLOW_BOOKEND_SMILES = "Cc1cc(C)sc1";

/** Bond index for the opening `[` bookend on {@link WORKFLOW_BOOKEND_SMILES}. */
export const WORKFLOW_BOOKEND_OPEN_BOND = 0;

/** Bond index for the closing `]` bookend on {@link WORKFLOW_BOOKEND_SMILES}. */
export const WORKFLOW_BOOKEND_CLOSE_BOND = 3;

/**
 * Thiophene-benzene repeat unit with alpha methyl stubs on opposite sides after
 * OCL layout (thiophene 3-methyl and benzene para-methyl) for the blocks step.
 */
export const WORKFLOW_CHUNK_LINKED_SMILES = "Cc1cc(C)sc1-c1ccc(C)cc1";

/** Opening `[` bookend on the thiophene 3-methyl stub bond (left after layout). */
export const WORKFLOW_CHUNK_OPEN_BOND = 3;

/** Closing `]` bookend on the benzene para-methyl stub bond (right after layout). */
export const WORKFLOW_CHUNK_CLOSE_BOND = 11;

/** Inter-ring bond index for the block cut on {@link WORKFLOW_CHUNK_LINKED_SMILES}. */
export const WORKFLOW_CHUNK_SLICE_BOND = 7;

/** Heteroatom bridge example (central nitrogen). */
export const WORKFLOW_HETEROATOM_SMILES = "CNC";

/** 3-hexylthiophene before alkyl abbreviation (tidy step). */
export const WORKFLOW_TIDY_BEFORE_SMILES = "CCCCCCc1ccsc1";

type DrawTabKey = DatabaseWorkflowDrawVariant;

const DRAW_TAB_SMILES: Record<DrawTabKey, string> = {
  chain: WORKFLOW_DRAW_PROPANE_SMILES,
  double: WORKFLOW_DRAW_PROPENE_SMILES,
  ring: WORKFLOW_DRAW_BENZENE_SMILES,
};

/** Props for {@link DrawWorkflowExample}. */
export interface DrawWorkflowExampleProps {
  isDark: boolean;
  /** Controlled draw-tab selection for header tool preview sync. */
  selectedTab?: DrawTabKey;
}

/**
 * Draw-step illustration for chain, double-bond, or ring examples; tab UI lives in
 * {@link DrawWorkflowHeaderControls}.
 */
export function DrawWorkflowExample({
  isDark,
  selectedTab: controlledTab,
}: DrawWorkflowExampleProps) {
  const [internalTab] = useState<DrawTabKey>("chain");
  const selectedTab = controlledTab ?? internalTab;

  return (
    <WorkflowExampleFrame>
      <WorkflowMiniDepiction
        smiles={DRAW_TAB_SMILES[selectedTab]}
        isDark={isDark}
        svgId={`draw-${selectedTab}`}
        bare
        fill
      />
    </WorkflowExampleFrame>
  );
}

/**
 * Heteroatom-step illustration: C-N-C bridge on a dark depiction frame.
 */
export function HeteroatomWorkflowExample({ isDark }: { isDark: boolean }) {
  return (
    <WorkflowExampleFrame>
      <WorkflowMiniDepiction
        smiles={WORKFLOW_HETEROATOM_SMILES}
        isDark={isDark}
        svgId="heteroatom-cnc"
        bare
        fill
      />
    </WorkflowExampleFrame>
  );
}

/**
 * Bookends-step illustration: thiophene with methyl stubs and `[` / `]` marks.
 */
export function BookendWorkflowExample({ isDark }: { isDark: boolean }) {
  return (
    <WorkflowExampleFrame>
      <WorkflowBookendDepiction
        smiles={WORKFLOW_BOOKEND_SMILES}
        openBond={WORKFLOW_BOOKEND_OPEN_BOND}
        closeBond={WORKFLOW_BOOKEND_CLOSE_BOND}
        isDark={isDark}
        svgId="bookend-thiophene"
        fill
      />
    </WorkflowExampleFrame>
  );
}

/**
 * Blocks-step illustration: thiophene-benzene repeat unit with terminal
 * bookends and a slice on the inter-ring connector.
 */
export function ChunkWorkflowExample({ isDark }: { isDark: boolean }) {
  return (
    <WorkflowExampleFrame>
      <WorkflowChunkSliceDepiction
        smiles={WORKFLOW_CHUNK_LINKED_SMILES}
        sliceBond={WORKFLOW_CHUNK_SLICE_BOND}
        openBond={WORKFLOW_CHUNK_OPEN_BOND}
        closeBond={WORKFLOW_CHUNK_CLOSE_BOND}
        isDark={isDark}
        svgId="chunk-thiophene-benzene"
        fill
      />
    </WorkflowExampleFrame>
  );
}

function prepareTidyExampleMolecule(mol: Molecule): void {
  prepareMoleculeForDatabase(mol);
}

/** Props for {@link TidyWorkflowExample}. */
export interface TidyWorkflowExampleProps {
  isDark: boolean;
  /** Controlled before/after selection for header tool preview sync. */
  selectedTab?: DatabaseWorkflowTidyVariant;
}

/**
 * Tidy-step illustration: hexyl tail before or after alkyl abbreviation; tab UI
 * lives in {@link TidyWorkflowHeaderControls}.
 */
export function TidyWorkflowExample({
  isDark,
  selectedTab: controlledTab,
}: TidyWorkflowExampleProps) {
  const [internalTab] = useState<DatabaseWorkflowTidyVariant>("after");
  const selectedTab = controlledTab ?? internalTab;
  const showAfter = selectedTab === "after";

  return (
    <WorkflowExampleFrame>
      <WorkflowMiniDepiction
        smiles={WORKFLOW_TIDY_BEFORE_SMILES}
        isDark={isDark}
        svgId={showAfter ? "tidy-after" : "tidy-before"}
        prepareMolecule={showAfter ? prepareTidyExampleMolecule : undefined}
        bare
        fill
      />
    </WorkflowExampleFrame>
  );
}

/** @deprecated Use {@link HeteroatomWorkflowExample}. */
export const ElementWorkflowExample = HeteroatomWorkflowExample;
