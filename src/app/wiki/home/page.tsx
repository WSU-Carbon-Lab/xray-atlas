/**
 * Wiki home route: canonical NEXAFS terminology and interpretation primer for Xray Atlas.
 */

import type { ComponentType } from "react";
import type { Metadata } from "next";
import { NexafsCoreAbsorptionSchematic } from "~/components/nexafs/nexafs-core-absorption-schematic";
import {
  BeakerIcon,
  BookOpenIcon,
  CubeTransparentIcon,
  ScaleIcon,
} from "@heroicons/react/24/outline";

export const metadata: Metadata = {
  title: "Wiki home",
  description:
    "NEXAFS reference for terminology, scientific targets, and interpretation context used across the Xray Atlas spectroscopy database.",
};

const terminologyCards = [
  {
    short: "NEXAFS",
    full: "Near-Edge X-ray Absorption Fine Structure",
    body:
      "Preferred term on Xray Atlas. Emphasizes fine structure in the near-edge region arising from local bonding and electronic structure.",
  },
  {
    short: "XANES",
    full: "X-ray Absorption Near-Edge Structure",
    body:
      "Widely used synonym in XAS communities. In practice, NEXAFS and XANES often describe overlapping energy ranges and interpretation goals.",
  },
  {
    short: "NEXS",
    full: "Near-Edge X-ray Spectroscopy",
    body:
      "Compact label used by some groups; treated here as near-edge absorption spectroscopy in the same family as NEXAFS.",
  },
  {
    short: "XAS",
    full: "X-ray Absorption Spectroscopy",
    body:
      "Umbrella label for absorption experiments spanning near-edge and extended regimes.",
  },
  {
    short: "XAFS",
    full: "X-ray Absorption Fine Structure",
    body:
      "Structured modulation of absorption versus energy above an edge; commonly partitioned into the near-edge window (NEXAFS/XANES) and the extended oscillatory region (EXAFS).",
  },
  {
    short: "EXAFS",
    full: "Extended X-ray Absorption Fine Structure",
    body:
      "Higher-energy oscillatory structure past the near-edge region, typically modeled with different physics than core resonances.",
  },
] as const;

function SectionHeader({
  icon: Icon,
  title,
  id,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  id?: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="bg-accent/15 text-accent mt-0.5 inline-flex rounded-lg p-2">
        <Icon className="h-5 w-5 shrink-0" aria-hidden />
      </span>
      <h2 className="text-foreground text-xl font-semibold tracking-tight" id={id}>
        {title}
      </h2>
    </div>
  );
}

