const STORAGE_KEY = "xray-atlas:nexafs-kk-browser-consent:v1";

/**
 * Reads whether the current browser session has already granted permission to run
 * client-side Kramers–Kronig transforms that may be CPU-heavy on large spectra.
 *
 * @returns True when `sessionStorage` records an explicit grant for this origin.
 */
export function readKkBrowserConsentGranted(): boolean {
  if (typeof sessionStorage === "undefined") {
    return false;
  }
  return sessionStorage.getItem(STORAGE_KEY) === "1";
}

/**
 * Persists a session-scoped grant for browser Kramers–Kronig work after explicit user action.
 */
export function grantKkBrowserConsent(): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, "1");
}
