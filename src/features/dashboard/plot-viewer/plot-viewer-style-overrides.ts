import { hexSixSchema } from "~/lib/hex-color-presets";
import { readPlotViewerColorOverrides } from "./plot-viewer-color-overrides";
import type {
  PlotViewerLineDash,
  PlotViewerMarkerSymbol,
} from "./plot-viewer-trace-styles";

const STORAGE_KEY = "xray-atlas-plot-viewer-style-overrides:v2";
const LEGACY_STORAGE_KEY = "xray-atlas-plot-viewer-style-overrides:v1";

/** SessionStorage key for STXM preview compare style overrides (separate from plot viewer). */
export const STXM_PREVIEW_STYLE_STORAGE_KEY =
  "xray-atlas-stxm-preview-style-overrides:v1";

export type PlotViewerExperimentColorMode = "scheme" | "fixed";

export type PlotViewerTraceStyleOverride = {
  color?: string;
  lineDash?: PlotViewerLineDash;
  lineWidth?: number;
  marker?: PlotViewerMarkerSymbol;
  markerEvery?: number;
  markerSize?: number;
};

export type PlotViewerStyleOverrides = {
  lineDash: Record<string, PlotViewerLineDash>;
  marker: Record<string, PlotViewerMarkerSymbol>;
  experimentLineDash: Record<string, PlotViewerLineDash>;
  experimentLineWidth: Record<string, number>;
  experimentMarker: Record<string, PlotViewerMarkerSymbol>;
  experimentMarkerSize: Record<string, number>;
  experimentMarkerEvery: Record<string, number>;
  experimentColorMode: Record<string, PlotViewerExperimentColorMode>;
  experimentFixedColor: Record<string, string>;
  traceOverrides: Record<string, PlotViewerTraceStyleOverride>;
};

function emptyOverrides(): PlotViewerStyleOverrides {
  return {
    lineDash: {},
    marker: {},
    experimentLineDash: {},
    experimentLineWidth: {},
    experimentMarker: {},
    experimentMarkerSize: {},
    experimentMarkerEvery: {},
    experimentColorMode: {},
    experimentFixedColor: {},
    traceOverrides: {},
  };
}

function parseLineDash(value: unknown): PlotViewerLineDash | null {
  if (
    value === "solid" ||
    value === "dash" ||
    value === "dot" ||
    value === "dashdot"
  ) {
    return value;
  }
  return null;
}

function parseMarkerSymbol(value: unknown): PlotViewerMarkerSymbol | null {
  if (
    value === "none" ||
    value === "circle" ||
    value === "square" ||
    value === "triangle" ||
    value === "diamond"
  ) {
    return value;
  }
  return null;
}

function parseColorMode(value: unknown): PlotViewerExperimentColorMode | null {
  if (value === "scheme" || value === "fixed") {
    return value;
  }
  return null;
}

function parsePositiveNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

function parseLineWidth(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  if (value < 0.5 || value > 4) {
    return null;
  }
  return value;
}

function parseNumberRecord(
  raw: unknown,
  parse: (value: unknown) => number | null,
): Record<string, number> {
  const record = parseRecordObject(raw);
  const result: Record<string, number> = {};
  if (!record) {
    return result;
  }
  for (const [key, value] of Object.entries(record)) {
    const parsed = parse(value);
    if (parsed != null) {
      result[key] = parsed;
    }
  }
  return result;
}

function parsePlotViewerHexColor(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const parsed = hexSixSchema.safeParse(value.trim());
  if (!parsed.success) {
    return null;
  }
  return parsed.data.toUpperCase();
}

