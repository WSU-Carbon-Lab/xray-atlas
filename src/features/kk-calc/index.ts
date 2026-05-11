/**
 * Client-side Kramers–Kronig helpers for NEXAFS `beta`→`delta` workflows.
 *
 * Owns numerical kernels, consent helpers, spectrum-row batching utilities, and makima
 * remapping used by contribute and browse surfaces. It deliberately excludes Prisma and
 * server-only code; persistence happens through tRPC mutations after the browser computes `delta`.
 */

export {
  alignKkDeltaToSpectrumEnergyAxis,
  interpolateMakimaSorted,
} from "./makima-interpolate";
export { computeDeltaFromBetaDiscreteKK } from "./kk-discrete-henke";
export { applyKkDeltaToSpectrumPoints } from "./apply-kk-to-spectrum-points";
export {
  readKkBrowserConsentGranted,
  grantKkBrowserConsent,
} from "./browser-consent";
export {
  buildSpectrumpointDeltaUpdatesFromRows,
  type SpectrumpointRowForKk,
} from "./build-spectrumpoint-delta-updates";
export { KkBrowserConsentDialog } from "./kk-browser-consent-dialog";
export type { KkBrowserConsentDialogProps } from "./kk-browser-consent-dialog";

