/**
 * Wiki route documenting real-user performance monitoring via Vercel Speed Insights,
 * aligned with product instrumentation and reserving UI slots for future metric widgets.
 */

import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";
import { site } from "~/app/brand";

const VERCEL_SPEED_INSIGHTS_METRICS =
  "https://vercel.com/docs/speed-insights/metrics";
const VERCEL_SPEED_INSIGHTS_FCP =
  "https://vercel.com/docs/speed-insights/metrics#first-contentful-paint-fcp";

export const metadata: Metadata = {
  title: "Data Insights",
  description: `${site.name} uses Vercel Speed Insights for Core Web Vitals and related metrics—overview of RES, targets, percentiles, and links to official documentation.`,
  alternates: {
    canonical: "/wiki/data-insights",
  },
};

/**
 * Permanent skeleton chrome reserving layout for Speed Insights-style charts and tiles until dedicated HeroUI metric surfaces ship.
 */
function SpeedInsightsMetricSkeletonPreview(): ReactElement {
  return (
    <div
      className="border-border bg-surface rounded-xl border p-4"
      aria-hidden="true"
    >
      <p className="text-muted mb-4 text-xs">
        Reserved layout for live charts and percentile summaries sourced from Vercel Speed Insights (non-interactive
        placeholder).
      </p>
      <div className="bg-muted mb-5 h-28 animate-pulse rounded-lg" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="border-border bg-background rounded-lg border p-3">
          <div className="bg-muted mb-3 h-3 w-24 animate-pulse rounded" />
          <div className="bg-muted mb-2 h-8 w-20 animate-pulse rounded-md" />
          <div className="bg-muted h-2 w-full animate-pulse rounded-full" />
        </div>
        <div className="border-border bg-background rounded-lg border p-3">
          <div className="bg-muted mb-3 h-3 w-28 animate-pulse rounded" />
          <div className="bg-muted mb-2 h-8 w-16 animate-pulse rounded-md" />
          <div className="bg-muted h-2 w-full animate-pulse rounded-full" />
        </div>
        <div className="border-border bg-background rounded-lg border p-3 sm:col-span-2 lg:col-span-1">
          <div className="bg-muted mb-3 h-3 w-32 animate-pulse rounded" />
          <div className="bg-muted mb-2 h-8 w-14 animate-pulse rounded-md" />
          <div className="bg-muted h-2 w-full animate-pulse rounded-full" />
        </div>
      </div>
      <div className="border-border mt-4 grid gap-2 rounded-lg border border-dashed p-3">
        <div className="bg-muted h-3 animate-pulse rounded" />
        <div className="bg-muted h-3 w-[92%] animate-pulse rounded" />
        <div className="bg-muted h-3 w-[78%] animate-pulse rounded" />
      </div>
    </div>
  );
}

