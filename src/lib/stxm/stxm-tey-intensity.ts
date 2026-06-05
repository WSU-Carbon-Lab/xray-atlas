/**
 * TEY experiment inference and optional drain-current extraction from STXM `.hdr` text.
 * The reference Python `stxm.io` module does not yet expose a dedicated Ie column; this
 * module parses optional monitor axes when present and gates Ie availability on TEY context.
 */

const HDR_TYPE_PATTERN = /Type\s*=\s*"([^"]*)"/i;
const TEY_FILENAME_PATTERN = /(?:^|[_\-\s])TEY(?:[_\-\s]|$)/i;

/**
 * Returns true when the scan filename or header type suggests total-electron-yield acquisition.
 */
export function inferStxmTeyExperiment(
  hdrText: string,
  fileName?: string,
): boolean {
  if (fileName && TEY_FILENAME_PATTERN.test(fileName)) {
    return true;
  }
  const typeMatch = HDR_TYPE_PATTERN.exec(hdrText);
  const scanType = typeMatch?.[1]?.toLowerCase() ?? "";
  return scanType.includes("tey") || scanType.includes("total electron");
}

const MONITOR_AXIS_PATTERN =
  /(?:Monitor|Drain|Counter)\s*Axis\s*=\s*\{[^}]*Points\s*=\s*\(\s*\d+\s*,\s*([\d\s.,\-eE+]+)\)/is;

/**
 * Parses an optional monitor/drain axis point list from `.hdr` text when the beamline writes one.
 * Returns null when no recognizable monitor axis is present.
 */
export function parseTeyDrainSeriesFromHdr(
  hdrText: string,
): number[] | null {
  const match = MONITOR_AXIS_PATTERN.exec(hdrText);
  if (!match?.[1]) {
    return null;
  }
  const tokens = match[1].replace(/,/g, " ").trim().split(/\s+/);
  const values = tokens
    .filter((token) => token.length > 0)
    .map((token) => Number.parseFloat(token));
  if (values.length === 0 || values.some((value) => !Number.isFinite(value))) {
    return null;
  }
  return values;
}

/**
 * Returns true when Ie can be plotted: TEY context and a drain/monitor series aligned to energy.
 */
export function stxmIeChannelAvailable(
  hdrText: string,
  fileName: string | undefined,
  energyCount: number,
  drainSeries: number[] | null | undefined,
): boolean {
  if (!inferStxmTeyExperiment(hdrText, fileName)) {
    return false;
  }
  if (drainSeries == null || drainSeries.length === 0) {
    return false;
  }
  return drainSeries.length === energyCount;
}
