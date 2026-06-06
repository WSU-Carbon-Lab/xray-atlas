import {
  isStxmDerivedOpticalPlotChannel,
  ingestionChannelUsesRawIntensity,
  type StxmIngestionPlotChannel,
} from "./stxm-ingestion-display";

/** High-level inputs required to classify whether an STXM plot channel can render. */
export type StxmChannelAvailabilityContext = {
  channel: StxmIngestionPlotChannel;
  hasRawSpectra: boolean;
  hasIzeroRegion: boolean;
  hasSampleRegions: boolean;
  hasReducedResult: boolean;
  hasLinkedMolecule: boolean;
  hasFormula: boolean;
  hasBetaDelta: boolean;
  derivedOpticalAvailable: boolean;
  hasIeData: boolean;
  isTeyExperiment: boolean;
};

/** Requirement tier for an STXM plot channel (raw, normalization, formula, or derived optical). */
export type StxmChannelRequirementKind =
  | "raw"
  | "normalization"
  | "formula"
  | "kk"
  | "derived-optical";

/**
 * Classifies the primary prerequisite tier for rendering a plot channel.
 *
 * @param channel Active STXM ingestion plot channel id.
 * @returns Requirement kind used for rail hints and plot empty states.
 */
export function stxmChannelRequirementKind(
  channel: StxmIngestionPlotChannel,
): StxmChannelRequirementKind {
  if (ingestionChannelUsesRawIntensity(channel)) {
    return "raw";
  }
  if (channel === "od") {
    return "raw";
  }
  if (channel === "od_normalized") {
    return "normalization";
  }
  if (channel === "mass_absorption" || channel === "bare_atom") {
    return "formula";
  }
  if (channel === "beta") {
    return "normalization";
  }
  if (channel === "delta") {
    return "kk";
  }
  if (isStxmDerivedOpticalPlotChannel(channel)) {
    return "derived-optical";
  }
  return "normalization";
}

/**
 * Reports whether paired beta and delta arrays exist on the reduced ingestion state.
 *
 * @param energyEv Energy samples shared by beta and delta arrays.
 * @param beta Imaginary refractive index samples, when present.
 * @param delta Real refractive decrement samples, when present.
 * @returns True when at least one finite beta/delta pair aligns with `energyEv`.
 */
