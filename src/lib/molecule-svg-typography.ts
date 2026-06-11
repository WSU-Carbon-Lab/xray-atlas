/**
 * Font stack and post-processing for molecule structure SVG markup (OpenChemLib
 * depictions, registry snapshots, sketcher overlays, and browse image theming).
 */

/** Semibold weight for atom labels, abbreviations, and formula text in structure SVGs. */
export const MOLECULE_SVG_LABEL_FONT_WEIGHT = 600;

/**
 * Font stack for standalone molecule SVG documents (registry upload, object
 * storage). Lists Geist and Montserrat first so in-app viewers pick up loaded
 * webfonts; falls back to system UI sans-serif elsewhere.
 */
export const MOLECULE_SVG_FONT_FAMILY =
  'Geist, Montserrat, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/**
 * Font stack for inline SVG rendered inside the Atlas React tree. Resolves theme
 * CSS variables when present, then matches {@link MOLECULE_SVG_FONT_FAMILY}.
 */
export const MOLECULE_SVG_FONT_FAMILY_INLINE =
  'var(--font-geist-sans), var(--font-sans), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const NORMALIZED_WEIGHTS = new Set(["", "normal", "400", "lighter"]);

/**
 * Escapes a string for safe embedding in an XML/SVG double-quoted attribute value.
 *
 * @param value - Raw attribute text that may contain quotes or ampersands.
 * @returns Entity-escaped text suitable for `attr="..."` serialization.
 */
export function escapeXmlAttributeValue(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Returns {@link MOLECULE_SVG_FONT_FAMILY} escaped for double-quoted SVG/XML
 * attributes in serialized markup (registry snapshots, bookend overlays).
 */
export function moleculeSvgFontFamilyXmlAttribute(): string {
  return escapeXmlAttributeValue(MOLECULE_SVG_FONT_FAMILY);
}

/**
 * Applies {@link MOLECULE_SVG_FONT_FAMILY} and semibold label weight to the SVG
 * root and every `text` / `tspan` node so OpenChemLib's generic `sans-serif`
 * and Helvetica defaults are replaced consistently.
 *
 * @param svgRoot - Parsed SVG document element or subtree root.
 */
export function applyMoleculeSvgTypographyToSvgRoot(svgRoot: Element): void {
  svgRoot.setAttribute("font-family", MOLECULE_SVG_FONT_FAMILY);
  const existingStyle = svgRoot.getAttribute("style") ?? "";
  if (!/font-family\s*:/i.test(existingStyle)) {
    const trimmed = existingStyle.trim();
    svgRoot.setAttribute(
      "style",
      trimmed.length > 0
        ? `${trimmed}; font-family: ${MOLECULE_SVG_FONT_FAMILY};`
        : `font-family: ${MOLECULE_SVG_FONT_FAMILY};`,
    );
  }

  const textNodes = svgRoot.querySelectorAll("text, tspan");
  for (const node of textNodes) {
    node.setAttribute("font-family", MOLECULE_SVG_FONT_FAMILY);
    const weight = node.getAttribute("font-weight") ?? "";
    if (NORMALIZED_WEIGHTS.has(weight)) {
      node.setAttribute("font-weight", String(MOLECULE_SVG_LABEL_FONT_WEIGHT));
    }
  }
}

/**
 * Returns SVG markup with {@link applyMoleculeSvgTypographyToSvgRoot} applied.
 * No-ops when `svgText` is not parseable SVG.
 *
 * @param svgText - Raw or themed SVG string.
 * @returns Typography-normalized markup, or the input when parsing fails.
 */
export function applyMoleculeSvgTypography(svgText: string): string {
  const trimmed = svgText.trim();
  if (!trimmed.startsWith("<")) {
    return svgText;
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  if (doc.querySelector("parsererror")) {
    return svgText;
  }
  applyMoleculeSvgTypographyToSvgRoot(doc.documentElement);
  return new XMLSerializer().serializeToString(doc.documentElement);
}
