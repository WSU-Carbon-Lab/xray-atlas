/**
 * Parses incident polarization angle (θ, degrees) from STXM `.hdr` text when present.
 *
 * Scans common beamline header keys (`Polarization`, `Sample Polar`, `Incident Angle`, and
 * `Comment` tokens such as `theta=55`) and returns the first finite value found.
 */
export function parseIncidentThetaDegFromHdrText(hdrText: string): number | undefined {
  const patterns = [
    /Polarization\s*=\s*\{\s*Value\s*=\s*\(\s*([-\d.]+)/i,
    /Sample\s+Polar(?:ization)?\s*=\s*\(?\s*([-\d.]+)/i,
    /Incident\s+Angle\s*=\s*\(?\s*([-\d.]+)/i,
    /Polar\s+Angle\s*=\s*\(?\s*([-\d.]+)/i,
    /(?:^|\s)theta\s*=\s*([-\d.]+)/i,
    /(?:^|\s)θ\s*=\s*([-\d.]+)/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(hdrText);
    if (!match?.[1]) {
      continue;
    }
    const value = Number.parseFloat(match[1]);
    if (Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

/**
 * Parses incident θ from a scan basename when encoded as `th55`, `theta55`, or `55deg` tokens.
 */
export function parseIncidentThetaDegFromScanLabel(scanLabel: string): number | undefined {
  const trimmed = scanLabel.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const explicitPatterns = [
    /(?:^|[_\s-])th(?:eta)?[_-]?(\d+(?:\.\d+)?)(?:[_\s-]|$)/i,
    /\b(\d+(?:\.\d+)?)\s*deg\b/i,
    /(?:^|[_\s-])pol[_-]?(\d+(?:\.\d+)?)(?:[_\s-]|$)/i,
  ];

  for (const pattern of explicitPatterns) {
    const match = pattern.exec(trimmed);
    if (!match?.[1]) {
      continue;
    }
    const value = Number.parseFloat(match[1]);
    if (Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

/**
 * Resolves incident θ for preview compare from hdr text and/or scan label, preferring hdr.
 */
export function resolveIncidentThetaDegForScan(input: {
  hdrText?: string | null;
  scanLabel?: string | null;
}): number | undefined {
  const fromHdr =
    input.hdrText != null && input.hdrText.length > 0
      ? parseIncidentThetaDegFromHdrText(input.hdrText)
      : undefined;
  if (fromHdr != null) {
    return fromHdr;
  }
  if (input.scanLabel != null && input.scanLabel.length > 0) {
    return parseIncidentThetaDegFromScanLabel(input.scanLabel);
  }
  return undefined;
}
