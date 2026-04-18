import { applyChemFormulaTypographyToSvgRoot } from "~/lib/molecule-svg-formula-typography";

/**
 * Shared CPK-style atom and bond coloring for molecule SVG markup, matching
 * `MoleculeImageSVG` / browse depictions: light vs dark bond and label colors.
 */

const CPK_COLORS_LIGHT: Record<string, string> = {
  H: "#000000",
  C: "#000000",
  N: "#2144d9",
  O: "#ff0d0d",
  S: "#e1e100",
  P: "#ff8000",
  F: "#90e000",
  Cl: "#00e000",
  Br: "#a52a2a",
  I: "#940094",
};

const CPK_COLORS_DARK: Record<string, string> = {
  H: "#e0e0e0",
  C: "#e0e0e0",
  N: "#8fa3ff",
  O: "#ff6666",
  S: "#ffff00",
  P: "#ffb366",
  F: "#c3ff00",
  Cl: "#66ff66",
  Br: "#d47878",
  I: "#d478d4",
};

/**
 * Mutates the given SVG root in place: applies CPK atom label colors and bond
 * stroke/fill colors for light or dark UI, consistent with the catalog image
 * viewer (`MoleculeImageSVG`).
 *
 * @param svgRoot - Root `svg` element (or document element containing SVG content).
 * @param isDark - When true, use the dark palette (light bonds and labels).
 */
export function applyMoleculeSvgCpkThemeToElement(
  svgRoot: Element,
  isDark: boolean,
): void {
  applyChemFormulaTypographyToSvgRoot(svgRoot);
  const CPK_COLORS = isDark ? CPK_COLORS_DARK : CPK_COLORS_LIGHT;
  const BOND_COLOR = isDark ? "#ffffff" : "#000000";
  const DEFAULT_ATOM_COLOR = isDark ? "#ffffff" : "#000000";

  svgRoot.querySelectorAll("style").forEach((style) => style.remove());

  const textElements = svgRoot.querySelectorAll("text, tspan");
  textElements.forEach((textElem) => {
    const text = textElem.textContent?.trim() ?? "";
    if (!text) return;

    if (text === "n" && text.length === 1) {
      textElem.removeAttribute("fill");
      textElem.removeAttribute("style");
      textElem.setAttribute("fill", BOND_COLOR);
      return;
    }

    const elementMatch = /^([A-Z][a-z]?)/.exec(text);
    if (elementMatch?.[1]) {
      const elementSymbol = elementMatch[1];

      if (elementSymbol in CPK_COLORS) {
        const colorVar = CPK_COLORS[elementSymbol] ?? DEFAULT_ATOM_COLOR;
        textElem.removeAttribute("fill");
        const existingStyle = textElem.getAttribute("style") ?? "";
        const styleProps = existingStyle
          .split(";")
          .map((prop) => prop.trim())
          .filter((prop) => prop && !prop.toLowerCase().startsWith("fill"));
        const newStyle =
          styleProps.length > 0
            ? `${styleProps.join("; ")}; fill: ${colorVar} !important;`
            : `fill: ${colorVar} !important;`;
        textElem.setAttribute("style", newStyle);
        textElem.setAttribute("fill", colorVar);

        const nextSibling = textElem.nextElementSibling;
        if (nextSibling) {
          const siblingText = nextSibling.textContent?.trim() ?? "";
          if (/^\d+$/.test(siblingText)) {
            nextSibling.removeAttribute("fill");
            const siblingStyle = nextSibling.getAttribute("style") ?? "";
            const newSiblingStyle = siblingStyle
              .split(";")
              .filter((prop) => !prop.trim().startsWith("fill"))
              .join(";")
              .trim();
            nextSibling.setAttribute(
              "style",
              newSiblingStyle
                ? `${newSiblingStyle}; fill: ${colorVar};`
                : `fill: ${colorVar};`,
            );
            nextSibling.setAttribute("fill", colorVar);
          }
        }
      } else {
        textElem.removeAttribute("fill");
        const existingStyle = textElem.getAttribute("style") ?? "";
        const newStyle = existingStyle
          .split(";")
          .filter((prop) => !prop.trim().startsWith("fill"))
          .join(";")
          .trim();
        textElem.setAttribute(
          "style",
          newStyle
            ? `${newStyle}; fill: ${DEFAULT_ATOM_COLOR};`
            : `fill: ${DEFAULT_ATOM_COLOR};`,
        );
        textElem.setAttribute("fill", DEFAULT_ATOM_COLOR);
      }
    } else {
      textElem.removeAttribute("fill");
      const existingStyle = textElem.getAttribute("style") ?? "";
      const newStyle = existingStyle
        .split(";")
        .filter((prop) => !prop.trim().startsWith("fill"))
        .join(";")
        .trim();
      textElem.setAttribute(
        "style",
        newStyle
          ? `${newStyle}; fill: ${DEFAULT_ATOM_COLOR};`
          : `fill: ${DEFAULT_ATOM_COLOR};`,
      );
      textElem.setAttribute("fill", DEFAULT_ATOM_COLOR);
    }
  });

  svgRoot.querySelectorAll("path").forEach((pathElem) => {
    const fill = pathElem.getAttribute("fill");
    const stroke = pathElem.getAttribute("stroke");
    if (fill && fill !== "none") {
      pathElem.setAttribute("fill", BOND_COLOR);
    }
    if (stroke && stroke !== "none") {
      pathElem.setAttribute("stroke", BOND_COLOR);
    }
  });

  svgRoot.querySelectorAll("line").forEach((lineElem) => {
    const stroke = lineElem.getAttribute("stroke");
    if (stroke && stroke !== "none") {
      lineElem.setAttribute("stroke", BOND_COLOR);
    }
  });
}

/**
 * Returns SVG markup with CPK theming applied for light or dark mode, using the
 * same rules as {@link applyMoleculeSvgCpkThemeToElement}.
 *
 * @param svgText - Raw SVG string (must parse as XML when valid).
 * @param isDark - When true, use dark-mode CPK colors.
 */
export function applyMoleculeSvgCpkTheme(svgText: string, isDark: boolean): string {
  const trimmed = svgText.trim();
  if (!trimmed.startsWith("<")) {
    return svgText;
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  if (doc.querySelector("parsererror")) {
    return svgText;
  }
  const svg = doc.documentElement;
  applyMoleculeSvgCpkThemeToElement(svg, isDark);
  return new XMLSerializer().serializeToString(svg);
}
