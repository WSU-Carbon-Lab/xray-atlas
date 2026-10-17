/**
 * Adapter from a normalized polarization position to the repo's grey-to-red
 * spectrum trace gradient. Does not define a palette of its own.
 */
import {
  SPECTRUM_TRACE_GRADIENT,
  spectrumTraceColorAlongGradient,
} from "~/components/plots/constants";

const RAMP_STEPS = 256;

/** Color at `ramp` in [0, 1] (0 = lowest theta, 1 = highest) on the shared grey-to-red gradient; out-of-range input is clamped. */
export function polarizationRampColor(ramp: number): string {
  const r = Math.max(0, Math.min(1, ramp));
  return spectrumTraceColorAlongGradient(
    SPECTRUM_TRACE_GRADIENT,
    Math.round(r * (RAMP_STEPS - 1)),
    RAMP_STEPS,
  );
}
