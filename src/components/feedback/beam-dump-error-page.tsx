"use client";

import Link from "next/link";
import {
  ArrowPathIcon,
  BookOpenIcon,
  HomeIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { attribution, site } from "~/app/brand";
import { buildBugReportIssueUrl } from "~/lib/github-beamline-issues";
import { DefaultButton as Button } from "~/components/ui/button";

/** Beam-dump error surfaces aligned with synchrotron status-page tone. */
export type BeamDumpErrorVariant = "not-found" | "server" | "generic";

type BeamDumpErrorCopy = {
  statusLabel: string;
  headline: string;
  subcopy: string;
  issueTitle: string;
};

const BEAM_DUMP_COPY: Record<BeamDumpErrorVariant, BeamDumpErrorCopy> = {
  "not-found": {
    statusLabel: "404",
    headline: "Oh no, the beam dumped",
    subcopy:
      "This page went dark. We are investigating why the route lost signal.",
    issueTitle: "404: page not found",
  },
  server: {
    statusLabel: "500",
    headline: "Beam instability detected",
    subcopy:
      "Something interrupted the photon stream on our side. The operators are looking into it.",
    issueTitle: "500: server error",
  },
  generic: {
    statusLabel: "Fault",
    headline: "Signal lost",
    subcopy:
      "An unexpected fault interrupted this request before it could finish.",
    issueTitle: "Unexpected application error",
  },
};

export type BeamDumpErrorPageProps = {
  /** Selects headline, status label, and default issue title. */
  variant?: BeamDumpErrorVariant;
  /** Optional retry handler for segment `error.tsx` boundaries. */
  onRetry?: () => void;
  /** Overrides the variant status chip (for example a route-specific code). */
  statusLabel?: string;
  /** Overrides the variant headline while keeping beam-dump voice. */
  headline?: string;
  /** Overrides the variant subcopy while keeping beam-dump voice. */
  subcopy?: string;
  /** Overrides the default GitHub issue title for this variant. */
  issueTitle?: string;
};

/**
 * Renders a lightweight oscilloscope illustration: a live trace fades as a flatline draws in,
 * evoking a beam dump without heavy animation dependencies.
 */
export function BeamDumpOscilloscope() {
  return (
    <div className="beam-dump-scope mx-auto w-full max-w-sm" aria-hidden>
      <div className="beam-dump-scope__pulse" />
      <div className="beam-dump-scope__screen px-3 py-4">
        <svg
          viewBox="0 0 320 120"
          className="h-auto w-full"
          role="presentation"
        >
          <rect
            x="0"
            y="0"
            width="320"
            height="120"
            className="fill-surface-secondary/40"
            rx="8"
          />
          {[24, 48, 72, 96].map((y) => (
            <line
              key={y}
              x1="16"
              y1={y}
              x2="304"
              y2={y}
              className="stroke-muted/25"
              strokeWidth="1"
            />
          ))}
          <line
            x1="16"
            y1="60"
            x2="304"
            y2="60"
            className="stroke-muted/40"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
          <path
            className="beam-dump-scope__live-trace stroke-accent"
            d="M 24 60 C 48 36, 72 84, 96 60 S 144 36, 168 60 S 216 84, 240 60 S 276 42, 296 60"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            className="beam-dump-scope__flatline stroke-danger"
            x1="40"
            y1="60"
            x2="280"
            y2="60"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
        <p className="text-muted mt-2 text-center font-mono text-[0.65rem] tracking-[0.2em] uppercase">
          Beam status: investigating
        </p>
      </div>
    </div>
  );
}

/**
 * Full-page beam-dump error experience for App Router `not-found`, `error`, and `global-error`
 * surfaces. Keeps site chrome via the root layout while supplying beamline voice, help links,
 * and navigation actions.
 */
export function BeamDumpErrorPage({
  variant = "generic",
  onRetry,
  statusLabel,
  headline,
  subcopy,
  issueTitle,
}: BeamDumpErrorPageProps) {
  const copy = BEAM_DUMP_COPY[variant];
  const resolvedStatus = statusLabel ?? copy.statusLabel;
  const resolvedHeadline = headline ?? copy.headline;
  const resolvedSubcopy = subcopy ?? copy.subcopy;
  const reportUrl = buildBugReportIssueUrl(issueTitle ?? copy.issueTitle);

  return (
    <section
      className="flex flex-1 flex-col items-center justify-center py-12 sm:py-16"
      aria-labelledby="beam-dump-error-heading"
    >
      <div className="border-border bg-surface w-full max-w-2xl rounded-2xl border p-6 shadow-sm sm:p-10">
        <div className="flex flex-col items-center gap-8 text-center">
          <BeamDumpOscilloscope />

          <div className="space-y-3">
            <p className="text-accent font-mono text-xs font-semibold tracking-[0.24em] uppercase">
              {resolvedStatus}
            </p>
            <h1
              id="beam-dump-error-heading"
              className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              {resolvedHeadline}
            </h1>
            <p className="text-muted mx-auto max-w-lg text-sm leading-relaxed sm:text-base">
              {resolvedSubcopy}
            </p>
          </div>

          <div className="flex w-full flex-col flex-wrap justify-center gap-3 sm:flex-row">
            <Link href="/">
              <Button variant="primary">
                <HomeIcon className="h-4 w-4" aria-hidden />
                <span>Return home</span>
              </Button>
            </Link>
            <Link href="/browse">
              <Button variant="outline">
                <MagnifyingGlassIcon className="h-4 w-4" aria-hidden />
                <span>Browse catalog</span>
              </Button>
            </Link>
            {onRetry ? (
              <Button variant="outline" onPress={onRetry}>
                <ArrowPathIcon className="h-4 w-4" aria-hidden />
                <span>Try again</span>
              </Button>
            ) : null}
          </div>

          <div className="border-border w-full border-t pt-6 text-left">
            <h2 className="text-foreground text-sm font-semibold">
              Need help?
            </h2>
            <ul className="text-muted mt-3 space-y-2 text-sm leading-relaxed">
              <li>
                <a
                  href={reportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  Report this on GitHub
                </a>{" "}
                so the {site.name} maintainers can track it.
              </li>
              <li>
                <Link href="/wiki" className="text-accent hover:underline">
                  <BookOpenIcon
                    className="mr-1 inline h-4 w-4 align-[-2px]"
                    aria-hidden
                  />
                  Read the wiki
                </Link>{" "}
                for platform docs and troubleshooting context.
              </li>
              <li>
                Questions about stewardship? Contact{" "}
                <a
                  href={attribution.labUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  {attribution.labFull}
                </a>
                , which hosts {site.name}.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
