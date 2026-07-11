"use client";

/**
 * Defers Vercel Analytics and Speed Insights until after hydration so first
 * paint on browse and `/d/` follow-on pages is not competing with third-party JS.
 */

import dynamic from "next/dynamic";

const Analytics = dynamic(
  () => import("@vercel/analytics/react").then((m) => m.Analytics),
  { ssr: false },
);

const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((m) => m.SpeedInsights),
  { ssr: false },
);

/**
 * Renders Analytics and Speed Insights as client-only dynamic imports.
 */
export function DeferredVercelTelemetry() {
  return (
    <>
      <SpeedInsights />
      <Analytics />
    </>
  );
}
