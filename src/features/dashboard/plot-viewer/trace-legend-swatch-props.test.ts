import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { resolveTraceLegendSwatchPresentation } from "./trace-legend-swatch-props";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("resolveTraceLegendSwatchPresentation", () => {
  it("keeps line graph style and overlays markers on the dash segment", () => {
    expect(
      resolveTraceLegendSwatchPresentation({
        color: "#336699",
        lineDash: "dash",
        markerSymbol: "square",
      }),
    ).toEqual({
      color: "#336699",
      variant: "dash",
      graphStyle: "line",
      markerOnLine: true,
      markerShape: "square",
    });
  });

  it("renders plain line swatches when markers are disabled", () => {
    expect(
      resolveTraceLegendSwatchPresentation({
        color: "#112233",
        lineDash: "solid",
        markerSymbol: "none",
      }).markerOnLine,
    ).toBe(false);
  });
});
