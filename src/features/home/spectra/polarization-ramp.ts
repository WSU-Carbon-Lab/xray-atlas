/**
 * Adapter from a normalized polarization position to the repo's grey-to-red
 * spectrum trace gradient. Does not define a palette of its own.
 */
import {
  SPECTRUM_TRACE_GRADIENT_DARK,
  SPECTRUM_TRACE_GRADIENT_LIGHT,
  spectrumTraceColorAlongGradient,
} from "~/components/plots/constants";

const RAMP_STEPS = 256;

function rampStep(ramp: number): number {
  return Math.round(Math.max(0, Math.min(1, ramp)) * (RAMP_STEPS - 1));
}

/** Theme-aware CSS color at `ramp` in [0, 1] (0 = lowest theta) on the shared grey-to-red gradient; resolved by `color-scheme` via `light-dark()`, so server and client markup match. Out-of-range input is clamped. */
export function polarizationRampColor(ramp: number): string {
  const k = rampStep(ramp);
  const light = spectrumTraceColorAlongGradient(
    SPECTRUM_TRACE_GRADIENT_LIGHT,
    k,
    RAMP_STEPS,
  );
  const dark = spectrumTraceColorAlongGradient(
    SPECTRUM_TRACE_GRADIENT_DARK,
    k,
    RAMP_STEPS,
  );
  return `light-dark(${light}, ${dark})`;
}
