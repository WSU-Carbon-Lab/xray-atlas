"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/**
 * MoleculeImageSVG - Processes SVG molecule images to apply CPK color scheme
 * for dark mode compatibility.
 *
 * This component:
 * 1. Fetches the SVG content from the URL
 * 2. Processes it to apply CPK colors directly to elements based on theme
 * 3. Renders the processed SVG inline
 * 4. Applies dark mode colors (white bonds, lighter element colors) or
 *    light mode colors (black bonds, standard CPK colors) based on current theme
 *
 * CPK Color Mapping:
 * - H, C: Black (light) / Light gray (dark)
 * - N: Blue shades
 * - O: Red shades
 * - S: Yellow shades
 * - P: Orange shades
 * - F, Cl: Green shades
 * - Br, I: Brown/Purple shades
 * - Bonds: Black (light) / White (dark)
 * - Default atoms (non-CPK): Black (light) / White (dark)
 */
export const MoleculeImageSVG = ({
  imageUrl,
  name,
  className = "",
}: {
  imageUrl: string;
  name: string;
  className?: string;
}) => {
  const { resolvedTheme } = useTheme();
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchAndProcessSVG = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch SVG: ${response.statusText}`);
        }

        const contentType = (
          response.headers.get("content-type") ?? ""
        ).toLowerCase();
        if (
          contentType.includes("image/png") ||
          contentType.includes("image/jpeg") ||
          contentType.includes("image/gif") ||
          contentType.includes("image/webp")
        ) {
          if (isMounted) {
            setError("Image is not SVG (PNG/raster not supported)");
          }
          return;
        }

        const svgText = await response.text();

        if (!isMounted) return;

        const trimmed = svgText.trim();
        if (!trimmed.startsWith("<")) {
          if (isMounted) {
            setError("Invalid SVG or non-SVG content");
          }
          return;
        }

        const processedSVG = processSVGForDarkMode(
          svgText,
          resolvedTheme === "dark",
        );
        setSvgContent(processedSVG);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load SVG");
          console.error("Error loading SVG:", err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchAndProcessSVG();

    return () => {
      isMounted = false;
    };
  }, [imageUrl, resolvedTheme]);

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        aria-label={`Loading ${name}`}
      >
        <div className="h-8 w-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  if (error || !svgContent) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        aria-label={`Error loading ${name}`}
      >
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Failed to load image
        </div>
      </div>
    );
  }

  // Wrap SVG in a container that provides CSS variable context
  return (
    <div
      className={`${className} ${resolvedTheme === "dark" ? "dark" : ""}`}
      dangerouslySetInnerHTML={{ __html: svgContent }}
      aria-label={name}
    />
  );
};

/**
 * Processes SVG content to inject CPK color scheme CSS variables
 * and apply them to element symbols and bonds.
 */
function processSVGForDarkMode(svgText: string, isDark: boolean): string {
  const trimmed = svgText.trim();
  if (!trimmed.startsWith("<")) {
    return svgText;
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    return svgText;
  }

  const svg = doc.documentElement;

  // Remove existing style elements
  const existingStyles = svg.querySelectorAll("style");
  existingStyles.forEach((style) => style.remove());

  // No need for style element since we're setting colors directly

  // CPK color mapping - light and dark mode
  // CPK color mapping - light and dark mode
  // Colors match the Python script exactly
  const CPK_COLORS_LIGHT: Record<string, string> = {
    H: "#000000", // Black
    C: "#000000", // Black
    N: "#2144d9", // Blue
    O: "#ff0d0d", // Red
    S: "#e1e100", // Yellow
    P: "#ff8000", // Orange
    F: "#90e000", // Green
    Cl: "#00e000", // Green
    Br: "#a52a2a", // Brown
    I: "#940094", // Purple
  };

  const CPK_COLORS_DARK: Record<string, string> = {
    H: "#e0e0e0", // Light gray
    C: "#e0e0e0", // Light gray
    N: "#8fa3ff", // Light blue
    O: "#ff6666", // Light red
    S: "#ffff00", // Bright yellow
    P: "#ffb366", // Light orange
    F: "#c3ff00", // Bright green
    Cl: "#66ff66", // Light green
    Br: "#d47878", // Light brown
    I: "#d478d4", // Light purple
  };

  const CPK_COLORS = isDark ? CPK_COLORS_DARK : CPK_COLORS_LIGHT;
  const BOND_COLOR = isDark ? "#ffffff" : "#000000";
  const DEFAULT_ATOM_COLOR = isDark ? "#ffffff" : "#000000";

  // Process all text elements (atom labels)
  // Also process tspan elements which are often used inside text elements
  const textElements = svg.querySelectorAll("text, tspan");
  textElements.forEach((textElem) => {
    const text = textElem.textContent?.trim() || "";

    // Skip empty text elements
    if (!text) return;

    // Handle polymer 'n' (lowercase only, single character)
    // Must check for lowercase 'n' specifically to distinguish from Nitrogen 'N' (uppercase)
    if (text === "n" && text.length === 1) {
      textElem.removeAttribute("fill");
      textElem.removeAttribute("style");
      textElem.setAttribute("fill", BOND_COLOR);
      return;
    }

    // Match element symbols - handle both single and multi-character elements
    // Pattern matches: N, O, C, H, S, P, F, Cl, Br, I, etc.
    // This regex matches uppercase letter optionally followed by lowercase letter
    const elementMatch = /^([A-Z][a-z]?)/.exec(text);
    if (elementMatch?.[1]) {
      const elementSymbol = elementMatch[1];

      // Check if it's a CPK element
      if (elementSymbol in CPK_COLORS) {
        const colorVar = CPK_COLORS[elementSymbol] ?? DEFAULT_ATOM_COLOR;

        // Force the color by removing all existing fill attributes and setting new ones
        // Remove fill attribute
        textElem.removeAttribute("fill");

        // Remove fill from style attribute if it exists
        const existingStyle = textElem.getAttribute("style") ?? "";
        const styleProps = existingStyle
          .split(";")
          .map((prop) => prop.trim())
          .filter((prop) => prop && !prop.toLowerCase().startsWith("fill"));

        // Set style with fill at the end (higher specificity)
        const newStyle =
          styleProps.length > 0
            ? `${styleProps.join("; ")}; fill: ${colorVar} !important;`
            : `fill: ${colorVar} !important;`;
        textElem.setAttribute("style", newStyle);

        // Also set fill attribute (SVG fill attribute takes precedence)
        textElem.setAttribute("fill", colorVar);

        // Handle subscript numbers (next sibling text element or tspan)
        const nextSibling = textElem.nextElementSibling;
        if (nextSibling) {
          const siblingText = nextSibling.textContent?.trim() || "";
          // Check if it's a number (subscript)
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
        // Default atom color for non-CPK elements
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
      // Default atom color for text that doesn't match element pattern
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

  // Process all path elements (bonds)
  const pathElements = svg.querySelectorAll("path");
  pathElements.forEach((pathElem) => {
    const fill = pathElem.getAttribute("fill");
    const stroke = pathElem.getAttribute("stroke");

    if (fill && fill !== "none") {
      pathElem.setAttribute("fill", BOND_COLOR);
    }
    if (stroke && stroke !== "none") {
      pathElem.setAttribute("stroke", BOND_COLOR);
    }
  });

  // Process line elements (bonds)
  const lineElements = svg.querySelectorAll("line");
  lineElements.forEach((lineElem) => {
    const stroke = lineElem.getAttribute("stroke");
    if (stroke && stroke !== "none") {
      lineElem.setAttribute("stroke", BOND_COLOR);
    }
  });

  // Serialize back to string
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svg);
}
