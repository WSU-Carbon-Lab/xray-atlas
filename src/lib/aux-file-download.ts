import { showToast } from "~/components/ui/toast";

/**
 * Fetches a signed auxiliary-file URL and triggers a browser download with the original filename.
 */
export async function downloadAuxFileFromSignedUrl(
  signedUrl: string,
  originalFilename: string,
): Promise<void> {
  const response = await fetch(signedUrl);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = originalFilename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
  showToast(`Download started: ${originalFilename}`, "success");
}

/**
 * Opens the all-data bundle route for an experiment and surfaces toast feedback on failure.
 */
export function downloadDatasetAllDataBundle(experimentId: string): void {
  const anchor = document.createElement("a");
  anchor.href = `/api/nexafs/experiments/${experimentId}/all-data-bundle`;
  anchor.download = `nexafs-experiment-${experimentId.slice(0, 8)}-all-data.tar.gz`;
  anchor.click();
  showToast("All-data archive download started", "success");
}
