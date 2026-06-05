import { z } from "zod";
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

export const stxmExportStepMetadataSchema = z.object({
  attributions: z.array(attributionRowSchema).default([]),
});

export type StxmExportStepMetadata = z.infer<typeof stxmExportStepMetadataSchema>;

/**
 * Parses persisted STXM export metadata from session `step_metadata.export`.
 */
export function parseStxmExportStepMetadata(
  value: unknown,
): StxmExportStepMetadata {
  const parsed = stxmExportStepMetadataSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }
  return { attributions: [] };
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
