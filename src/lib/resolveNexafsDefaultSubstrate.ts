import type { ExperimentType } from "@prisma/client";
import { normalizeSampleSubstrate } from "~/lib/normalizeSampleSubstrate";

function isBeamline5322(instrumentName: string): boolean {
  return /5\.3\.2/i.test(instrumentName.trim());
}

export function resolveNexafsDefaultSubstrate(
  experimentType: ExperimentType,
  instrumentName: string,
): string | null {
  const siDefault = normalizeSampleSubstrate("Si");

  if (
    experimentType === "TOTAL_ELECTRON_YIELD" ||
    experimentType === "FLUORESCENT_YIELD" ||
    experimentType === "PARTIAL_ELECTRON_YIELD"
  ) {
    return siDefault;
  }

  if (experimentType === "TRANSMISSION") {
    if (isBeamline5322(instrumentName)) {
      return null;
    }
    return siDefault;
  }

  return null;
}