function parseTraceOverride(value: unknown): PlotViewerTraceStyleOverride | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const override: PlotViewerTraceStyleOverride = {};
  const color = parsePlotViewerHexColor(record.color);
  if (color) {
    override.color = color;
  }
  const lineDash = parseLineDash(record.lineDash);
  if (lineDash) {
    override.lineDash = lineDash;
  }
  const lineWidth = parseLineWidth(record.lineWidth);
  if (lineWidth != null) {
    override.lineWidth = lineWidth;
  }
  const marker = parseMarkerSymbol(record.marker);
  if (marker) {
    override.marker = marker;
  }
  const markerEvery = parsePositiveNumber(record.markerEvery);
  if (markerEvery != null) {
    override.markerEvery = Math.round(markerEvery);
  }
  const markerSize = parsePositiveNumber(record.markerSize);
  if (markerSize != null) {
    override.markerSize = markerSize;
  }
  return Object.keys(override).length > 0 ? override : null;
}

function parseRecordObject(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  return raw as Record<string, unknown>;
}

function parseLineDashRecord(raw: unknown): Record<string, PlotViewerLineDash> {
  const record = parseRecordObject(raw);
  const result: Record<string, PlotViewerLineDash> = {};
  if (!record) {
    return result;
  }
  for (const [key, value] of Object.entries(record)) {
    const dash = parseLineDash(value);
    if (dash) {
      result[key] = dash;
    }
  }
  return result;
}

function parseMarkerRecord(
  raw: unknown,
): Record<string, PlotViewerMarkerSymbol> {
  const record = parseRecordObject(raw);
  const result: Record<string, PlotViewerMarkerSymbol> = {};
  if (!record) {
    return result;
  }
  for (const [key, value] of Object.entries(record)) {
    const symbol = parseMarkerSymbol(value);
    if (symbol) {
      result[key] = symbol;
    }
  }
  return result;
}

function parseColorModeRecord(
  raw: unknown,
): Record<string, PlotViewerExperimentColorMode> {
  const record = parseRecordObject(raw);
  const result: Record<string, PlotViewerExperimentColorMode> = {};
  if (!record) {
    return result;
  }
  for (const [key, value] of Object.entries(record)) {
    const mode = parseColorMode(value);
    if (mode) {
      result[key] = mode;
    }
  }
  return result;
}

function parseColorRecord(raw: unknown): Record<string, string> {
  const record = parseRecordObject(raw);
  const result: Record<string, string> = {};
  if (!record) {
    return result;
  }
  for (const [key, value] of Object.entries(record)) {
    const color = parsePlotViewerHexColor(value);
    if (color) {
      result[key] = color;
    }
  }
  return result;
}

function parseTraceOverrideRecord(
  raw: unknown,
): Record<string, PlotViewerTraceStyleOverride> {
  const record = parseRecordObject(raw);
  const result: Record<string, PlotViewerTraceStyleOverride> = {};
  if (!record) {
    return result;
  }
  for (const [key, value] of Object.entries(record)) {
    const parsed = parseTraceOverride(value);
    if (parsed) {
      result[key] = parsed;
    }
  }
  return result;
}

function mergeLegacyColorOverrides(
  overrides: PlotViewerStyleOverrides,
): PlotViewerStyleOverrides {
  const legacyColors = readPlotViewerColorOverrides();
  for (const [experimentId, color] of Object.entries(legacyColors)) {
    overrides.experimentColorMode[experimentId] ??= "fixed";
    overrides.experimentFixedColor[experimentId] ??= color;
  }
  return overrides;
}

function parseStoredOverrides(parsed: Record<string, unknown>): PlotViewerStyleOverrides {
  return mergeLegacyColorOverrides({
    lineDash: parseLineDashRecord(parsed.lineDash),
    marker: parseMarkerRecord(parsed.marker),
    experimentLineDash: parseLineDashRecord(parsed.experimentLineDash),
    experimentLineWidth: parseNumberRecord(parsed.experimentLineWidth, parseLineWidth),
    experimentMarker: parseMarkerRecord(parsed.experimentMarker),
    experimentMarkerSize: parseNumberRecord(parsed.experimentMarkerSize, parsePositiveNumber),
    experimentMarkerEvery: parseNumberRecord(
      parsed.experimentMarkerEvery,
      parsePositiveNumber,
    ),
    experimentColorMode: parseColorModeRecord(parsed.experimentColorMode),
    experimentFixedColor: parseColorRecord(parsed.experimentFixedColor),
    traceOverrides: parseTraceOverrideRecord(parsed.traceOverrides),
  });
}

