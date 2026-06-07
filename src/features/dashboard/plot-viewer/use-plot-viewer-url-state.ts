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
import {
  DEFAULT_PLOT_VIEWER_DESCRIPTOR_FIELDS,
  normalizePlotViewerDescriptorFields,
  PLOT_VIEWER_DESCRIPTOR_OPTIONS,
  type PlotViewerDescriptorField,
} from "./plot-viewer-legend";
import { plotViewerStateForUrlWrite } from "./plot-viewer-query-url";
import type {
  PlotViewerPaletteId,
  PlotViewerLineStyleBy,
  PlotViewerStyleMappingField,
} from "./plot-viewer-trace-styles";
import { togglePlotViewerHiddenTraceId } from "./plot-viewer-hidden-traces";
import type {
  PlotViewerChannelId,
  PlotViewerLegendDock,
  PlotViewerLegendPlacement,
  PlotViewerUrlState,
  PlotViewerViewMode,
} from "./plot-viewer-url-state";
import {
  defaultPlotViewerUrlState,
  plotViewerCoreUrlSliceChanged,
  plotViewerStyleUrlSliceChanged,
  plotViewerUrlStatesEqual,
  readPlotViewerParams,
  writePlotViewerParams,
} from "./plot-viewer-url-state";

const DEBOUNCE_MS = 300;
const STYLE_URL_DEBOUNCE_MS = 300;

export type UsePlotViewerUrlStateResult = {
  state: PlotViewerUrlState;
  query: string;
  urlSynced: boolean;
  debouncedQuery: string;
  setQuery: (query: string) => void;
  onQueryFocus: () => void;
  onQueryBlur: () => void;
  setChannel: (channel: PlotViewerChannelId) => void;
  toggleDataset: (experimentId: string, nextGeometryKeys?: string[]) => void;
  setDatasets: (experimentIds: string[]) => void;
  toggleFacet: (
    field: keyof PlotViewerUrlState["facets"],
    id: string,
  ) => void;
  toggleGeometryKey: (key: string) => void;
  setGeometryKeys: (keys: string[]) => void;
  clearFacets: () => void;
  setPanelOpen: (open: boolean) => void;
  setViewMode: (mode: PlotViewerViewMode) => void;
  toggleDescriptorField: (field: PlotViewerDescriptorField) => void;
  setDescriptorFields: (fields: PlotViewerDescriptorField[]) => void;
  setPaletteId: (paletteId: PlotViewerPaletteId) => void;
  setColorBy: (colorBy: PlotViewerStyleMappingField) => void;
  setLineStyleBy: (lineStyleBy: PlotViewerLineStyleBy) => void;
  setMarkerBy: (markerBy: PlotViewerStyleMappingField) => void;
  setLegendPlacement: (placement: PlotViewerLegendPlacement) => void;
  setLegendDock: (dock: PlotViewerLegendDock) => void;
  setLegendTrayOpen: (open: boolean) => void;
  toggleHiddenTrace: (traceKey: string) => void;
};

function searchParamsFromState(
  state: PlotViewerUrlState,
  debouncedQuery: string,
): string {
  const params = new URLSearchParams();
  writePlotViewerParams(params, plotViewerStateForUrlWrite(state, debouncedQuery));
  return params.toString();
}

/**
 * Keeps dashboard plot viewer state in sync with `/dashboard/plot` search params.
 * Local `query` updates immediately for the search field; URL writes use a debounced query.
 * Style encoding URL params debounce separately so rapid style tweaks do not round-trip reload state.
 */
