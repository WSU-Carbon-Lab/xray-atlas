/**
 * Storage helpers for optical model tensor blobs.
 *
 * Owns the private `optical-model-tensors` bucket contract: object paths, the size cap, signed
 * upload and read URLs, size and SHA-256 verification of an uploaded object, and removal of blobs
 * that no tensor row references. Uses the service-role key, so callers must authorize first. Does
 * not know about models, versions, or visibility.
 */

import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { createClient } from "@supabase/supabase-js";
import { env } from "~/env";
import type { PrismaClient } from "~/prisma/client";

/** Private bucket that holds tensor blobs. */
export const TENSOR_BUCKET = "optical-model-tensors" as const;

/** Largest tensor blob accepted, in bytes (128 MiB). */
export const MAX_TENSOR_BYTES = 128 * 1024 * 1024;

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Object key for a tensor blob: `{modelId}/{uploadId}.bin`.
 *
 * @param modelId - Model primary key; the first path segment scopes the blob to its model.
 * @param uploadId - Random id of this upload.
 */
export function buildTensorStoragePath(
  modelId: string,
  uploadId: string,
): string {
  return `${modelId}/${uploadId}.bin`;
}

/**
 * Rejects sizes outside `1..MAX_TENSOR_BYTES`.
 *
 * @param sizeBytes - Declared blob size in bytes.
 * @throws Error when `sizeBytes` is not a positive integer within the cap.
 */
export function assertTensorSizeAllowed(sizeBytes: number): void {
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) {
    throw new Error("Tensor size must be a positive integer number of bytes.");
  }
  if (sizeBytes > MAX_TENSOR_BYTES) {
    throw new Error(
      `Tensor size exceeds the maximum of ${MAX_TENSOR_BYTES / (1024 * 1024)} MiB.`,
    );
  }
}

/**
 * Signed URL that accepts one upload to `path`.
 *
 * @param path - Object key from {@link buildTensorStoragePath}.
 * @returns The signed upload URL.
 */
export async function createTensorSignedUploadUrl(
  path: string,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(TENSOR_BUCKET)
    .createSignedUploadUrl(path, { upsert: false });
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Failed to create tensor upload URL.");
  }
  return data.signedUrl;
}

/**
 * Short-lived signed URL that reads `path`.
 *
 * @param path - Object key of an existing blob.
 * @param expiresInSeconds - Lifetime of the URL; defaults to 300.
 */
export async function createTensorSignedReadUrl(
  path: string,
  expiresInSeconds = 300,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(TENSOR_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Failed to create tensor read URL.");
  }
  return data.signedUrl;
}

/**
 * Existence and reported size of an uploaded blob.
 *
 * @param path - Object key.
 * @returns `null` when the object does not exist. Otherwise `sizeBytes` is the size reported by
 *   storage metadata, or `null` when the metadata carries no numeric size (callers must not treat
 *   that as zero).
 */
export async function headTensorObject(
  path: string,
): Promise<{ sizeBytes: number | null } | null> {
  const slash = path.lastIndexOf("/");
  const folder = slash >= 0 ? path.slice(0, slash) : "";
  const name = slash >= 0 ? path.slice(slash + 1) : path;
  const { data, error } = await supabase.storage
    .from(TENSOR_BUCKET)
    .list(folder, { search: name, limit: 1 });
  if (error) {
    throw new Error(`Failed to verify tensor upload: ${error.message}`);
  }
  const match = data?.find((entry) => entry.name === name);
  if (!match) return null;
  const size =
    match.metadata && typeof match.metadata.size === "number"
      ? match.metadata.size
      : null;
  return { sizeBytes: size };
}

/**
 * Lowercase SHA-256 hex digest and exact byte count of a stored blob, computed by streaming it so
 * memory stays flat. The count is of the bytes actually read, not the size storage reports.
 *
 * @param path - Object key of an existing blob.
 * @returns The digest and the number of bytes read.
 * @throws Error when the blob cannot be fetched, the fetch exceeds 60 seconds, or the blob grows
 *   past {@link MAX_TENSOR_BYTES} (reading stops at that point).
 */
export async function sha256AndSizeOfTensorObject(
  path: string,
): Promise<{ sha256: string; sizeBytes: number }> {
  const url = await createTensorSignedReadUrl(path, 120);
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok || !response.body) {
    throw new Error("Failed to read the tensor blob for verification.");
  }
  const hash = createHash("sha256");
  const stream = Readable.fromWeb(
    response.body as unknown as NodeReadableStream<Uint8Array>,
  );
  let sizeBytes = 0;
  for await (const chunk of stream) {
    const bytes = chunk as Uint8Array;
    sizeBytes += bytes.byteLength;
    if (sizeBytes > MAX_TENSOR_BYTES) {
      stream.destroy();
      throw new Error("Tensor blob exceeds the maximum size.");
    }
    hash.update(bytes);
  }
  return { sha256: hash.digest("hex"), sizeBytes };
}

/**
 * Best-effort removal of blobs. Missing keys are ignored and storage errors are logged, not thrown.
 *
 * @param paths - Object keys to remove.
 */
export async function removeTensorObjects(
  paths: readonly string[],
): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage
    .from(TENSOR_BUCKET)
    .remove([...paths]);
  if (error) {
    console.error("[tensor-storage] Failed to remove objects:", error.message);
  }
}

/**
 * Removes the blobs among `paths` that no tensor row references any more.
 *
 * A fork copies a tensor row and shares its blob, so a blob is deleted only when every row that
 * pointed at it is gone.
 *
 * @param db - Shared Prisma client.
 * @param paths - Candidate object keys, for example the paths of just-deleted tensor rows.
 */
export async function removeUnreferencedTensorBlobs(
  db: PrismaClient,
  paths: readonly string[],
): Promise<void> {
  const unique = [...new Set(paths)];
  if (unique.length === 0) return;
  const stillUsed = await db.opticalModelTensor.findMany({
    where: { storagePath: { in: unique } },
    select: { storagePath: true },
  });
  const used = new Set(stillUsed.map((row) => row.storagePath));
  await removeTensorObjects(unique.filter((path) => !used.has(path)));
}
