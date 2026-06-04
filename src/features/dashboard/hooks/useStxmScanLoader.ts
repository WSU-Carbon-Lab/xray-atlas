"use client";

import { useCallback, useEffect, useState } from "react";
import { loadStxm, orientScan } from "~/lib/stxm";
import type { StxmHdrMetadata, StxmOrientedScan } from "~/lib/stxm";
import { trpc } from "~/trpc/client";

export type LoadedStxmScan = {
  scanId: string;
  header: StxmHdrMetadata;
  oriented: StxmOrientedScan;
};

type UseStxmScanLoaderArgs = {
  scanId: string;
  experimentId: string | null;
  hdrFileId: string | null | undefined;
  ximFileId: string | null | undefined;
  hdrFileName: string;
  ximFileName: string;
  localHdrFile: File | null;
  localXimFile: File | null;
};

/**
 * Loads paired `.hdr`/`.xim` content from local files or signed experiment-aux URLs.
 */
export function useStxmScanLoader({
  experimentId,
  hdrFileId,
  ximFileId,
  hdrFileName,
  ximFileName,
  localHdrFile,
  localXimFile,
  scanId,
}: UseStxmScanLoaderArgs) {
  const [loaded, setLoaded] = useState<LoadedStxmScan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const hdrQuery = trpc.experimentFile.getDownloadUrl.useQuery(
    { experimentId: experimentId ?? "", fileId: hdrFileId ?? "" },
    { enabled: Boolean(experimentId && hdrFileId && !localHdrFile) },
  );
  const ximQuery = trpc.experimentFile.getDownloadUrl.useQuery(
    { experimentId: experimentId ?? "", fileId: ximFileId ?? "" },
    { enabled: Boolean(experimentId && ximFileId && !localXimFile) },
  );

  const loadFromText = useCallback(
    (hdrText: string, ximSource: string | ArrayBuffer) => {
      const summary = loadStxm(hdrText, ximSource);
      const oriented = orientScan(summary.header, summary.image);
      setLoaded({
        scanId,
        header: summary.header,
        oriented,
      });
    },
    [scanId],
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        if (localHdrFile && localXimFile) {
          const hdrText = await localHdrFile.text();
          const ximBuffer = await localXimFile.arrayBuffer();
          if (!cancelled) {
            loadFromText(hdrText, ximBuffer);
          }
          return;
        }

        if (
          experimentId &&
          hdrFileId &&
          ximFileId &&
          hdrQuery.data?.signedUrl &&
          ximQuery.data?.signedUrl
        ) {
          const [hdrResp, ximResp] = await Promise.all([
            fetch(hdrQuery.data.signedUrl),
            fetch(ximQuery.data.signedUrl),
          ]);
          if (!hdrResp.ok || !ximResp.ok) {
            throw new Error(`Failed to fetch ${hdrFileName} or ${ximFileName}`);
          }
          const hdrText = await hdrResp.text();
          const ximBuffer = await ximResp.arrayBuffer();
          if (!cancelled) {
            loadFromText(hdrText, ximBuffer);
          }
          return;
        }

        if (!cancelled) {
          setLoaded(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setLoaded(null);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load scan",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    experimentId,
    hdrFileId,
    hdrFileName,
    hdrQuery.data?.signedUrl,
    loadFromText,
    localHdrFile,
    localXimFile,
    ximFileId,
    ximFileName,
    ximQuery.data?.signedUrl,
  ]);

  return { loaded, error, isLoading };
}

/** Parses local file pair without network I/O. */
export async function parseLocalStxmPair(
  hdrFile: File,
  ximFile: File,
): Promise<{ header: StxmHdrMetadata; oriented: StxmOrientedScan }> {
  const hdrText = await hdrFile.text();
  const ximBuffer = await ximFile.arrayBuffer();
  const summary = loadStxm(hdrText, ximBuffer);
  const oriented = orientScan(summary.header, summary.image);
  return { header: summary.header, oriented };
}

/** Builds a downsampled heatmap matrix for canvas rendering. */
export function downsampleHeatmap(
  image: Float64Array[],
  maxRows = 128,
  maxCols = 256,
): { values: number[][]; rowCount: number; colCount: number } {
  const nRows = image.length;
  const nCols = image[0]?.length ?? 0;
  if (nRows === 0 || nCols === 0) {
    return { values: [], rowCount: 0, colCount: 0 };
  }
  const rowStride = Math.max(1, Math.ceil(nRows / maxRows));
  const colStride = Math.max(1, Math.ceil(nCols / maxCols));
  const values: number[][] = [];
  for (let row = 0; row < nRows; row += rowStride) {
    const outRow: number[] = [];
    for (let col = 0; col < nCols; col += colStride) {
      outRow.push(image[row]?.[col] ?? 0);
    }
    values.push(outRow);
  }
  return {
    values,
    rowCount: values.length,
    colCount: values[0]?.length ?? 0,
  };
}
