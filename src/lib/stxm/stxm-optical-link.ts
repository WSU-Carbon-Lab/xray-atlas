import type { OpticalLinkPlotConfig } from "~/components/plots/hooks/useLinkedOpticalTraces";
import type { SpectrumPoint } from "~/components/plots/types";
import type {
  NexafsImaginaryChannelId,
  NexafsRealChannelId,
} from "~/features/process-nexafs/nexafs-plot-channels";
import type { StxmIngestionPlotChannel } from "./stxm-ingestion-display";

export const STXM_IMAGINARY_REAL_LINK_ID = "stxm-imaginary-real-link";

const IMAGINARY_CHANNELS = new Set<StxmIngestionPlotChannel>([
  "beta",
  "f2",
  "im-epsilon",
  "im-chi",
]);
const REAL_CHANNELS = new Set<StxmIngestionPlotChannel>([
  "delta",
  "f1",
  "re-epsilon",
  "re-chi",
]);

export const STXM_LINKED_IMAGINARY_TO_REAL: Partial<
  Record<StxmIngestionPlotChannel, StxmIngestionPlotChannel>
> = {
  beta: "delta",
  f2: "f1",
  "im-epsilon": "re-epsilon",
  "im-chi": "re-chi",
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

function stxmImaginaryRoleForLink(
  channel: StxmIngestionPlotChannel,
): NexafsImaginaryChannelId | null {
  if (channel === "beta") {
    return "beta";
  }
  if (channel === "f2") {
    return "f2";
  }
  if (channel === "im-epsilon") {
    return "im-epsilon";
  }
  if (channel === "im-chi") {
    return "im-chi";
  }
  return null;
}

function stxmRealRoleForLink(
  channel: StxmIngestionPlotChannel,
): NexafsRealChannelId | null {
  if (channel === "delta") {
    return "delta";
  }
  if (channel === "f1") {
    return "f1";
  }
  if (channel === "re-epsilon") {
    return "re-epsilon";
  }
  if (channel === "re-chi") {
    return "re-chi";
  }
  return null;
}

export type BuildStxmOpticalLinkPlotConfigParams = {
  readonly linkImaginaryReal: boolean;
  readonly activeChannel: StxmIngestionPlotChannel;
  readonly companionPoints: readonly SpectrumPoint[];
  readonly imaginaryGlyph: string;
  readonly realGlyph: string;
};

/**
 * Builds an {@link OpticalLinkPlotConfig} for STXM optical pairs when linking is on.
 */
export function buildStxmOpticalLinkPlotConfig(
  params: BuildStxmOpticalLinkPlotConfigParams,
): OpticalLinkPlotConfig | null {
  const {
    linkImaginaryReal,
    activeChannel,
    companionPoints,
    imaginaryGlyph,
    realGlyph,
  } = params;
  if (!linkImaginaryReal || companionPoints.length === 0) {
    return null;
  }
  const companionChannel = resolveStxmLinkedCompanionChannel(
    activeChannel,
    true,
  );
  if (companionChannel == null) {
    return null;
  }
  const imaginaryRole =
    stxmImaginaryRoleForLink(activeChannel) ??
    stxmImaginaryRoleForLink(companionChannel);
  const realRole =
    stxmRealRoleForLink(activeChannel) ??
    stxmRealRoleForLink(companionChannel);
  if (imaginaryRole == null || realRole == null) {
    return null;
  }
  const primaryRole = isStxmImaginaryChannel(activeChannel)
    ? imaginaryRole
    : realRole;
  return {
    primaryRole,
    imaginaryRole,
    realRole,
    imaginaryGlyph,
    realGlyph,
    companionPoints,
  };
}
