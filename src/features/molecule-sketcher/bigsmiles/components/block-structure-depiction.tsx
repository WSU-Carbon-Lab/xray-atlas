"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { Molecule } from "openchemlib";

import { applyMoleculeSvgCpkThemeToElement } from "~/lib/molecule-svg-cpk-theme";

type BlockStructureDepictionProps = {
  fragmentSmiles: string;
  width: number;
  height: number;
  svgId: string;
  accentColor: string;
  showAccent: boolean;
};

/**
 * Renders a fragment SMILES string as a themed 2D SVG depiction inside a card frame.
 */
export function BlockStructureDepiction({
  fragmentSmiles,
  width,
  height,
  svgId,
  accentColor,
  showAccent,
}: BlockStructureDepictionProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mol: Molecule;
    try {
      mol = Molecule.fromSmiles(fragmentSmiles);
    } catch {
      return;
    }
    const svg = mol.toSVG(width, height, svgId, {});
    const host = hostRef.current;
    if (!host) {
      return;
    }
    host.innerHTML = svg;
    const el = host.querySelector("svg");
    if (el) {
      applyMoleculeSvgCpkThemeToElement(el, isDark);
    }
  }, [fragmentSmiles, width, height, svgId, isDark]);

  return (
    <div
      className="border-border bg-surface overflow-hidden rounded-md border"
      style={{
        borderWidth: showAccent ? 3 : 1,
        borderColor: showAccent ? accentColor : undefined,
      }}
    >
      <div
        ref={hostRef}
        className="flex min-h-[120px] items-center justify-center [&_svg]:max-h-full [&_svg]:w-auto"
      />
    </div>
  );
}
