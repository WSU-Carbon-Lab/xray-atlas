import { z } from "zod";

export const auxFileKindSchema = z.enum([
  "protocol",
  "raw_data",
  "image",
  "spreadsheet",
  "document",
  "other",
]);

export type AuxFileKind = z.infer<typeof auxFileKindSchema>;

const sha256HexSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/i, "Expected lowercase hex SHA-256 digest");

export const auxFileUploadRequestSchema = z.object({
  mimeType: z.string().trim().min(1).max(256),
  sizeBytes: z.number().int().positive(),
  kind: auxFileKindSchema,
  originalFilename: z.string().trim().min(1).max(512),
  description: z.string().trim().max(4000).optional(),
});

export const auxFileCommitSchema = z.object({
  fileId: z.string().uuid(),
  checksumSha256: sha256HexSchema,
});

export function serializeAuxFileRow<
  T extends {
    id: string;
    storagepath: string;
    originalfilename: string;
    mimetype: string;
    sizebytes: bigint;
    kind: string;
    description: string | null;
    checksumsha256: string | null;
    createdby: string;
    committedat: Date | null;
    deletedat: Date | null;
    createdat: Date;
    updatedat: Date;
  },
>(row: T) {
  return {
    id: row.id,
    storagePath: row.storagepath,
    originalFilename: row.originalfilename,
    mimeType: row.mimetype,
    sizeBytes: Number(row.sizebytes),
    kind: row.kind,
    description: row.description,
    checksumSha256: row.checksumsha256,
    createdBy: row.createdby,
    committedAt: row.committedat?.toISOString() ?? null,
    deletedAt: row.deletedat?.toISOString() ?? null,
    createdAt: row.createdat.toISOString(),
    updatedAt: row.updatedat.toISOString(),
  };
}