export default function NexafsWikiPage() {
  return (
    <div className="w-full min-w-0 space-y-10">
        <header className="@container border-border bg-surface/80 relative overflow-hidden rounded-2xl border px-6 py-8 sm:px-8 lg:py-10">
          <h1 className="text-foreground text-3xl font-bold sm:text-4xl">
            Home
          </h1>
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            aria-hidden
          >
            <div className="from-accent/40 absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br to-transparent blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-gradient-to-tr from-violet-500/30 to-transparent blur-3xl" />
          </div>
          <div className="relative flex w-full min-w-0 flex-col gap-6 @lg:flex-row @lg:items-center @lg:gap-8">
            <div className="min-w-0 space-y-4 @lg:min-w-0 @lg:flex-[1.05_1_0]">
              <p className="text-muted max-w-[65ch] text-base leading-relaxed sm:text-lg @lg:max-w-none">
                Near-edge X-ray absorption fine structure (NEXAFS) is an
                element-specific method that probes transitions from core electronic
                states into unoccupied bound and quasi-bound states near an
                absorption edge (for example carbon, nitrogen, or sulfur K-edges).
                This page anchors terminology for Xray Atlas so spectra and
                metadata are read consistently across molecules, instruments, and
                facilities.
              </p>
            </div>
            <div className="min-w-0 w-full @lg:flex-[1.22_1_0]">
              <NexafsCoreAbsorptionSchematic presentation="hero" className="min-h-0" />
            </div>
          </div>
        </header>

        <section
          className="border-border bg-surface rounded-2xl border p-6 sm:p-8"
          aria-labelledby="terminology-heading"
        >
          <SectionHeader
            icon={BookOpenIcon}
            title="The zoo of names for the same idea"
            id="terminology-heading"
          />
          <p className="text-muted mb-6 max-w-none">
            X-ray spectroscopy communities use several labels for closely related
            near-edge measurements. Below is how Xray Atlas uses each term when
            indexing and describing datasets.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {terminologyCards.map((term) => (
              <article
                key={term.short}
                className="border-border bg-default/40 hover:border-accent/30 rounded-xl border p-4 transition-colors"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-accent font-mono text-sm font-semibold tracking-wide">
                    {term.short}
                  </span>
                  <span className="text-muted text-xs">{term.full}</span>
                </div>
                <p className="text-muted mt-3 text-sm leading-relaxed">{term.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-border bg-surface rounded-2xl border p-6 sm:p-8">
          <SectionHeader icon={BeakerIcon} title="What NEXAFS probes" id="nexafs-probes" />
          <ul className="text-muted ml-6 list-disc space-y-2 marker:text-accent">
            <li>
              Electronic structure at a chosen core edge (K, L, M edges and
              element-specific channels).
            </li>
            <li>
              Chemical and oxidation-state sensitivity via edge position, edge
              shape, and near-edge resonances.
            </li>
            <li>
              Orientation and molecular order when spectra are collected with
              defined polarization or angle-resolved geometry.
            </li>
            <li>
              Structure-property relationships in thin films, polymers,
              interfaces, and soft-matter systems common in synchrotron programs.
            </li>
          </ul>
        </section>

        <section className="border-border bg-surface rounded-2xl border p-6 sm:p-8">
          <SectionHeader
            icon={CubeTransparentIcon}
            title="Representations stored in Xray Atlas"
            id="representations-stored"
          />
          <p className="text-muted mb-6 max-w-none">
            NEXAFS measures X-ray absorption versus incident energy (and often
            versus geometry). The catalog exposes comparable traces using the
            conventions below.
          </p>
          <ul className="space-y-4">
            <li className="border-border bg-default/40 rounded-xl border px-4 py-3">
              <strong className="text-foreground">
                Mass absorption coefficient (μ){" "}
                <span className="text-muted font-normal">
                  [cm<sup>2</sup>/g]
                </span>
              </strong>
              <p className="text-muted mt-2 text-sm leading-relaxed">
                A standard absorption-related quantity tied to Beer-Lambert style
                attenuation. Where bare-atom normalization is applied, pre-edge and
                post-edge regions are anchored to bare-atom references.
              </p>
            </li>
            <li className="border-border bg-default/40 rounded-xl border px-4 py-3">
              <strong className="text-foreground">Optical density (OD)</strong>
              <p className="text-muted mt-2 text-sm leading-relaxed">
                Proportional to mass absorption up to experimental factors. In
                Xray Atlas, OD naming denotes traces scaled so the pre-edge trends
                toward zero and the post-edge trends toward one after the chosen
                normalization workflow.
              </p>
            </li>
            <li className="border-border bg-default/40 rounded-xl border px-4 py-3">
              <strong className="text-foreground">
                Beta (β) / index of refraction
              </strong>
              <p className="text-muted mt-2 text-sm leading-relaxed">
                Following common X-ray optics notation{" "}
                <span className="font-mono text-xs">n = 1 - δ + iβ</span>, with β
                tied to absorption. Normalization may reference bare-atom β in
                pre-edge and post-edge windows analogously to μ.
              </p>
            </li>
          </ul>
        </section>

        <section className="border-border bg-surface rounded-2xl border p-6 sm:p-8">
          <SectionHeader icon={ScaleIcon} title="Coordinates and units" id="coordinates-and-units" />
          <ul className="text-muted ml-6 list-disc space-y-2 marker:text-accent">
            <li>
              <span className="text-foreground font-medium">Energy:</span>{" "}
              photon energy is reported in electron volts (eV) for browse,
              download, and API-aligned workflows.
            </li>
            <li>
              <span className="text-foreground font-medium">Geometry:</span>{" "}
              polarization and sample orientation use the theta and phi metadata
              captured on experiments when angle-resolved data are submitted.
            </li>
            <li>
              <span className="text-foreground font-medium">Detection:</span>{" "}
              modality metadata (for example TEY, PEY, FY, transmission) distinguishes
              comparable traces collected under different instrumental coupling.
            </li>
          </ul>
        </section>
    </div>
  );
}
