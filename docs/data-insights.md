# Data Insights

This document describes how X-ray Atlas treats visitor-facing performance: real-device telemetry collected through **Vercel Speed Insights**, the metrics vocabulary shared with Core Web Vitals, and how scores summarize experiences across deployments. Operational dashboards stay in the Vercel project; this page explains what those signals mean for collaborators reviewing regressions after UI or routing changes.

## Speed Insights overview

Speed Insights captures measurements from actual visits rather than synthetic lab runs alone (labs remain complementary tools such as Lighthouse). Timestamps inside Vercel's Speed Insights UI render in **local time** relative to the viewer, not UTC, when you cross-check incidents against deployment timelines.

## Real Experience Score (RES)

RES summarizes perceived speed using empirical distributions sourced via HTTP Archive: each metric maps into a 0–100 partial score before aggregation into an overall RES weighted toward mobile and desktop realities Vercel publishes for Speed Insights. After deployments ship, RES trending confirms whether UX improves or regresses in production—not merely under synthetic Lighthouse presets.

## Core Web Vitals on Speed Insights

Speed Insights aligns naming with Google and WebPerf steering docs for clarity across tooling teams. The table below mirrors guidance thresholds summarized from [Vercel's Speed Insights metrics reference](https://vercel.com/docs/speed-insights/metrics), including [First Contentful Paint (FCP)](https://vercel.com/docs/speed-insights/metrics#first-contentful-paint-fcp), which marks when the first DOM-backed pixels paint—typically text, inline imagery, or canvas output—with **1.8 seconds or faster** treated as the documented target.

| Metric | Intent                                                      | Documented target |
| ------ | ----------------------------------------------------------- | ----------------- |
| LCP    | Time until the largest visible element completes rendering. | ≤ 2.5 s           |
| CLS    | Cumulative unexpected layout movement.                      | ≤ 0.1             |
| INP    | Latency from interaction until the next painted frame.      | ≤ 200 ms          |
| FCP    | Time until first DOM content paints.                        | ≤ 1.8 s           |
| FID    | Delay between first input and main-thread response.         | ≤ 100 ms          |

## Additional metrics (TBT, TTFB)

Speed Insights also exposes supporting diagnostics such as Total Blocking Time (TBT), quantifying main-thread stalls between First Contentful Paint and Time to Interactive, and Time to First Byte (TTFB), covering server plus network latency until the first response byte arrives. Virtual Experience Score integrations may substitute TBT where lab checks replace FID-style measurements—consult marketplace deployment checks when interpreting VES alongside RES.

## How scores are determined

Individual metric values convert into 0–100 scores by comparing raw timings against log-normal models fitted to HTTP Archive cohorts. Example from Vercel's docs: an LCP near ~1220 ms historically aligns with a 99-point partial score. RES blends those partial scores with fixed weights tuned for perceived responsiveness on mobile and desktop form factors.

## Data points and percentiles

Hard navigations (initial Next.js page loads per session) emit up to six datapoints across lifecycle phases: load metrics include TTFB and FCP; interactions contribute FID and often LCP; leaving the page may dispatch INP, CLS, and LCP if not previously recorded—exact combinations vary with user behavior.

Charts default to **P75**, representing the fastest 75% of sessions (excluding the slowest quartile). Switching to P90, P95, or P99 tightens or widens the tail sensitivity when investigating outliers versus typical UX.

## Interpreting composite scores

Color buckets align with Google UX reporting conventions on Speed Insights: roughly **0–49** (poor), **50–89** (needs improvement), **90–100** (good). Crossing bucket boundaries tends to matter more for SEO narratives than micro-adjustments inside the same band.

Virtual Experience Score complements RES by forecasting regressions through integrations running deployment checks; RES stays authoritative once traffic reaches statistical significance.

## Official documentation

Keep Vercel's canonical Speed Insights metrics guide bookmarked for threshold updates, scoring migrations, and dashboard workflows beyond what this document summarizes.

- [Speed Insights metrics (full reference)](https://vercel.com/docs/speed-insights/metrics)
- [First Contentful Paint (FCP) anchor on the metrics page](https://vercel.com/docs/speed-insights/metrics#first-contentful-paint-fcp)
- [Using Speed Insights (dashboard walkthrough)](https://vercel.com/docs/speed-insights/using-speed-insights)
