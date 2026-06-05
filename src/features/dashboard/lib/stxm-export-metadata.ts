import { z } from "zod";
import type { MoleculeSearchResult } from "~/features/process-nexafs/types";
import type { DatasetAttributionEntry } from "~/lib/nexafs-attribution";

const attributionRowSchema = z.object({
  clientId: z.string(),
  orcid: z.string(),
  role: z.string(),
  displayName: z.string().nullable(),
  userId: z.string().nullable(),
  isClaimed: z.boolean(),
  hasContributionAgreement: z.boolean(),
  imageUrl: z.string().nullable().optional(),
});

export const stxmSampleInfoSchema = z.object({
  substrate: z.string().default(""),
  preparationDate: z.string().default(""),
  preparationNotes: z.string().default(""),
});

export type StxmSampleInfo = z.infer<typeof stxmSampleInfoSchema>;

export const stxmPeakSchema = z.object({
  id: z.string().optional(),
  energy: z.number(),
  peakKind: z.string().nullable().optional(),
});

export type StxmPeak = z.infer<typeof stxmPeakSchema>;

export const stxmExportStepMetadataSchema = z.object({
  attributions: z.array(attributionRowSchema).default([]),
  linkedMoleculeId: z.string().uuid().nullable().optional(),
  linkedMoleculeLabel: z.string().nullable().optional(),
  linkedMoleculeFormula: z.string().nullable().optional(),
  manualFormula: z.string().optional(),
  sampleInfo: stxmSampleInfoSchema.optional(),
  peaks: z.array(stxmPeakSchema).default([]),
});

export type StxmExportStepMetadata = z.infer<typeof stxmExportStepMetadataSchema>;

const defaultSampleInfo = (): StxmSampleInfo => ({
  substrate: "",
  preparationDate: "",
  preparationNotes: "",
});

/**
 * Parses persisted STXM export metadata from session `step_metadata.export`.
 */
export function parseStxmExportStepMetadata(
  value: unknown,
): StxmExportStepMetadata {
  const parsed = stxmExportStepMetadataSchema.safeParse(value);
  if (parsed.success) {
    return {
      ...parsed.data,
      sampleInfo: parsed.data.sampleInfo ?? defaultSampleInfo(),
      peaks: parsed.data.peaks ?? [],
    };
  }
  return {
    attributions: [],
    peaks: [],
    sampleInfo: defaultSampleInfo(),
  };
}

/**
 * Serializes attribution rows for dashboard session export metadata.
 */
export function stxmExportMetadataFromAttributions(
  attributions: DatasetAttributionEntry[],
): StxmExportStepMetadata {
  return {
    attributions: attributions.map((row) => ({
      clientId: row.clientId,
      orcid: row.orcid,
      role: row.role,
      displayName: row.displayName,
      userId: row.userId,
      isClaimed: row.isClaimed,
      hasContributionAgreement: row.hasContributionAgreement,
      imageUrl: row.imageUrl,
    })),
    peaks: [],
    sampleInfo: defaultSampleInfo(),
  };
}

/**
 * Merges live STXM export panel state into session export metadata.
 */
export function buildStxmExportStepMetadata(args: {
  attributions: DatasetAttributionEntry[];
  linkedMolecule: MoleculeSearchResult | null;
  manualFormula: string;
  sampleInfo: StxmSampleInfo;
  peaks: StxmPeak[];
}): StxmExportStepMetadata {
  return {
    attributions: stxmExportMetadataFromAttributions(args.attributions)
      .attributions,
    linkedMoleculeId: args.linkedMolecule?.id ?? null,
    linkedMoleculeLabel:
      args.linkedMolecule?.commonName ??
      args.linkedMolecule?.iupacName ??
      null,
    linkedMoleculeFormula: args.linkedMolecule?.chemicalFormula ?? null,
    manualFormula: args.manualFormula.trim() || undefined,
    sampleInfo: args.sampleInfo,
    peaks: args.peaks,
  };
}

/**
 * Restores attribution editor rows from persisted export metadata.
 */
export function attributionsFromStxmExportMetadata(
  metadata: StxmExportStepMetadata,
): DatasetAttributionEntry[] {
  return metadata.attributions.map((row) => ({
    clientId: row.clientId,
    orcid: row.orcid,
    role: row.role as DatasetAttributionEntry["role"],
    displayName: row.displayName,
    userId: row.userId,
    isClaimed: row.isClaimed,
    hasContributionAgreement: row.hasContributionAgreement,
    imageUrl: row.imageUrl ?? null,
  }));
}
