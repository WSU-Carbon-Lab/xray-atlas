import type { BigSmilesComponentsModel } from "./types";

/**
 * Curated sandbox presets that mimic block-copolymer component layouts before a
 * full BigSMILES parser exists.
 */
export const BIGSMILES_MOCK_PRESETS: readonly BigSmilesComponentsModel[] = [
  {
    topology: "block_copolymer",
    sourceLabel: "PS-b-PMMA (mock)",
    rawNotationPreview:
      "{[<]CC(c1ccccc1)[>]}{[<]CC(=O)OC[>]}{[<]CC(c1ccccc1)[>]}|{[<]CC(=O)OC[>]}{[<]CC(c1ccccc1)[>]}",
    blocks: [
      {
        label: "A",
        fragmentSmiles: "CC(c1ccccc1)",
        orientationHint: "Backbone attachment :1",
        repeatRole: "Polystyrene repeat",
        bondDescriptor: "[<]...[>]",
      },
      {
        label: "B",
        fragmentSmiles: "CC(=O)OC",
        orientationHint: "Backbone attachment :1",
        repeatRole: "PMMA repeat",
        bondDescriptor: "[<]...[>]",
      },
    ],
  },
  {
    topology: "block_copolymer",
    sourceLabel: "PEO-b-PCL (mock)",
    rawNotationPreview:
      "{[<]CCO[>]}{[<]CC(=O)OCCCCC[>]}{[<]CCO[>]}{[<]CC(=O)OCCCCC[>]}",
    blocks: [
      {
        label: "A",
        fragmentSmiles: "CCO",
        orientationHint: "Ether backbone :1",
        repeatRole: "PEO repeat",
        bondDescriptor: "[<]...[>]",
      },
      {
        label: "B",
        fragmentSmiles: "CC(=O)OCCCCC",
        orientationHint: "Ester backbone :1",
        repeatRole: "PCL repeat",
        bondDescriptor: "[<]...[>]",
      },
    ],
  },
  {
    topology: "homopolymer",
    sourceLabel: "Polyethylene (mock)",
    rawNotationPreview: "{[<]CC[>]}{[<]CC[>]}{[<]CC[>]}",
    blocks: [
      {
        label: "A",
        fragmentSmiles: "CC",
        orientationHint: "Backbone attachment :1",
        repeatRole: "Ethylene repeat",
        bondDescriptor: "[<]...[>]",
      },
    ],
  },
];