export function usePlotViewerUrlState(): UsePlotViewerUrlStateResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlKey = searchParams.toString();

  const [urlSynced, setUrlSynced] = useState(false);
  const [state, setState] = useState<PlotViewerUrlState>(
    defaultPlotViewerUrlState(),
  );
  const [query, setQueryState] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const isMounted = useRef(false);
  const queryFocusedRef = useRef(false);
  const queryRef = useRef(query);
  queryRef.current = query;
  const lastPushedSearchRef = useRef<string | null>(null);
  const previousStateRef = useRef<PlotViewerUrlState>(defaultPlotViewerUrlState());
  const styleUrlDebounceRef = useRef<number | undefined>(undefined);

  useLayoutEffect(() => {
    if (lastPushedSearchRef.current === urlKey) {
      setUrlSynced(true);
      isMounted.current = true;
      return;
    }
    lastPushedSearchRef.current = null;

    const parsed = readPlotViewerParams(new URLSearchParams(urlKey));
    if (!queryFocusedRef.current) {
      setQueryState(parsed.query);
      setDebouncedQuery(parsed.query.trim());
    }
    setState((current) => {
      const merged: PlotViewerUrlState = {
        ...parsed,
        query: queryFocusedRef.current ? current.query : parsed.query,
      };
      if (plotViewerUrlStatesEqual(current, merged)) {
        return current;
      }
      return merged;
    });
    setUrlSynced(true);
    isMounted.current = true;
  }, [urlKey]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    setState((current) => ({
      ...current,
      query: debouncedQuery,
    }));
  }, [debouncedQuery]);

  useEffect(() => {
    if (!urlSynced || !isMounted.current) {
      return;
    }

    const previous = previousStateRef.current;
    const styleOnly =
      plotViewerStyleUrlSliceChanged(previous, state) &&
      !plotViewerCoreUrlSliceChanged(previous, state);

    const pushUrl = () => {
      const queryString = searchParamsFromState(state, debouncedQuery);
      if (lastPushedSearchRef.current === queryString) {
        previousStateRef.current = state;
        return;
      }
      lastPushedSearchRef.current = queryString;
      previousStateRef.current = state;
      const nextUrl = queryString
        ? `/dashboard/plot?${queryString}`
        : "/dashboard/plot";
      router.replace(nextUrl, { scroll: false });
    };

    if (styleOnly) {
      if (styleUrlDebounceRef.current !== undefined) {
        window.clearTimeout(styleUrlDebounceRef.current);
      }
      styleUrlDebounceRef.current = window.setTimeout(() => {
        styleUrlDebounceRef.current = undefined;
        pushUrl();
      }, STYLE_URL_DEBOUNCE_MS);
      return () => {
        if (styleUrlDebounceRef.current !== undefined) {
          window.clearTimeout(styleUrlDebounceRef.current);
          styleUrlDebounceRef.current = undefined;
        }
      };
    }

    if (styleUrlDebounceRef.current !== undefined) {
      window.clearTimeout(styleUrlDebounceRef.current);
      styleUrlDebounceRef.current = undefined;
    }
    pushUrl();
  }, [debouncedQuery, router, state, urlSynced]);

  const commit = useCallback(
    (updater: (current: PlotViewerUrlState) => PlotViewerUrlState) => {
      setState(updater);
    },
    [],
  );

  const setQuery = useCallback((nextQuery: string) => {
    setQueryState(nextQuery);
  }, []);

  const onQueryFocus = useCallback(() => {
    queryFocusedRef.current = true;
  }, []);

  const onQueryBlur = useCallback(() => {
    queryFocusedRef.current = false;
    const trimmed = queryRef.current.trim();
    setDebouncedQuery(trimmed);
  }, []);

  const setChannel = useCallback(
    (channel: PlotViewerChannelId) => {
      commit((current) => ({ ...current, channel }));
    },
    [commit],
  );

  const toggleDataset = useCallback(
    (experimentId: string, nextGeometryKeys?: string[]) => {
      commit((current) => {
        const selected = new Set(current.datasets);
        if (selected.has(experimentId)) {
          selected.delete(experimentId);
        } else {
          selected.add(experimentId);
        }
        return {
          ...current,
          datasets: [...selected],
          geometryKeys: nextGeometryKeys ?? current.geometryKeys,
        };
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
    setQueryState("");
    setDebouncedQuery("");
    commit((current) => ({
      ...current,
      facets: defaultPlotViewerUrlState().facets,
      query: "",
    }));
  }, [commit]);

  const setPanelOpen = useCallback(
    (open: boolean) => {
      commit((current) => ({ ...current, panelOpen: open }));
    },
    [commit],
  );

  const setViewMode = useCallback(
    (mode: PlotViewerViewMode) => {
      commit((current) => ({ ...current, viewMode: mode }));
    },
    [commit],
  );

  const toggleDescriptorField = useCallback(
    (field: PlotViewerDescriptorField) => {
      commit((current) => {
        const values = new Set(current.descriptorFields);
        if (values.has(field)) {
          values.delete(field);
        } else {
          values.add(field);
        }
        const ordered = PLOT_VIEWER_DESCRIPTOR_OPTIONS.map((option) => option.id).filter(
          (id) => values.has(id),
        );
        const nextFields = normalizePlotViewerDescriptorFields(ordered);
        return {
          ...current,
          descriptorFields:
            nextFields.length > 0
              ? nextFields
              : [...DEFAULT_PLOT_VIEWER_DESCRIPTOR_FIELDS],
        };
      });
    },
    [commit],
  );

  const setDescriptorFields = useCallback(
    (fields: PlotViewerDescriptorField[]) => {
      commit((current) => ({
        ...current,
        descriptorFields: normalizePlotViewerDescriptorFields(fields),
      }));
    },
    [commit],
  );

  const setPaletteId = useCallback(
    (paletteId: PlotViewerPaletteId) => {
      commit((current) => ({ ...current, paletteId }));
    },
    [commit],
  );

  const setColorBy = useCallback(
    (colorBy: PlotViewerStyleMappingField) => {
      commit((current) => ({ ...current, colorBy }));
    },
    [commit],
  );

  const setLineStyleBy = useCallback(
    (lineStyleBy: PlotViewerLineStyleBy) => {
      commit((current) => ({ ...current, lineStyleBy }));
    },
    [commit],
  );

  const setMarkerBy = useCallback(
    (markerBy: PlotViewerStyleMappingField) => {
      commit((current) => ({ ...current, markerBy }));
    },
    [commit],
  );

  const setLegendPlacement = useCallback(
    (legendPlacement: PlotViewerLegendPlacement) => {
      commit((current) => ({ ...current, legendPlacement }));
    },
    [commit],
  );

  const setLegendDock = useCallback(
    (legendDock: PlotViewerLegendDock) => {
      commit((current) => ({ ...current, legendDock }));
    },
    [commit],
  );

  const setLegendTrayOpen = useCallback(
    (legendTrayOpen: boolean) => {
      commit((current) => ({ ...current, legendTrayOpen }));
    },
    [commit],
  );

  const toggleHiddenTrace = useCallback(
    (traceKey: string) => {
      commit((current) => ({
        ...current,
        hiddenTraceIds: togglePlotViewerHiddenTraceId(
          current.hiddenTraceIds,
          traceKey,
        ),
      }));
    },
    [commit],
  );

  return useMemo(
    () => ({
      state,
      query,
      urlSynced,
      debouncedQuery,
      setQuery,
      onQueryFocus,
      onQueryBlur,
      setChannel,
      toggleDataset,
      setDatasets,
      toggleFacet,
      toggleGeometryKey,
      setGeometryKeys,
      clearFacets,
      setPanelOpen,
      setViewMode,
      toggleDescriptorField,
      setDescriptorFields,
      setPaletteId,
      setColorBy,
      setLineStyleBy,
      setMarkerBy,
      setLegendPlacement,
      setLegendDock,
      setLegendTrayOpen,
      toggleHiddenTrace,
    }),
    [
      state,
      query,
      urlSynced,
      debouncedQuery,
      setQuery,
      onQueryFocus,
      onQueryBlur,
      setChannel,
      toggleDataset,
      setDatasets,
      toggleFacet,
      toggleGeometryKey,
      setGeometryKeys,
      clearFacets,
      setPanelOpen,
      setViewMode,
      toggleDescriptorField,
      setDescriptorFields,
      setPaletteId,
      setColorBy,
      setLineStyleBy,
      setMarkerBy,
      setLegendPlacement,
      setLegendDock,
      setLegendTrayOpen,
      toggleHiddenTrace,
    ],
  );
}
