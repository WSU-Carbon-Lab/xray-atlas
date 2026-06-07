import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  readPlotViewerStyleAccordionExpandedKeys,
  writePlotViewerStyleAccordionExpandedKeys,
} from "./plot-viewer-style-accordion-state";
import {
  defaultPlotViewerUrlState,
  plotViewerCoreUrlSliceChanged,
  plotViewerStyleUrlSliceChanged,
  plotViewerUrlStatesEqual,
} from "./plot-viewer-url-state";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("plot-viewer-style-accordion-state", () => {
  it("round-trips expanded accordion ids through sessionStorage", () => {
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    } as Storage;
    const previous = globalThis.sessionStorage;
    Object.defineProperty(globalThis, "sessionStorage", {
      value: fakeStorage,
      configurable: true,
    });
    try {
      writePlotViewerStyleAccordionExpandedKeys([
        "encodings",
        "plot-viewer-style-a",
      ]);
      expect([...readPlotViewerStyleAccordionExpandedKeys()]).toEqual([
        "encodings",
        "plot-viewer-style-a",
      ]);
    } finally {
      Object.defineProperty(globalThis, "sessionStorage", {
        value: previous,
        configurable: true,
      });
    }
  });
});

describe("plotViewerUrlStatesEqual", () => {
  it("detects style-only diffs without core slice changes", () => {
    const base = defaultPlotViewerUrlState();
    const styled = { ...base, colorBy: "instrument" as const };
    expect(plotViewerUrlStatesEqual(base, styled)).toBe(false);
    expect(plotViewerStyleUrlSliceChanged(base, styled)).toBe(true);
    expect(plotViewerCoreUrlSliceChanged(base, styled)).toBe(false);
  });

  it("detects core dataset changes separately from style", () => {
    const base = defaultPlotViewerUrlState();
    const next = {
      ...base,
      datasets: ["11111111-1111-1111-1111-111111111111"],
      colorBy: "instrument" as const,
    };
    expect(plotViewerCoreUrlSliceChanged(base, next)).toBe(true);
    expect(plotViewerStyleUrlSliceChanged(base, next)).toBe(true);
  });
});
