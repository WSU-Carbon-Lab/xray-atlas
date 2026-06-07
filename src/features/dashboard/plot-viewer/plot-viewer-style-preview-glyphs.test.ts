import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PlotViewerLineStylePreview,
  PlotViewerMarkerShapeGlyph,
} from "./plot-viewer-style-preview-glyphs";

type ExpectAssertions = {
  toContain: (expected: string) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("plot-viewer-style-preview-glyphs", () => {
  it("applies resolved color to line preview stroke", () => {
    const markup = renderToStaticMarkup(
      PlotViewerLineStylePreview({ lineDash: "dash", color: "#336699" }),
    );
    expect(markup).toContain('stroke="#336699"');
  });

  it("applies resolved color to marker-none slash and filled shapes", () => {
    const noneMarkup = renderToStaticMarkup(
      PlotViewerMarkerShapeGlyph({ symbol: "none", color: "#CC4422" }),
    );
    const circleMarkup = renderToStaticMarkup(
      PlotViewerMarkerShapeGlyph({ symbol: "circle", color: "#CC4422" }),
    );
    expect(noneMarkup).toContain('stroke="#CC4422"');
    expect(circleMarkup).toContain('fill="#CC4422"');
  });
});
