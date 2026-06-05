import type { StxmIngestionPlotChannel } from "./stxm-ingestion-display";

export const STXM_IMAGINARY_REAL_LINK_ID = "stxm-imaginary-real-link";

const IMAGINARY_CHANNELS = new Set<StxmIngestionPlotChannel>(["beta", "chi"]);
const REAL_CHANNELS = new Set<StxmIngestionPlotChannel>(["delta", "f1"]);

export const STXM_LINKED_IMAGINARY_TO_REAL: Partial<
  Record<StxmIngestionPlotChannel, StxmIngestionPlotChannel>
> = {
  beta: "delta",
  chi: "f1",
};

const LINKED_IMAGINARY_TO_REAL = STXM_LINKED_IMAGINARY_TO_REAL;

export function isStxmImaginaryChannel(
  channel: StxmIngestionPlotChannel,
): boolean {
  return IMAGINARY_CHANNELS.has(channel);
}

export function isStxmRealChannel(channel: StxmIngestionPlotChannel): boolean {
  return REAL_CHANNELS.has(channel);
}

/**
 * Resolves the paired optical-constant channel when imaginary/real linking is enabled.
 */
export function resolveStxmLinkedCompanionChannel(
  plotChannel: StxmIngestionPlotChannel,
  linkImaginaryReal: boolean,
): StxmIngestionPlotChannel | null {
  if (!linkImaginaryReal) {
    return null;
  }
  if (isStxmImaginaryChannel(plotChannel)) {
    return LINKED_IMAGINARY_TO_REAL[plotChannel] ?? null;
  }
  if (isStxmRealChannel(plotChannel)) {
    const entry = Object.entries(LINKED_IMAGINARY_TO_REAL).find(
      ([, real]) => real === plotChannel,
    );
    return (entry?.[0] as StxmIngestionPlotChannel | undefined) ?? null;
  }
  return null;
}
