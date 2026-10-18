"use client";

import { useMemo, useState, type ReactElement } from "react";
import { HOME_SNAPSHOT } from "../snapshot/home-snapshot.generated";
import type {
  HomeSnapshotSpectrum,
  HomeSpectrumBand,
  HomeSpectrumTab,
} from "../snapshot/types";
import { HomeDisplayTabs } from "../stage/home-display-tabs";
import { HomeStagePreview } from "../stage/home-stage-preview";
import { scatteringFactorsTab, susceptibilityTab } from "./home-optical-asf";
import { HomeSpectrumFigure } from "./home-spectrum-figure";

const DISPLAYS = [
  { id: "spectra", label: "Spectra" },
  { id: "processing", label: "Processing" },
  { id: "index", label: "β, δ" },
  { id: "asf", label: "f₁, f₂" },
  { id: "chi", label: "χ" },
] as const;

type DisplayId = (typeof DISPLAYS)[number]["id"];

function tabById(
  spectrum: HomeSnapshotSpectrum,
  id: HomeSpectrumTab["id"],
): HomeSpectrumTab | undefined {
  return spectrum.tabs.find((item) => item.id === id);
}

/** Right edge of the near-edge window, just past the sigma* band. */
function edgeFocusMaxX(bands: readonly HomeSpectrumBand[]): number | undefined {
  const sigma = bands.find((band) => band.kind === "sigma");
  if (!sigma) return undefined;
  return sigma.x1 + 28;
}

/**
 * Angle-resolved NEXAFS for the home Data feature: every polarization on one
 * near-edge window, without band shading or an isosbestic marker.
 */
function spectraTab(spectrum: HomeSnapshotSpectrum): HomeSpectrumTab {
  const polarization = tabById(spectrum, "polarization");
  const base = polarization ?? spectrum.tabs[0]!;
  return {
    ...base,
    caption:
      "Angle-resolved NEXAFS spectroscopy data, measuring the polarization-dependent optical response.",
    bands: [],
    markers: [],
  };
}

/**
 * Stored processing chart: experimental β, the Henke bare-atom step, pre- and
 * post-edge windows, and the π* / σ* callouts. Falls back to the optical tab
 * when a snapshot was generated before that tab existed.
 */
function processingTab(spectrum: HomeSnapshotSpectrum): HomeSpectrumTab {
  const stored = tabById(spectrum, "processing");
  if (stored) return stored;
  const optical = tabById(spectrum, "optical") ?? spectrum.tabs[0]!;
  return {
    ...optical,
    caption:
      "β pinned to the bare-atom step. Hatched bands are the pre- and post-edge windows; π* and σ* name the peaks.",
    yLabel: "β",
    bands: [],
    markers: [],
    refLines: [],
  };
}

/**
 * Refractive index for one dataset. β is the absorptive part; δ is the
 * dispersive part from the Kramers-Kronig transform.
 */
function opticalTab(spectrum: HomeSnapshotSpectrum): HomeSpectrumTab {
  const optical = tabById(spectrum, "optical") ?? spectrum.tabs[0]!;
  return {
    ...optical,
    caption:
      "Refractive index of this spectrum. β is the absorptive part; δ follows by a Kramers-Kronig transform.",
    yLabel: "β, δ",
    bands: [],
    markers: [],
  };
}

/**
 * Dataset preview for the home Data feature.
 *
 * `spectrum` is the curated snapshot. Spectra shows every polarization on the
 * near-edge window. Processing shows the stored β chart with the bare-atom
 * step, normalization windows, and peak callouts on the full energy axis.
 * β, δ, f₁, f₂, and χ stay on the near-edge window. χ is the susceptibility
 * computed from the stored index. The plot
 * frame keeps the same box for every display.
 */
export function HomeSpectraView({
  spectrum,
}: {
  spectrum: HomeSnapshotSpectrum;
}): ReactElement {
  const [display, setDisplay] = useState<DisplayId>("spectra");
  const formula =
    spectrum.moleculeSlug === HOME_SNAPSHOT.showcaseMolecule.slug
      ? HOME_SNAPSHOT.showcaseMolecule.formula
      : (HOME_SNAPSHOT.molecules.find(
          (molecule) => molecule.slug === spectrum.moleculeSlug,
        )?.formula ?? "");
  const asf = useMemo(
    () => scatteringFactorsTab(spectrum, formula),
    [spectrum, formula],
  );
  const chi = useMemo(() => susceptibilityTab(spectrum), [spectrum]);
  const displays = DISPLAYS.filter(
    (item) => (item.id !== "asf" || asf) && (item.id !== "chi" || chi),
  );
  const shown =
    display === "processing"
      ? processingTab(spectrum)
      : display === "index"
        ? opticalTab(spectrum)
        : display === "asf" && asf
          ? asf
          : display === "chi" && chi
            ? chi
            : spectraTab(spectrum);
  const focusMaxX =
    display === "processing"
      ? undefined
      : edgeFocusMaxX(tabById(spectrum, "absorption")?.bands ?? []);
  return (
    <HomeStagePreview caption={shown.caption}>
      <div className="flex h-full min-h-0 flex-col gap-3">
        <HomeDisplayTabs
          label="Dataset display"
          tabs={displays}
          value={display}
          onChange={setDisplay}
          idPrefix="home-data"
          controls="home-spectrum-figure"
        />
        <div className="relative min-h-0 flex-1">
          <HomeSpectrumFigure
            spectrum={spectrum}
            tab={shown}
            focusMaxX={focusMaxX}
          />
        </div>
      </div>
    </HomeStagePreview>
  );
}
