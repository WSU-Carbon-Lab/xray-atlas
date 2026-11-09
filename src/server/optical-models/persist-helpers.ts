/**
 * Small persistence helpers shared by the optical model lifecycle and default-model code.
 *
 * Owns tag allocation, JSON null mapping for nullable Prisma Json columns, and the conversion of a
 * stored version into nested create data for a new draft. Does not enforce authorization or
 * visibility.
 */

import { Prisma } from "~/prisma/client";
import type { PrismaClient } from "~/prisma/client";
import { generateOpticalModelTag } from "~/lib/optical-models/tag";

/** Prisma client or interactive transaction client. */
export type ModelDb = PrismaClient | Prisma.TransactionClient;

/** A version row with its datasets, peaks, and tensor loaded. */
export type VersionWithContent = Prisma.OpticalModelVersionGetPayload<{
  include: { datasets: true; peaks: true; tensor: true };
}>;

/**
 * Prisma input for a nullable Json column.
 *
 * @param value - Stored JSON value, or `null` for SQL NULL.
 * @returns `Prisma.DbNull` for `null`, otherwise `value` typed as input JSON.
 */
export function jsonOrDbNull(
  value: Prisma.JsonValue | null,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue);
}

/**
 * Allocates a model tag that no existing model uses.
 *
 * Tries up to 12 random tags. Concurrent callers can still collide; the unique index on
 * `optical_model.tag` is the final guard and a violation surfaces as a Prisma error.
 *
 * @param db - Prisma client or transaction client.
 * @returns An unused 8-character tag.
 * @throws Error when 12 attempts all collide.
 */
export async function allocateOpticalModelTag(db: ModelDb): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const tag = generateOpticalModelTag();
    const existing = await db.opticalModel.findUnique({
      where: { tag },
      select: { id: true },
    });
    if (!existing) return tag;
  }
  throw new Error("Could not allocate a unique optical model tag.");
}

/**
 * Locks the model row until the transaction ends.
 *
 * Edits, publishes, and deletes of one model take this lock first, so they run one at a time and
 * each sees the other's committed result.
 *
 * @param tx - Interactive transaction client.
 * @param modelId - Model primary key.
 */
export async function lockModelRow(
  tx: Prisma.TransactionClient,
  modelId: string,
): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "public"."optical_model" WHERE id = ${modelId}::uuid FOR UPDATE`;
}

/**
 * Nested create data that copies a version's content into a new version of the same or another
 * model.
 *
 * Copies normalization, dataset links with their pins, peaks in stored order with their
 * ordinals, and the tensor row (same storage path, so blobs are shared until replaced). Does not
 * copy status, version number, checksum, authors snapshot, or parents.
 *
 * @param source - Version loaded with datasets, peaks, and tensor.
 * @returns Fields to spread into an `opticalModelVersion` create.
 */
export function versionContentCreateData(
  source: VersionWithContent,
): Pick<
  Prisma.OpticalModelVersionUncheckedCreateWithoutModelInput,
  "normalization" | "datasets" | "peaks" | "tensor"
> {
  return {
    normalization: jsonOrDbNull(source.normalization),
    datasets: {
      create: source.datasets.map((dataset) => ({
        experimentId: dataset.experimentId,
        pinnedMajor: dataset.pinnedMajor,
        pinnedMinor: dataset.pinnedMinor,
        pinnedPatch: dataset.pinnedPatch,
        role: dataset.role,
      })),
    },
    peaks: {
      create: [...source.peaks]
        .sort((a, b) => a.ordinal - b.ordinal)
        .map((peak) => ({
          ordinal: peak.ordinal,
          experimentId: peak.experimentId,
          polarizationId: peak.polarizationId,
          centerEv: peak.centerEv,
          kind: peak.kind,
          transition: peak.transition,
          amplitude: peak.amplitude,
          width: peak.width,
          shape: peak.shape,
          centerErr: peak.centerErr,
          amplitudeErr: peak.amplitudeErr,
          widthErr: peak.widthErr,
          params: jsonOrDbNull(peak.params),
          fitProvenance: jsonOrDbNull(peak.fitProvenance),
        })),
    },
    tensor: source.tensor
      ? {
          create: {
            storagePath: source.tensor.storagePath,
            byteSize: source.tensor.byteSize,
            sha256: source.tensor.sha256,
            manifest: source.tensor.manifest as Prisma.InputJsonValue,
          },
        }
      : undefined,
  };
}
