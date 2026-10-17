import type { ReactElement } from "react";
import Link from "next/link";
import { site } from "~/app/brand";

const BLURRED_NODES = [
  "5.3.2.2",
  "7.0.1.2",
  "8.0.1",
  "10.3.2",
  "6.3.2",
  "12.0.1",
] as const;

/**
 * Coming-soon schematic: ALS beamlines feed the facility-wide data storage
 * layer, which flows into the Atlas. Only ALS 11.0.1.2 and its data path are
 * in focus; everything else is blurred and desaturated. Static and decorative;
 * the surrounding prose carries the meaning for assistive technology.
 */
export function HomeFacilitiesView(): ReactElement {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="border-border text-muted rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase">
          Coming soon
        </span>
        <p className="text-muted text-sm">Instrument integration</p>
      </div>
      <p className="text-foreground max-w-prose text-lg leading-8">
        Soon, measurements taken at the Advanced Light Source will reach the{" "}
        {site.name} directly from the facility&apos;s data systems: calibrated,
        attributed, and ready to compare.
      </p>
      <p className="sr-only">
        ALS beamline 11.0.1.2 is the first planned integration, in early access.
        Its data will flow through the facility-wide data storage layer into{" "}
        {site.name}.
      </p>
      <div className="home-facility" aria-hidden>
        <p className="home-kicker home-facility__dim col-span-full">
          Advanced Light Source
        </p>
        {BLURRED_NODES.map((n) => (
          <span
            key={n}
            className="home-facility__dim border-foreground/40 bg-foreground/5 text-foreground rounded-lg border px-1 py-3 text-center text-xs"
          >
            {n}
          </span>
        ))}
        <div className="home-facility__focus">
          <span className="border-accent bg-surface text-foreground rounded-lg border px-2 py-2 text-xs font-semibold whitespace-nowrap shadow-sm sm:px-3 sm:text-sm">
            ALS 11.0.1.2
          </span>
          <span className="text-accent text-[0.625rem] font-semibold tracking-[0.16em] uppercase">
            early access
          </span>
        </div>
        <div className="home-facility__storage">
          <div className="home-facility__dim border-foreground/40 bg-foreground/5 text-foreground rounded-2xl border border-dashed p-4 text-center text-sm">
            ALS facility-wide data storage
          </div>
          <svg
            viewBox="0 0 8 100"
            preserveAspectRatio="none"
            className="home-facility__path"
            aria-hidden
          >
            <line
              x1="4"
              y1="0"
              x2="4"
              y2="100"
              className="home-dataflow stroke-accent"
              strokeWidth="2"
              strokeDasharray="6 6"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
        <span className="home-facility__atlas">{site.name}</span>
      </div>
      <p className="text-muted text-sm">
        Following along? See the{" "}
        <Link href="/about/roadmap" className="text-accent">
          roadmap
        </Link>
        .
      </p>
    </div>
  );
}
