import { isNexafsLineScanType } from "./isNexafsLineScan";
import { orientScan } from "./orientScan";
import { readHdr } from "./readHdr";
import { readXim } from "./readXim";
import type { StxmLoadSummary } from "./types";

/**
 * Parses paired `.hdr` and `.xim` payloads in the browser and returns header
 * metadata plus a load summary including energy bounds when axis arrays exist.
 *
 * @param hdrText - `.hdr` file contents.
 * @param ximSource - `.xim` file contents as text or `ArrayBuffer`.
 * @returns Header metadata, image shape, NEXAFS type flag, and energy extrema.
 * @throws {Error} When header or image parsing fails or orientation is invalid.
 */
export function loadStxm(
  hdrText: string,
  ximSource: string | ArrayBuffer,
): StxmLoadSummary & { image: Float64Array[] } {
  const header = readHdr(hdrText);
  const shape: [number, number] = [header.qaxisCount, header.paxisCount];
  const image = readXim(ximSource, shape);
  const isNexafsLineScan = isNexafsLineScanType(hdrText);

  let energyMinEv: number | null = null;
  let energyMaxEv: number | null = null;

  if (header.paxisPoints && header.qaxisPoints) {
    try {
      const oriented = orientScan(header, image);
      energyMinEv = Math.min(...oriented.energyEv);
      energyMaxEv = Math.max(...oriented.energyEv);
    } catch {
      energyMinEv = null;
      energyMaxEv = null;
    }
  }

  return {
    header,
    image,
    rowCount: header.qaxisCount,
    colCount: header.paxisCount,
    isNexafsLineScan,
    energyMinEv,
    energyMaxEv,
  };
}
