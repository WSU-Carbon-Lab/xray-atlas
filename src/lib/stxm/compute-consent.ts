/**
 * Session-scoped consent for browser-side STXM reduction and KK on the dashboard workspace.
 */
import { grantKkBrowserConsent } from "~/features/kk-calc/browser-consent";

const STXM_COMPUTE_CONSENT_KEY = "xray-atlas:stxm-workspace-compute-consent:v1";

/**
 * Reads whether this browser tab session already granted STXM local compute consent.
 */
export function readStxmComputeConsentGranted(): boolean {
  if (typeof sessionStorage === "undefined") {
    return false;
  }
  return sessionStorage.getItem(STXM_COMPUTE_CONSENT_KEY) === "1";
}

/**
 * Persists session-scoped consent for browser-side STXM reduction and KK work.
 *
 * Also grants Nexafs KK browser consent so ingestion does not prompt twice in one tab.
 */
export function grantStxmComputeConsent(): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  sessionStorage.setItem(STXM_COMPUTE_CONSENT_KEY, "1");
  grantKkBrowserConsent();
}
