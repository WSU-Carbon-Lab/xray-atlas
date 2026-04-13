"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { applyMoleculeSvgCpkTheme } from "~/lib/molecule-svg-cpk-theme";

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

        const processedSVG = applyMoleculeSvgCpkTheme(
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
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800/50 ${className}`}
        aria-label={`Loading ${name}`}
      >
        <div
          className="border-t-accent dark:border-t-accent-light h-10 w-10 animate-spin rounded-full border-2 border-gray-300 dark:border-gray-600"
          role="status"
          aria-hidden
        />
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

  return (
    <div
      className={`${className} ${resolvedTheme === "dark" ? "dark" : ""}`}
      dangerouslySetInnerHTML={{ __html: svgContent }}
      aria-label={name}
    />
  );
};