function readOverridesForStorageKey(
  storageKey: string,
  legacyKeys: readonly string[] = [],
  mergeLegacyColors = false,
): PlotViewerStyleOverrides {
  if (typeof window === "undefined") {
    return emptyOverrides();
  }
  try {
    const raw =
      sessionStorage.getItem(storageKey) ??
      legacyKeys.map((key) => sessionStorage.getItem(key)).find(Boolean);
    if (!raw) {
      const base = emptyOverrides();
      return mergeLegacyColors ? mergeLegacyColorOverrides(base) : base;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      const base = emptyOverrides();
      return mergeLegacyColors ? mergeLegacyColorOverrides(base) : base;
    }
    const overrides = parseStoredOverrides(parsed as Record<string, unknown>);
    return mergeLegacyColors ? mergeLegacyColorOverrides(overrides) : overrides;
  } catch {
    const base = emptyOverrides();
    return mergeLegacyColors ? mergeLegacyColorOverrides(base) : base;
  }
}

function persistOverridesForStorageKey(
  storageKey: string,
  overrides: PlotViewerStyleOverrides,
): PlotViewerStyleOverrides {
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(overrides));
    } catch {
      return overrides;
    }
  }
  return overrides;
}

/**
 * Reads per-field, per-experiment, and per-trace style overrides from sessionStorage.
 */
export function readPlotViewerStyleOverrides(): PlotViewerStyleOverrides {
  return readOverridesForStorageKey(STORAGE_KEY, [LEGACY_STORAGE_KEY], true);
}

/**
 * Reads STXM preview compare style overrides from a dedicated sessionStorage namespace.
 */
export function readStxmPreviewStyleOverrides(): PlotViewerStyleOverrides {
  return readOverridesForStorageKey(STXM_PREVIEW_STYLE_STORAGE_KEY);
}

function persistOverrides(overrides: PlotViewerStyleOverrides): PlotViewerStyleOverrides {
  return persistOverridesForStorageKey(STORAGE_KEY, overrides);
}

function persistStxmPreviewOverrides(
  overrides: PlotViewerStyleOverrides,
): PlotViewerStyleOverrides {
  return persistOverridesForStorageKey(STXM_PREVIEW_STYLE_STORAGE_KEY, overrides);
}

function readStxmPreviewOverridesMutable(): PlotViewerStyleOverrides {
  return readStxmPreviewStyleOverrides();
}

/**
 * Persists or clears one line-dash override keyed by the encoded field value.
 */
export function writePlotViewerLineDashOverride(
  fieldValue: string,
  lineDash: PlotViewerLineDash | null,
): PlotViewerStyleOverrides {
  const current = readPlotViewerStyleOverrides();
  const key = fieldValue.trim();
  if (lineDash == null || key.length === 0) {
    delete current.lineDash[key];
  } else {
    current.lineDash[key] = lineDash;
  }
  return persistOverrides(current);
}

/**
 * Persists or clears one marker override keyed by the encoded field value.
 */
export function writePlotViewerMarkerOverride(
  fieldValue: string,
  markerSymbol: PlotViewerMarkerSymbol | null,
): PlotViewerStyleOverrides {
  const current = readPlotViewerStyleOverrides();
  const key = fieldValue.trim();
  if (markerSymbol == null || key.length === 0) {
    delete current.marker[key];
  } else {
    current.marker[key] = markerSymbol;
  }
  return persistOverrides(current);
}

/**
 * Persists or clears one per-experiment line-dash override keyed by experiment id.
 */
export function writePlotViewerExperimentLineDashOverride(
  experimentId: string,
  lineDash: PlotViewerLineDash | null,
): PlotViewerStyleOverrides {
  const current = readPlotViewerStyleOverrides();
  const key = experimentId.trim();
  if (lineDash == null || key.length === 0) {
    delete current.experimentLineDash[key];
  } else {
    current.experimentLineDash[key] = lineDash;
  }
  return persistOverrides(current);
}

