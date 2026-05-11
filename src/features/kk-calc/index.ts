/**
 * Client-side Kramers–Kronig helpers for NEXAFS `beta`→`delta` workflows.
 *
 * ## Architecture (production)
 *
 * **Physics path:** dispersive `delta` from optical `beta` uses kkcalc2 (Ben Watts) **KK_PP**
 * piecewise-polynomial transforms in **TypeScript**: `refractive_to_ASF` scaling, linear `ASF_to_ASP`,
 * `KK_PP`, then `ASF_to_refractive`, matching `tests/kk-calc-validation/run_reference.py`
 * `kkcalc-delta-optical-beta`. With material context, **Henke bare-atom tails** extend imaginary ASF
 * before `KK_PP` (see `kkcalc-bare-asf-extension.ts` and bundled `kkcalc-henke-element-f2.bundle.json`).
 * Default relativistic `Z^*` follows kkcalc2 extended objects (stoichiometry correction when extension
 * runs; `0` for measurement-only / `bareAtomExtension.enabled: false`).
 *
 * **Interpolation:** `makima-interpolate.ts` provides `alignKkDeltaToSpectrumEnergyAxis`, which is
 * applied internally by {@link applyKkDeltaToSpectrumPoints} and
 * {@link buildSpectrumpointDeltaUpdatesFromRows} to regrid `delta` whenever the KK output energies
 * differ from the persisted spectrum axis.
 *
 * **Material inputs:** callers pass **stoichiometry** (molecule chemical formula) and **mass density**
 * (g/cm³); until explicit sample density exists in the contribute model, the product uses
 * {@link DEFAULT_KK_MASS_DENSITY_G_CM3} as a documented default for conversions.
 *
 * Owns consent helpers, spectrum-row batching utilities, and makima remapping used by contribute and
 * browse surfaces. It deliberately excludes Prisma and server-only code; persistence happens through
 * tRPC mutations after the browser computes `delta`.
 *
 * Tests (`kk-calc-validation.test.ts`) and the lower-level kkcalc2 transforms import directly from
 * their source files; this barrel intentionally re-exports only the surface that downstream features
 * and route components consume.
 */

/** Default mass density (g/cm³) used by kkcalc2 conversions until an explicit sample value exists. */
export { DEFAULT_KK_MASS_DENSITY_G_CM3 } from "./compute-delta-from-beta-kkcalc-style";

/** Applies KK-derived `delta` across in-memory spectrum points (per theta–phi geometry group). */
export { applyKkDeltaToSpectrumPoints } from "./apply-kk-to-spectrum-points";

/** Builds `{ id, delta }` updates for the `spectrumpoints.updateKkDeltaBatch` tRPC mutation. */
export { buildSpectrumpointDeltaUpdatesFromRows } from "./build-spectrumpoint-delta-updates";

/** Reads or persists the per-tab-session browser consent flag before running heavy KK in the client. */
export {
  grantKkBrowserConsent,
  readKkBrowserConsentGranted,
} from "./browser-consent";

/** Modal prompting contributors before an expensive in-browser KK pass. */
export { KkBrowserConsentDialog } from "./kk-browser-consent-dialog";
