import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VisualizationToggle } from "~/features/process-nexafs/ui/visualization-toggle";

type ExpectAssertions = {
  toContain: (expected: string) => void;
  not: { toContain: (expected: string) => void };
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function noop(): void {
  return;
}

describe("VisualizationToggle modes", () => {
  it("hides auxiliary files when modes omit aux", () => {
    const html = renderToStaticMarkup(
      <VisualizationToggle
        mode="graph"
        onModeChange={noop}
        graphStyle="line"
        onGraphStyleChange={noop}
        modes={["graph", "table"]}
      />,
    );
    expect(html).toContain("Graph");
    expect(html).toContain("Table");
    expect(html).not.toContain("Auxiliary files");
  });
});