/**
 * Persists or clears one per-experiment marker override keyed by experiment id.
 */
export function writePlotViewerExperimentMarkerOverride(
  experimentId: string,
  markerSymbol: PlotViewerMarkerSymbol | null,
): PlotViewerStyleOverrides {
  const current = readPlotViewerStyleOverrides();
  const key = experimentId.trim();
  if (markerSymbol == null || key.length === 0) {
    delete current.experimentMarker[key];
  } else {
    current.experimentMarker[key] = markerSymbol;
  }
  return persistOverrides(current);
}

/**
 * Persists or clears one per-experiment line width override keyed by experiment id.
 */
export function writePlotViewerExperimentLineWidthOverride(
  experimentId: string,
  lineWidth: number | null,
): PlotViewerStyleOverrides {
  const current = readPlotViewerStyleOverrides();
  const key = experimentId.trim();
  if (lineWidth == null || key.length === 0) {
    delete current.experimentLineWidth[key];
  } else {
    current.experimentLineWidth[key] = lineWidth;
  }
  return persistOverrides(current);
}

/**
 * Persists or clears one per-experiment marker size override keyed by experiment id.
 */
export function writePlotViewerExperimentMarkerSizeOverride(
  experimentId: string,
  markerSize: number | null,
): PlotViewerStyleOverrides {
  const current = readPlotViewerStyleOverrides();
  const key = experimentId.trim();
  if (markerSize == null || key.length === 0) {
    delete current.experimentMarkerSize[key];
  } else {
    current.experimentMarkerSize[key] = markerSize;
  }
  return persistOverrides(current);
}

/**
 * Persists or clears one per-experiment marker-every override keyed by experiment id.
 */
export function writePlotViewerExperimentMarkerEveryOverride(
  experimentId: string,
  markerEvery: number | null,
): PlotViewerStyleOverrides {
  const current = readPlotViewerStyleOverrides();
  const key = experimentId.trim();
  if (markerEvery == null || key.length === 0) {
    delete current.experimentMarkerEvery[key];
  } else {
    current.experimentMarkerEvery[key] = Math.max(1, Math.round(markerEvery));
  }
  return persistOverrides(current);
}

/**
 * Persists per-experiment color mode and optional fixed color for the plot viewer.
 */
export function writePlotViewerExperimentColorMode(
  experimentId: string,
  mode: PlotViewerExperimentColorMode,
  fixedColor: string | null,
): PlotViewerStyleOverrides {
  const current = readPlotViewerStyleOverrides();
  const key = experimentId.trim();
  if (key.length === 0) {
    return current;
  }
  current.experimentColorMode[key] = mode;
  if (mode === "fixed" && fixedColor != null) {
    const color = parsePlotViewerHexColor(fixedColor);
    if (color) {
      current.experimentFixedColor[key] = color;
    } else {
      delete current.experimentFixedColor[key];
    }
  } else {
    delete current.experimentFixedColor[key];
  }
  return persistOverrides(current);
}

function mergeTraceOverride(
  current: PlotViewerTraceStyleOverride | undefined,
  patch: Partial<PlotViewerTraceStyleOverride>,
  clearKeys: readonly (keyof PlotViewerTraceStyleOverride)[],
): PlotViewerTraceStyleOverride | null {
  const next: PlotViewerTraceStyleOverride = { ...(current ?? {}) };
  for (const clearKey of clearKeys) {
    delete next[clearKey];
  }
  if (patch.color != null) {
    const color = parsePlotViewerHexColor(patch.color);
    if (color) {
      next.color = color;
    } else {
      delete next.color;
    }
  }
  if (patch.lineDash != null) {
    next.lineDash = patch.lineDash;
  }
  if (patch.lineWidth != null) {
    next.lineWidth = patch.lineWidth;
  }
  if (patch.marker != null) {
    next.marker = patch.marker;
  }
  if (patch.markerEvery != null) {
    next.markerEvery = patch.markerEvery;
  }
  if (patch.markerSize != null) {
    next.markerSize = patch.markerSize;
  }
  return Object.keys(next).length > 0 ? next : null;
}

