import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  MOLECULE_SVG_FONT_FAMILY,
  moleculeSvgFontFamilyXmlAttribute,
} from "./molecule-svg-typography";
import { moleculeSvgMarkupToDataUrl } from "./molecule-svg-upload";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toContain: (expected: string) => void;
  not: { toContain: (expected: string) => void };
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("moleculeSvgFontFamilyXmlAttribute", () => {
  it("escapes quoted font names for XML attributes", () => {
    const escaped = moleculeSvgFontFamilyXmlAttribute();
    expect(escaped).toContain("&quot;Segoe UI&quot;");
    expect(escaped).not.toContain('"Segoe UI"');
  });

  it("keeps registry snapshot root attribute well-formed", () => {
    const attr = moleculeSvgFontFamilyXmlAttribute();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" font-family="${attr}"><text>C</text></svg>`;
    expect(svg).toContain('font-family="Geist, Montserrat');
    expect(svg).not.toContain(
      'font-family="Geist, Montserrat, system-ui, -apple-system, BlinkMacSystemFont, "',
    );
  });
});

describe("moleculeSvgMarkupToDataUrl", () => {
  it("encodes standalone snapshot SVG for img data URLs", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" font-family="${moleculeSvgFontFamilyXmlAttribute()}"><text x="10" y="20">C</text></svg>`;
    const dataUrl = moleculeSvgMarkupToDataUrl(svg);
    expect(dataUrl.startsWith("data:image/svg+xml;base64,")).toBe(true);
    const base64 = dataUrl.slice("data:image/svg+xml;base64,".length);
    const decoded = Buffer.from(base64, "base64").toString("utf8");
    expect(decoded).toContain(MOLECULE_SVG_FONT_FAMILY.split(",")[0] ?? "Geist");
    expect(decoded).toContain("&quot;Segoe UI&quot;");
    expect(decoded).not.toContain('BlinkMacSystemFont, "Segoe');
  });
});
