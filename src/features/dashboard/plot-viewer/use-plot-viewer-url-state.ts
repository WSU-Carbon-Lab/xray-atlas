"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { PlotViewerChannelId, PlotViewerUrlState } from "./plot-viewer-url-state";
import {
  defaultPlotViewerUrlState,
  readPlotViewerParams,
  writePlotViewerParams,
} from "./plot-viewer-url-state";

const DEBOUNCE_MS = 300;

export type UsePlotViewerUrlStateResult = {
  state: PlotViewerUrlState;
  urlSynced: boolean;
  debouncedQuery: string;
  setQuery: (query: string) => void;
  setChannel: (channel: PlotViewerChannelId) => void;
  toggleDataset: (experimentId: string) => void;
  setDatasets: (experimentIds: string[]) => void;
  toggleFacet: (
    field: keyof PlotViewerUrlState["facets"],
    id: string,
  ) => void;
  toggleGeometryKey: (key: string) => void;
  setGeometryKeys: (keys: string[]) => void;
  clearFacets: () => void;
};

/**
 * Keeps dashboard plot viewer state in sync with `/dashboard/plot` search params.
 */
export function usePlotViewerUrlState(): UsePlotViewerUrlStateResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [urlSynced, setUrlSynced] = useState(false);
  const [state, setState] = useState<PlotViewerUrlState>(
    defaultPlotViewerUrlState(),
  );
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const replaceRef = useRef<(next: PlotViewerUrlState) => void>(() => undefined);

  useLayoutEffect(() => {
    const parsed = readPlotViewerParams(searchParams);
    setState(parsed);
    setDebouncedQuery(parsed.query.trim());
    setUrlSynced(true);
  }, [searchParams]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(state.query.trim());
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [state.query]);

  replaceRef.current = (next) => {
    const params = new URLSearchParams(searchParams.toString());
    writePlotViewerParams(params, next);
    const queryString = params.toString();
    router.replace(
      queryString ? `/dashboard/plot?${queryString}` : "/dashboard/plot",
      { scroll: false },
    );
  };

  const commit = useCallback((updater: (current: PlotViewerUrlState) => PlotViewerUrlState) => {
    setState((current) => {
      const next = updater(current);
      replaceRef.current(next);
      return next;
    });
  }, []);

  const setQuery = useCallback(
    (query: string) => {
      commit((current) => ({ ...current, query }));
    },
    [commit],
  );

  const setChannel = useCallback(
    (channel: PlotViewerChannelId) => {
      commit((current) => ({ ...current, channel }));
    },
    [commit],
  );

  const toggleDataset = useCallback(
    (experimentId: string) => {
      commit((current) => {
        const selected = new Set(current.datasets);
        if (selected.has(experimentId)) {
          selected.delete(experimentId);
        } else {
          selected.add(experimentId);
        }
        return { ...current, datasets: [...selected] };
      });
    },
    [commit],
  );

  const setDatasets = useCallback(
    (experimentIds: string[]) => {
      commit((current) => ({ ...current, datasets: experimentIds }));
    },
    [commit],
  );

  const toggleFacet = useCallback(
    (field: keyof PlotViewerUrlState["facets"], id: string) => {
      commit((current) => {
        const values = new Set(current.facets[field]);
        if (values.has(id)) {
          values.delete(id);
        } else {
          values.add(id);
        }
        return {
          ...current,
          facets: { ...current.facets, [field]: [...values] },
        };
      });
    },
    [commit],
  );

  const toggleGeometryKey = useCallback(
    (key: string) => {
      commit((current) => {
        const values = new Set(current.geometryKeys);
        if (values.has(key)) {
          values.delete(key);
        } else {
          values.add(key);
        }
        return { ...current, geometryKeys: [...values] };
      });
    },
    [commit],
  );

  const setGeometryKeys = useCallback(
    (keys: string[]) => {
      commit((current) => ({ ...current, geometryKeys: keys }));
    },
    [commit],
  );

  const clearFacets = useCallback(() => {
    commit((current) => ({
      ...current,
      facets: defaultPlotViewerUrlState().facets,
      query: "",
    }));
  }, [commit]);

  return useMemo(
    () => ({
      state,
      urlSynced,
      debouncedQuery,
      setQuery,
      setChannel,
      toggleDataset,
      setDatasets,
      toggleFacet,
      toggleGeometryKey,
      setGeometryKeys,
      clearFacets,
    }),
    [
      state,
      urlSynced,
      debouncedQuery,
      setQuery,
      setChannel,
      toggleDataset,
      setDatasets,
      toggleFacet,
      toggleGeometryKey,
      setGeometryKeys,
      clearFacets,
    ],
  );
}