/**
 * Persists or clears one per-trace style override keyed by trace id.
 */
export function writePlotViewerTraceStyleOverride(
  traceKey: string,
  patch: Partial<PlotViewerTraceStyleOverride>,
  clearKeys: readonly (keyof PlotViewerTraceStyleOverride)[] = [],
): PlotViewerStyleOverrides {
  const current = readPlotViewerStyleOverrides();
  const key = traceKey.trim();
  if (key.length === 0) {
    return current;
  }
  const merged = mergeTraceOverride(current.traceOverrides[key], patch, clearKeys);
  if (merged == null) {
    delete current.traceOverrides[key];
  } else {
    current.traceOverrides[key] = merged;
  }
  return persistOverrides(current);
}

function writeStyleOverrideForStorageKey(
  storageKey: string,
  readCurrent: () => PlotViewerStyleOverrides,
  persistCurrent: (overrides: PlotViewerStyleOverrides) => PlotViewerStyleOverrides,
  mutate: (current: PlotViewerStyleOverrides) => void,
): PlotViewerStyleOverrides {
  const current = readCurrent();
  mutate(current);
  return persistCurrent(current);
}

/**
 * Persists or clears one STXM preview line-dash override keyed by the encoded field value.
 */
export function writeStxmPreviewLineDashOverride(
  fieldValue: string,
  lineDash: PlotViewerLineDash | null,
): PlotViewerStyleOverrides {
  return writeStyleOverrideForStorageKey(
    STXM_PREVIEW_STYLE_STORAGE_KEY,
    readStxmPreviewOverridesMutable,
    persistStxmPreviewOverrides,
    (current) => {
      const key = fieldValue.trim();
      if (lineDash == null || key.length === 0) {
        delete current.lineDash[key];
      } else {
        current.lineDash[key] = lineDash;
      }
    },
  );
}

/**
 * Persists or clears one STXM preview marker override keyed by the encoded field value.
 */
export function writeStxmPreviewMarkerOverride(
  fieldValue: string,
  markerSymbol: PlotViewerMarkerSymbol | null,
): PlotViewerStyleOverrides {
  return writeStyleOverrideForStorageKey(
    STXM_PREVIEW_STYLE_STORAGE_KEY,
    readStxmPreviewOverridesMutable,
    persistStxmPreviewOverrides,
    (current) => {
      const key = fieldValue.trim();
      if (markerSymbol == null || key.length === 0) {
        delete current.marker[key];
      } else {
        current.marker[key] = markerSymbol;
      }
    },
  );
}

/**
 * Persists or clears one STXM preview per-experiment line-dash override.
 */
export function writeStxmPreviewExperimentLineDashOverride(
  experimentId: string,
  lineDash: PlotViewerLineDash | null,
): PlotViewerStyleOverrides {
  return writeStyleOverrideForStorageKey(
    STXM_PREVIEW_STYLE_STORAGE_KEY,
    readStxmPreviewOverridesMutable,
    persistStxmPreviewOverrides,
    (current) => {
      const key = experimentId.trim();
      if (lineDash == null || key.length === 0) {
        delete current.experimentLineDash[key];
      } else {
        current.experimentLineDash[key] = lineDash;
      }
    },
  );
}

/**
 * Persists or clears one STXM preview per-experiment marker override.
 */
export function writeStxmPreviewExperimentMarkerOverride(
  experimentId: string,
  markerSymbol: PlotViewerMarkerSymbol | null,
): PlotViewerStyleOverrides {
  return writeStyleOverrideForStorageKey(
    STXM_PREVIEW_STYLE_STORAGE_KEY,
    readStxmPreviewOverridesMutable,
    persistStxmPreviewOverrides,
    (current) => {
      const key = experimentId.trim();
      if (markerSymbol == null || key.length === 0) {
        delete current.experimentMarker[key];
      } else {
        current.experimentMarker[key] = markerSymbol;
      }
    },
  );
}