export default function DataInsightsWikiPage(): ReactElement {
  return (
    <div className="w-full min-w-0 space-y-6">
      <h1 className="text-foreground text-4xl font-bold">Data Insights</h1>
      <p className="text-muted">
        This hub describes how {site.name} treats visitor-facing performance: real-device telemetry collected through{" "}
        <strong className="text-foreground font-semibold">Vercel Speed Insights</strong>, the metrics vocabulary shared
        with Core Web Vitals, and how scores summarize experiences across deployments. Operational dashboards stay in
        the Vercel project; this page explains what those signals mean for collaborators reviewing regressions after UI
        or routing changes.
      </p>

      <section
        className="border-border bg-surface rounded-lg border p-4"
        aria-labelledby="live-metrics-preview"
      >
        <h2 id="live-metrics-preview" className="text-foreground mb-2 text-lg font-semibold">
          Live metrics preview
        </h2>
        <p className="text-muted mb-4 text-sm">
          The blocks below are <strong className="text-foreground font-medium">permanent skeletons</strong>: they hold
          the eventual footprint for embedded charts and KPI tiles once shared HeroUI metric primitives land.
          Until then they deliberately mimic loading states so reviewers validate spacing without swapping layouts twice.
        </p>
        <SpeedInsightsMetricSkeletonPreview />
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="speed-insights-overview" className="text-foreground mb-2 text-lg font-semibold">
          Speed Insights overview
        </h2>
        <p className="text-muted text-sm">
          Speed Insights captures measurements from actual visits rather than synthetic lab runs alone (labs remain
          complementary tools such as Lighthouse). Timestamps inside Vercel&apos;s Speed Insights UI render in{" "}
          <strong className="text-foreground font-medium">local time</strong> relative to the viewer, not UTC, when you
          cross-check incidents against deployment timelines.
        </p>
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="real-experience-score" className="text-foreground mb-2 text-lg font-semibold">
          Real Experience Score (RES)
        </h2>
        <p className="text-muted text-sm">
          RES summarizes perceived speed using empirical distributions sourced via HTTP Archive: each metric maps into a
          0–100 partial score before aggregation into an overall RES weighted toward mobile and desktop realities Vercel
          publishes for Speed Insights. After deployments ship, RES trending confirms whether UX improves or regresses in
          production—not merely under synthetic Lighthouse presets.
        </p>
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="core-web-vitals" className="text-foreground mb-2 text-lg font-semibold">
          Core Web Vitals on Speed Insights
        </h2>
        <p className="text-muted mb-3 text-sm">
          Speed Insights aligns naming with Google and WebPerf steering docs for clarity across tooling teams. The table
          below mirrors guidance thresholds summarized from{" "}
          <a
            href={VERCEL_SPEED_INSIGHTS_METRICS}
            className="text-accent hover:underline"
            rel="noopener noreferrer"
          >
            Vercel&apos;s Speed Insights metrics reference
          </a>
          , including{" "}
          <a href={VERCEL_SPEED_INSIGHTS_FCP} className="text-accent hover:underline" rel="noopener noreferrer">
            First Contentful Paint (FCP)
          </a>
          , which marks when the first DOM-backed pixels paint—typically text, inline imagery, or canvas output—with{" "}
          <strong className="text-foreground font-medium">1.8 seconds or faster</strong> treated as the documented target.
        </p>
        <div className="border-border overflow-x-auto rounded-lg border">
          <table className="text-muted w-full min-w-[36rem] text-left text-xs">
            <thead className="bg-default text-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Metric</th>
                <th className="px-3 py-2 font-semibold">Intent</th>
                <th className="px-3 py-2 font-semibold">Documented target</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              <tr>
                <td className="text-foreground px-3 py-2 font-medium">LCP</td>
                <td className="px-3 py-2">Time until the largest visible element completes rendering.</td>
                <td className="px-3 py-2">≤ 2.5 s</td>
              </tr>
              <tr>
                <td className="text-foreground px-3 py-2 font-medium">CLS</td>
                <td className="px-3 py-2">Cumulative unexpected layout movement.</td>
                <td className="px-3 py-2">≤ 0.1</td>
              </tr>
              <tr>
                <td className="text-foreground px-3 py-2 font-medium">INP</td>
                <td className="px-3 py-2">Latency from interaction until the next painted frame.</td>
                <td className="px-3 py-2">≤ 200 ms</td>
              </tr>
              <tr>
                <td className="text-foreground px-3 py-2 font-medium">FCP</td>
                <td className="px-3 py-2">Time until first DOM content paints.</td>
                <td className="px-3 py-2">≤ 1.8 s</td>
              </tr>
              <tr>
                <td className="text-foreground px-3 py-2 font-medium">FID</td>
                <td className="px-3 py-2">Delay between first input and main-thread response.</td>
                <td className="px-3 py-2">≤ 100 ms</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="other-metrics" className="text-foreground mb-2 text-lg font-semibold">
          Additional metrics (TBT, TTFB)
        </h2>
        <p className="text-muted text-sm">
          Speed Insights also exposes supporting diagnostics such as Total Blocking Time (TBT), quantifying main-thread
          stalls between First Contentful Paint and Time to Interactive, and Time to First Byte (TTFB), covering server
          plus network latency until the first response byte arrives. Virtual Experience Score integrations may substitute
          TBT where lab checks replace FID-style measurements—consult marketplace deployment checks when interpreting VES
          alongside RES.
        </p>
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="how-scores-work" className="text-foreground mb-2 text-lg font-semibold">
          How scores are determined
        </h2>
        <p className="text-muted text-sm">
          Individual metric values convert into 0–100 scores by comparing raw timings against log-normal models fitted to
          HTTP Archive cohorts. Example from Vercel&apos;s docs: an LCP near ~1220 ms historically aligns with a 99-point
          partial score. RES blends those partial scores with fixed weights tuned for perceived responsiveness on mobile and
          desktop form factors.
        </p>
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="data-points-percentiles" className="text-foreground mb-2 text-lg font-semibold">
          Data points and percentiles
        </h2>
        <p className="text-muted mb-3 text-sm">
          Hard navigations (initial Next.js page loads per session) emit up to six datapoints across lifecycle phases:
          load metrics include TTFB and FCP; interactions contribute FID and often LCP; leaving the page may dispatch INP,
          CLS, and LCP if not previously recorded—exact combinations vary with user behavior.
        </p>
        <p className="text-muted text-sm">
          Charts default to <strong className="text-foreground font-medium">P75</strong>, representing the fastest 75% of
          sessions (excluding the slowest quartile). Switching to P90, P95, or P99 tightens or widens the tail sensitivity
          when investigating outliers versus typical UX.
        </p>
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="interpreting-scores" className="text-foreground mb-2 text-lg font-semibold">
          Interpreting composite scores
        </h2>
        <p className="text-muted mb-3 text-sm">
          Color buckets align with Google UX reporting conventions on Speed Insights: roughly{" "}
          <strong className="text-foreground font-medium">0–49</strong> (poor),{" "}
          <strong className="text-foreground font-medium">50–89</strong> (needs improvement),{" "}
          <strong className="text-foreground font-medium">90–100</strong> (good). Crossing bucket boundaries tends to
          matter more for SEO narratives than micro-adjustments inside the same band.
        </p>
        <p className="text-muted text-sm">
          Virtual Experience Score complements RES by forecasting regressions through integrations running deployment
          checks; RES stays authoritative once traffic reaches statistical significance.
        </p>
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="official-documentation" className="text-foreground mb-2 text-lg font-semibold">
          Official documentation
        </h2>
        <p className="text-muted mb-3 text-sm">
          Keep Vercel&apos;s canonical Speed Insights metrics guide bookmarked for threshold updates, scoring migrations,
          and dashboard workflows beyond what this wiki summarizes.
        </p>
        <ul className="text-muted list-inside list-disc space-y-2 text-sm">
          <li>
            <a href={VERCEL_SPEED_INSIGHTS_METRICS} className="text-accent hover:underline" rel="noopener noreferrer">
              Speed Insights metrics (full reference)
            </a>
          </li>
          <li>
            <a href={VERCEL_SPEED_INSIGHTS_FCP} className="text-accent hover:underline" rel="noopener noreferrer">
              First Contentful Paint (FCP) anchor on the metrics page
            </a>
          </li>
          <li>
            <a
              href="https://vercel.com/docs/speed-insights/using-speed-insights"
              className="text-accent hover:underline"
              rel="noopener noreferrer"
            >
              Using Speed Insights (dashboard walkthrough)
            </a>
          </li>
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/wiki/home"
          className="border-border bg-surface text-foreground rounded-lg border px-4 py-2 text-sm font-medium"
        >
          Wiki home
        </Link>
        <Link
          href="/wiki/platform-features"
          className="border-border bg-surface text-foreground rounded-lg border px-4 py-2 text-sm font-medium"
        >
          Platform features
        </Link>
      </div>
    </div>
  );
}