export function stxmHasPairedBetaDelta(
  energyEv: readonly number[],
  beta: readonly number[] | null | undefined,
  delta: readonly number[] | null | undefined,
): boolean {
  if (!beta || !delta || energyEv.length === 0) {
    return false;
  }
  const len = Math.min(energyEv.length, beta.length, delta.length);
  for (let index = 0; index < len; index += 1) {
    const b = beta[index];
    const d = delta[index];
    if (
      typeof b === "number" &&
      Number.isFinite(b) &&
      typeof d === "number" &&
      Number.isFinite(d)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Determines whether the selected STXM plot channel can render with the current ingestion state.
 *
 * @param ctx Channel id plus region, reduction, molecule, and TEY monitor flags.
 * @returns True when the channel is allowed to be active and should produce plot points.
 */
export function canComputeStxmChannel(ctx: StxmChannelAvailabilityContext): boolean {
  const {
    channel,
    hasRawSpectra,
    hasIzeroRegion,
    hasSampleRegions,
    hasReducedResult,
    hasFormula,
    hasBetaDelta,
    derivedOpticalAvailable,
    hasIeData,
    isTeyExperiment,
  } = ctx;

  if (channel === "signal_ie") {
    return hasRawSpectra && isTeyExperiment && hasIeData;
  }
  if (ingestionChannelUsesRawIntensity(channel)) {
    return hasRawSpectra;
  }
  if (channel === "od") {
    return (
      (hasRawSpectra && hasIzeroRegion && hasSampleRegions) || hasReducedResult
    );
  }
  if (channel === "od_normalized" || channel === "beta") {
    return hasReducedResult;
  }
  if (channel === "mass_absorption" || channel === "bare_atom") {
    return hasReducedResult && hasFormula;
  }
  if (channel === "delta") {
    return hasReducedResult && hasFormula && hasBetaDelta;
  }
  if (isStxmDerivedOpticalPlotChannel(channel)) {
    return hasReducedResult && derivedOpticalAvailable;
  }
  return hasReducedResult;
}

/**
 * Builds the rail tooltip copy when a channel toggle is disabled.
 *
 * @param ctx Channel availability context for the disabled channel id.
 * @returns Human-readable reason, or undefined when the channel is available.
 */
export function describeStxmChannelUnavailableReason(
  ctx: StxmChannelAvailabilityContext,
): string | undefined {
  if (canComputeStxmChannel(ctx)) {
    return undefined;
  }

  const { channel, hasRawSpectra, hasIzeroRegion, hasSampleRegions } = ctx;

  if (channel === "signal_ie") {
    if (!ctx.isTeyExperiment) {
      return "Ie is available only for TEY experiments.";
    }
    if (!ctx.hasIeData) {
      return "No TEY drain-current monitor column in this scan header.";
    }
    return "Configure sample and izero regions to sum Ie.";
  }

  if (ingestionChannelUsesRawIntensity(channel)) {
    return "Configure sample and izero regions to sum raw intensities.";
  }

  if (channel === "od") {
    if (!hasRawSpectra) {
      return "Configure sample and izero regions to compute OD.";
    }
    if (!hasIzeroRegion || !hasSampleRegions) {
      return "Draw both an izero region and at least one sample region for OD.";
    }
    return "Run reduction or configure regions to compute OD.";
  }

  if (!ctx.hasReducedResult) {
    return "Configure sample and izero regions, then wait for spectrum reduction.";
  }

  if (
    (channel === "mass_absorption" ||
      channel === "bare_atom" ||
      channel === "delta" ||
      isStxmDerivedOpticalPlotChannel(channel)) &&
    !ctx.hasLinkedMolecule
  ) {
    return "Link an Atlas molecule with a chemical formula to unlock this view.";
  }

  if (
    (channel === "mass_absorption" ||
      channel === "bare_atom" ||
      channel === "delta" ||
      isStxmDerivedOpticalPlotChannel(channel)) &&
    ctx.hasLinkedMolecule &&
    !ctx.hasFormula
  ) {
    return "Linked molecule has no chemical formula on record.";
  }

  if (channel === "delta" && !ctx.hasBetaDelta) {
    return "Run KK reduction with beta and delta to view delta.";
  }

  if (isStxmDerivedOpticalPlotChannel(channel) && !ctx.derivedOpticalAvailable) {
    if (!ctx.hasBetaDelta) {
      return "Run KK reduction with beta and delta to unlock f, epsilon, and chi views.";
    }
    return "Link a molecule with a chemical formula to view derived optical constants.";
  }

  return "This data view is not available for the current scan.";
}

export type StxmPlotEmptyState = {
  title: string;
  detail: string;
  actionLabel?: string;
};

/**
 * Resolves plot-card empty copy when the active channel cannot render or regions are missing.
 *
 * @param ctx Channel availability context for the active plot channel.
 * @returns Structured empty-state message for the plot panel.
 */
export function resolveStxmPlotEmptyState(
  ctx: StxmChannelAvailabilityContext,
): StxmPlotEmptyState {
  if (!canComputeStxmChannel(ctx)) {
    const railReason = describeStxmChannelUnavailableReason(ctx);
    const kind = stxmChannelRequirementKind(ctx.channel);

    if (kind === "formula" || kind === "kk" || kind === "derived-optical") {
      if (!ctx.hasLinkedMolecule) {
        return {
          title: "Molecule required",
          detail:
            railReason ??
            "Link an Atlas molecule with a chemical formula to view beta, delta, mass absorption, and optical constants.",
          actionLabel: "Select molecule above",
        };
      }
      if (!ctx.hasFormula) {
        return {
          title: "Chemical formula required",
          detail:
            railReason ??
            "The linked molecule has no chemical formula on record. Choose another molecule or update its metadata in Atlas.",
          actionLabel: "Change molecule above",
        };
      }
      if (kind === "kk" || kind === "derived-optical") {
        return {
          title: "KK reduction required",
          detail:
            railReason ??
            "Run spectrum reduction with beta and delta before viewing delta and derived optical constants.",
        };
      }
      return {
        title: "Reduction required",
        detail:
          railReason ??
          "Configure regions and wait for spectrum reduction to finish.",
      };
    }

    if (kind === "raw") {
      return {
        title: "Regions required",
        detail:
          railReason ??
          "Configure sample and izero regions to compute spectra for this channel.",
      };
    }

    return {
      title: "Reduction required",
      detail:
        railReason ??
        "Configure sample and izero regions, then wait for spectrum reduction.",
    };
  }

  return {
    title: "No plot data",
    detail: "Configure sample and izero regions to compute spectra.",
  };
}

/**
 * Builds the shared availability context object used by the rail and plot panel.
 *
 * @param args Region, reduction, molecule, and spectroscopy flags for the active scan.
 * @returns Context for {@link canComputeStxmChannel} and empty-state helpers.
 */
export function buildStxmChannelAvailabilityContext(args: {
  channel: StxmIngestionPlotChannel;
  regionSpectra: readonly { isIzero?: boolean }[];
  hasReducedResult: boolean;
  hasLinkedMolecule: boolean;
  chemicalFormula: string | null | undefined;
  energyEv: readonly number[];
  beta: readonly number[] | null | undefined;
  delta: readonly number[] | null | undefined;
  derivedOpticalAvailable: boolean;
  hasIeData: boolean;
  isTeyExperiment: boolean;
}): StxmChannelAvailabilityContext {
  const trimmedFormula = args.chemicalFormula?.trim() ?? "";
  const hasFormula = trimmedFormula.length > 0;
  const hasRawSpectra = args.regionSpectra.length > 0;
  const hasIzeroRegion = args.regionSpectra.some((series) => series.isIzero);
  const hasSampleRegions = args.regionSpectra.some((series) => !series.isIzero);

  return {
    channel: args.channel,
    hasRawSpectra,
    hasIzeroRegion,
    hasSampleRegions,
    hasReducedResult: args.hasReducedResult,
    hasLinkedMolecule: args.hasLinkedMolecule,
    hasFormula,
    hasBetaDelta: stxmHasPairedBetaDelta(args.energyEv, args.beta, args.delta),
    derivedOpticalAvailable: args.derivedOpticalAvailable,
    hasIeData: args.hasIeData,
    isTeyExperiment: args.isTeyExperiment,
  };
}
