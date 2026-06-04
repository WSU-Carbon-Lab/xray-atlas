import { createClient } from "@supabase/supabase-js";
import { env } from "~/env";

export const SAMPLE_AUX_BUCKET = "sample-aux" as const;
export const EXPERIMENT_AUX_BUCKET = "experiment-aux" as const;

export type AuxStorageBucket =
  | typeof SAMPLE_AUX_BUCKET
  | typeof EXPERIMENT_AUX_BUCKET;

const SAMPLE_AUX_MAX_BYTES = 50 * 1024 * 1024;
const EXPERIMENT_AUX_MAX_BYTES = 500 * 1024 * 1024;

const AUX_MIME_WHITELIST = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/csv",
  "text/tab-separated-values",
  "application/json",
  "application/zip",
  "application/gzip",
  "application/x-gzip",
  "application/x-tar",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/x-hdf5",
  "application/x-hdf",
  "application/netcdf",
  "chemical/x-cif",
  "chemical/x-pdb",
]);

const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

/**
 * Rejects MIME types outside the aux whitelist and always rejects SVG (XSS vector in browsers).
 */
export function assertAuxMimeAllowed(mimeType: string): void {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized === "image/svg+xml") {
    throw new Error("SVG uploads are not allowed for auxiliary files");
  }
  if (!AUX_MIME_WHITELIST.has(normalized)) {
    throw new Error(`MIME type not allowed: ${mimeType}`);
  }
}

/**
 * Enforces per-bucket upload size caps (50 MB sample, 500 MB experiment).
 */
export function assertAuxFileSizeAllowed(
  bucket: AuxStorageBucket,
  sizeBytes: number,
): void {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new Error("File size must be a positive number");
  }
  const max =
    bucket === SAMPLE_AUX_BUCKET
      ? SAMPLE_AUX_MAX_BYTES
      : EXPERIMENT_AUX_MAX_BYTES;
  if (sizeBytes > max) {
    throw new Error(
      `File size exceeds maximum of ${max / (1024 * 1024)}MB for bucket ${bucket}`,
    );
  }
}

/**
 * Builds a stable object key under `{subjectId}/{fileId}/{sanitizedFilename}`.
 */
export function buildAuxStoragePath(
  subjectId: string,
  fileId: string,
  originalFilename: string,
): string {
  const base = originalFilename
    .trim()
    .replace(/[/\\]/g, "_")
    .replace(/[^\w.\-()+ ]/g, "_")
    .slice(0, 200);
  const safeName = base.length > 0 ? base : "upload";
  return `${subjectId}/${fileId}/${safeName}`;
}

/**
 * Creates a signed upload URL for a pending aux file row.
 */
export async function createAuxSignedUploadUrl(args: {
  bucket: AuxStorageBucket;
  path: string;
  mimeType: string;
}): Promise<{ signedUrl: string; token: string }> {
  const { data, error } = await supabase.storage
    .from(args.bucket)
    .createSignedUploadUrl(args.path, {
      upsert: false,
    });

  if (error || !data?.signedUrl) {
    throw new Error(
      error?.message ?? "Failed to create signed upload URL for auxiliary file",
    );
  }

  return {
    signedUrl: data.signedUrl,
    token: data.token,
  };
}

/**
 * Creates a short-lived signed read URL for an object in an aux bucket (admin/debug flows).
 */
export async function createAuxSignedReadUrl(args: {
  bucket: AuxStorageBucket;
  path: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const { data, error } = await supabase.storage
    .from(args.bucket)
    .createSignedUrl(args.path, args.expiresInSeconds ?? 3600);

  if (error || !data?.signedUrl) {
    throw new Error(
      error?.message ?? "Failed to create signed read URL for auxiliary file",
    );
  }

  return data.signedUrl;
}

/**
 * Downloads the full object bytes from an aux bucket using the service role.
 */
export async function downloadAuxStorageObject(args: {
  bucket: AuxStorageBucket;
  path: string;
}): Promise<Buffer> {
  const { data, error } = await supabase.storage
    .from(args.bucket)
    .download(args.path);

  if (error || !data) {
    throw new Error(
      error?.message ?? "Failed to download auxiliary file from storage",
    );
  }

  return Buffer.from(await data.arrayBuffer());
}

/**
 * Returns object metadata when the upload exists in storage, or null when missing.
 */
export async function headAuxStorageObject(args: {
  bucket: AuxStorageBucket;
  path: string;
}): Promise<{ sizeBytes: number } | null> {
  const folder = args.path.includes("/")
    ? args.path.slice(0, args.path.lastIndexOf("/"))
    : "";
  const name = args.path.includes("/")
    ? args.path.slice(args.path.lastIndexOf("/") + 1)
    : args.path;

  const { data, error } = await supabase.storage.from(args.bucket).list(folder, {
    search: name,
    limit: 1,
  });

  if (error) {
    throw new Error(`Failed to verify upload in storage: ${error.message}`);
  }

  const match = data?.find((entry) => entry.name === name);
  if (!match) {
    return null;
  }

  const size =
    match.metadata && typeof match.metadata.size === "number"
      ? match.metadata.size
      : null;
  if (size == null) {
    return { sizeBytes: 0 };
  }
  return { sizeBytes: size };
}
