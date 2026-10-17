"use client";

import { useCallback, useState, type ReactElement } from "react";
import Link from "next/link";
import { Tabs } from "@heroui/react";
import type {
  HomeSnapshotSpectrum,
  HomeSpectrumTabId,
} from "../snapshot/types";
import { HomeSpectrumFigure } from "./home-spectrum-figure";

/** One curated spectrum; feature tabs restyle the same plot. */
export function HomeSpectraView({
  spectrum,
}: {
  spectrum: HomeSnapshotSpectrum;
}): ReactElement {
  const [tabId, setTabId] = useState<HomeSpectrumTabId>(spectrum.tabs[0]!.id);
  const onSelectionChange = useCallback((k: React.Key) => {
    queueMicrotask(() => setTabId(String(k) as HomeSpectrumTabId));
  }, []);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-muted text-sm">
          {spectrum.title} ·{" "}
          <Link
            className="text-accent"
            href={`/molecules/${spectrum.moleculeSlug}?nexafsExperiment=${spectrum.experimentId}`}
          >
            open dataset
          </Link>
        </p>
      </div>
      <Tabs selectedKey={tabId} onSelectionChange={onSelectionChange}>
        <Tabs.ListContainer>
          <Tabs.List aria-label="Spectrum features">
            {spectrum.tabs.map((t) => (
              <Tabs.Tab key={t.id} id={t.id}>
                {t.label}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        {spectrum.tabs.map((t) => (
          <Tabs.Panel
            key={t.id}
            id={t.id}
            className="grid gap-6 pt-4 lg:grid-cols-[minmax(0,1fr)_16rem]"
          >
            <HomeSpectrumFigure spectrum={spectrum} tab={t} />
            <div className="space-y-3">
              <p className="text-foreground leading-7">{t.caption}</p>
              <Link
                href={t.wikiHref}
                className="text-accent text-sm font-medium"
              >
                Read more in the wiki
              </Link>
            </div>
          </Tabs.Panel>
        ))}
      </Tabs>
    </div>
  );
}
