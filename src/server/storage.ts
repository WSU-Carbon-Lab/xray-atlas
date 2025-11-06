import { createClient } from "@supabase/supabase-js";
import { env } from "~/env";

const BUCKET_NAME = "images";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

// Create Supabase client with service role key for server-side operations
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Gets the file extension from a MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
  };
  return mimeToExt[mimeType.toLowerCase()] ?? "svg";
}

/**
 * Validates image file
 */
function validateImage(buffer: Buffer, mimeType: string): void {
  if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
    throw new Error(
      `Invalid image type. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
    );
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(
      `Image size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    );
  }
}

/**
 * Uploads a molecule image to Supabase Storage
 * @param moleculeId - The UUID of the molecule
 * @param imageBuffer - The image file buffer
 * @param mimeType - The MIME type of the image (e.g., "image/jpeg")
 * @returns The public URL of the uploaded image
 */
export async function uploadMoleculeImage(
  moleculeId: string,
  imageBuffer: Buffer,
  mimeType: string,
): Promise<string> {
  // Validate image
  validateImage(imageBuffer, mimeType);

  // Get file extension from MIME type
  const extension = getExtensionFromMimeType(mimeType);
  const fileName = `${moleculeId}.${extension}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, imageBuffer, {
      contentType: mimeType,
      upsert: true, // Replace if exists
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);

  if (!publicUrl) {
    throw new Error("Failed to get public URL for uploaded image");
  }

  return publicUrl;
}

/**
 * Deletes a molecule image from Supabase Storage
 * @param imageUrl - The public URL of the image to delete
 */
export async function deleteMoleculeImage(imageUrl: string): Promise<void> {
  try {
    // Extract filename from URL
    const urlParts = imageUrl.split("/");
    const fileName = urlParts[urlParts.length - 1];

    if (!fileName) {
      throw new Error("Invalid image URL");
    }

    // Delete from Supabase Storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([fileName]);

    if (error) {
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  } catch (error) {
    // Log error but don't throw - deletion failures shouldn't break the flow
    console.error("Error deleting molecule image:", error);
    throw error;
  }
}

/**
 * Gets the public URL for a molecule image based on its ID
 * This constructs the URL without checking if the file exists
 * @param moleculeId - The UUID of the molecule
 * @param extension - Optional file extension (defaults to "svg")
 * @returns The public URL
 */
export function getMoleculeImageUrl(
  moleculeId: string,
  extension: string = "svg",
): string {
  const fileName = `${moleculeId}.${extension}`;
  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);

  return publicUrl;
}
