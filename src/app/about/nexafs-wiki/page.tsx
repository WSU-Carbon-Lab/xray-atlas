/**
 * About segment documenting planned NEXAFS terminology and interpretation guides.
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "NEXAFS Wiki (WIP)",
  description:
    "Work-in-progress NEXAFS wiki for spectroscopy concepts, interpretation patterns, and terminology used in Xray Atlas.",
};

export default function NexafsWikiPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-foreground text-4xl font-bold">NEXAFS wiki (work in progress)</h1>
        <p className="text-muted">
          This page is the seed for a practical NEXAFS reference in Xray Atlas.
          It will document the core spectroscopy concepts used across the
          database and link those concepts directly to the data fields shown in
          browse and detail pages.
        </p>
        <div className="border-border bg-surface rounded-lg border p-4">
          <h2 className="text-foreground mb-2 text-xl font-semibold">
            Planned sections
          </h2>
          <ul className="text-muted ml-6 list-disc space-y-1">
            <li>Core-edge notation and element-specific interpretation</li>
            <li>Detection modes (TEY, PEY, FY, transmission)</li>
            <li>Polarization geometry and angle-dependent comparisons</li>
            <li>Normalization approaches and analysis caveats</li>
            <li>Peak assignment language and common conventions</li>
          </ul>
        </div>
        <p className="text-muted">
          For immediate data exploration, go to{" "}
          <Link href="/browse/nexafs" className="text-accent hover:underline">
            Browse NEXAFS
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
