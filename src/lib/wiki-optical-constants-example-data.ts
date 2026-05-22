import "server-only";

import type { SpectrumPoint } from "~/components/plots/types";
import {
  fetchWikiOpticalConstantsShowcase,
  type WikiOpticalConstantsShowcaseCaption,
  type WikiOpticalConstantsShowcasePayload,
  type WikiOpticalConstantsShowcaseResult,
} from "~/server/nexafs/wikiOpticalConstantsShowcase";

export type WikiOpticalConstantsExampleCaption = WikiOpticalConstantsShowcaseCaption;

export interface WikiOpticalConstantsExamplePayload {
  readonly caption: WikiOpticalConstantsExampleCaption;
  readonly spectrumPoints: SpectrumPoint[];
}

export type WikiOpticalConstantsExampleResult = WikiOpticalConstantsShowcaseResult;

/**
 * Loads the wiki optical-constants interactive example from the fixed browse showcase experiment (server-only).
 */
export async function loadWikiOpticalConstantsExample(): Promise<WikiOpticalConstantsExampleResult> {
  return fetchWikiOpticalConstantsShowcase();
}
