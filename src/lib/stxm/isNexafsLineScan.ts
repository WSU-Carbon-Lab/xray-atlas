export const NEXAFS_LINE_SCAN_TYPE = 'Type = "NEXAFS Line Scan"';

/**
 * Returns true when `.hdr` text declares `Type = "NEXAFS Line Scan"`.
 *
 * @param hdrText - Full `.hdr` file contents.
 */
export function isNexafsLineScanType(hdrText: string): boolean {
  return hdrText.includes(NEXAFS_LINE_SCAN_TYPE);
}
