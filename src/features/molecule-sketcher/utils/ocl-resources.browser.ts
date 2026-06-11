/**
 * Browser-safe OpenChemLib resource registration for client components.
 * Loads MMFF and conformer tables via the app `/api/ocl-resources` route.
 */

import { Resources } from "openchemlib";

import { getBaseUrl } from "~/utils/getBaseUrl";

let browserResourcesPromise: Promise<void> | null = null;

/**
 * Registers OpenChemLib static resources in the browser via the app API route.
 * Deduplicates concurrent callers to a single in-flight fetch.
 *
 * @returns Promise that settles when resources are registered or rejects on failure.
 */
export function ensureOclResourcesBrowser(): Promise<void> {
  if (browserResourcesPromise !== null) {
    return browserResourcesPromise;
  }
  browserResourcesPromise = Resources.registerFromUrl(
    `${getBaseUrl()}/api/ocl-resources`,
  ).catch((error: unknown) => {
    browserResourcesPromise = null;
    throw error;
  });
  return browserResourcesPromise;
}