/**
 * Persists or clears one STXM preview per-experiment line width override.
 */
export function writeStxmPreviewExperimentLineWidthOverride(
  experimentId: string,
  lineWidth: number | null,
): PlotViewerStyleOverrides {
  return writeStyleOverrideForStorageKey(
    STXM_PREVIEW_STYLE_STORAGE_KEY,
    readStxmPreviewOverridesMutable,
    persistStxmPreviewOverrides,
    (current) => {
      const key = experimentId.trim();
      if (lineWidth == null || key.length === 0) {
        delete current.experimentLineWidth[key];
      } else {
        current.experimentLineWidth[key] = lineWidth;
      }
    },
  );
}

/**
 * Persists or clears one STXM preview per-experiment marker size override.
 */
export function writeStxmPreviewExperimentMarkerSizeOverride(
  experimentId: string,
  markerSize: number | null,
): PlotViewerStyleOverrides {
  return writeStyleOverrideForStorageKey(
    STXM_PREVIEW_STYLE_STORAGE_KEY,
    readStxmPreviewOverridesMutable,
    persistStxmPreviewOverrides,
    (current) => {
      const key = experimentId.trim();
      if (markerSize == null || key.length === 0) {
        delete current.experimentMarkerSize[key];
      } else {
        current.experimentMarkerSize[key] = markerSize;
      }
    },
  );
}

/**
 * Persists or clears one STXM preview per-experiment marker-every override.
 */
export function writeStxmPreviewExperimentMarkerEveryOverride(
  experimentId: string,
  markerEvery: number | null,
): PlotViewerStyleOverrides {
  return writeStyleOverrideForStorageKey(
    STXM_PREVIEW_STYLE_STORAGE_KEY,
    readStxmPreviewOverridesMutable,
    persistStxmPreviewOverrides,
    (current) => {
      const key = experimentId.trim();
      if (markerEvery == null || key.length === 0) {
        delete current.experimentMarkerEvery[key];
      } else {
        current.experimentMarkerEvery[key] = Math.max(1, Math.round(markerEvery));
      }
    },
  );
}

/**
 * Persists per-experiment color mode for STXM preview compare styling.
 */
export function writeStxmPreviewExperimentColorMode(
  experimentId: string,
  mode: PlotViewerExperimentColorMode,
  fixedColor: string | null,
): PlotViewerStyleOverrides {
  return writeStyleOverrideForStorageKey(
    STXM_PREVIEW_STYLE_STORAGE_KEY,
    readStxmPreviewOverridesMutable,
    persistStxmPreviewOverrides,
    (current) => {
      const key = experimentId.trim();
      if (key.length === 0) {
        return;
      }
      current.experimentColorMode[key] = mode;
      if (mode === "fixed" && fixedColor != null && fixedColor.trim().length > 0) {
        current.experimentFixedColor[key] = fixedColor.trim();
      } else {
        delete current.experimentFixedColor[key];
      }
    },
  );
}

/**
 * Persists or clears one STXM preview per-trace style override keyed by trace id.
 */
export function writeStxmPreviewTraceStyleOverride(
  traceKey: string,
  patch: Partial<PlotViewerTraceStyleOverride>,
  clearKeys: readonly (keyof PlotViewerTraceStyleOverride)[] = [],
): PlotViewerStyleOverrides {
  return writeStyleOverrideForStorageKey(
    STXM_PREVIEW_STYLE_STORAGE_KEY,
    readStxmPreviewOverridesMutable,
    persistStxmPreviewOverrides,
    (current) => {
      const key = traceKey.trim();
      if (key.length === 0) {
        return;
      }
      const merged = mergeTraceOverride(
        current.traceOverrides[key],
        patch,
        clearKeys,
      );
      if (merged == null) {
        delete current.traceOverrides[key];
      } else {
        current.traceOverrides[key] = merged;
      }
    },
  );
}
