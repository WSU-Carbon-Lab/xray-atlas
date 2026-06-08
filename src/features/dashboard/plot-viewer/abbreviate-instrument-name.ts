/**
 * Shortens instrument display names for compact plot-viewer legend columns.
 */

/**
 * Strips a case-insensitive leading `Beamline ` prefix and trims whitespace so
 * catalog names like `Beamline 5.3.2.2` render as `5.3.2.2` in legend cells.
 */
export function abbreviateInstrumentName(name: string): string {
  return name.replace(/^beamline\s+/i, "").trim();
}
