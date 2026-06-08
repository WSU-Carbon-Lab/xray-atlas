import type { SpectrumYAxisQuantity } from "./types";

/**
 * Raw detector signal channels shared across STXM ingestion and future NEXAFS raw views.
 */
export type SpectrumRawSignalChannelId = "i0" | "it" | "ie" | "sample" | "inv-i0";

/**
 * Edge-normalized spectroscopy channels (OD family and mass absorption).
 */
export type SpectrumSpectroscopyChannelId =
  | "od"
  | "norm-od"
  | "mass-abs"
  | "bare-atom";

/** Imaginary optical-constant channels. */
export type SpectrumImaginaryChannelId =
  | "beta"
  | "f2"
  | "im-epsilon"
  | "im-chi";

/** Real optical-constant channels. */
export type SpectrumRealChannelId =
  | "delta"
  | "f1"
  | "re-epsilon"
  | "re-chi";

/**
 * Canonical Y-channel identifiers for spectrum plot data rails (STXM ingestion today;
 * NEXAFS browse can adopt overlapping ids such as `mass-abs` alongside legacy tray ids).
 */
export type SpectrumYChannelId =
  | SpectrumRawSignalChannelId
  | SpectrumSpectroscopyChannelId
  | SpectrumImaginaryChannelId
  | SpectrumRealChannelId;

/** Tray grouping for vertical spectrum Y-channel rails. */
export type SpectrumYChannelTrayId =
  | "signal"
  | "spectroscopy"
  | "imaginary"
  | "real";

export type SpectrumYChannelDefinition = {
  readonly id: SpectrumYChannelId;
  readonly trayId: SpectrumYChannelTrayId;
  readonly label: string;
  readonly glyph: string;
  readonly description: string;
  readonly yAxisQuantity: SpectrumYAxisQuantity;
};
