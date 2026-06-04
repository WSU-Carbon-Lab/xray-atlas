/**
 * Browser-side STXM line-scan I/O types aligned with the Python `stxm.io` module.
 */

/** Parsed metadata from an STXM `.hdr` text header. */
export interface StxmHdrMetadata {
  paxisCount: number;
  qaxisCount: number;
  paxisName?: string;
  qaxisName?: string;
  paxisPoints?: Float64Array;
  qaxisPoints?: Float64Array;
  raw: string;
}

/** Oriented line-scan stack with energy on columns and spatial rows. */
export interface StxmOrientedScan {
  energyEv: Float64Array;
  spatial: Float64Array;
  image: Float64Array[];
}

/** Summary returned after pairing and parsing `.hdr` + `.xim` in the browser. */
export interface StxmLoadSummary {
  header: StxmHdrMetadata;
  rowCount: number;
  colCount: number;
  isNexafsLineScan: boolean;
  energyMinEv: number | null;
  energyMaxEv: number | null;
}
