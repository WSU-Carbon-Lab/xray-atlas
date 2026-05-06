/**
 * About segment describing contributor responsibilities plus onboarding paths into uploads.
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Database Contributions",
  description:
    "How to contribute NEXAFS datasets to Xray Atlas with metadata quality, reproducibility, and citation-ready attribution.",
};

export default function ContributionsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-foreground text-4xl font-bold">Database contributions</h1>
        <p className="text-muted">
          Contributions keep Xray Atlas scientifically useful. The goal is to
          pair each spectrum with enough context for interpretation,
          comparison, and citation.
        </p>
        <section className="border-border bg-surface rounded-lg border p-4">
          <h2 className="text-foreground mb-2 text-xl font-semibold">
            Contribution expectations
          </h2>
          <ul className="text-muted ml-6 list-disc space-y-1">
            <li>Provide complete experimental metadata whenever available</li>
            <li>Include molecule and sample descriptors for queryability</li>
            <li>Review upload values before final submission</li>
            <li>Link publication context when possible for attribution</li>
            <li>Use citation-ready records when reusing hosted data</li>
          </ul>
        </section>
        <section className="border-border bg-surface rounded-lg border p-4">
          <h2 className="text-foreground mb-2 text-xl font-semibold">
            Next step
          </h2>
          <p className="text-muted">
            Start the guided contribution flow to add molecules, facilities, and
            spectroscopy data.
          </p>
          <div className="mt-3">
            <Link
              href="/contribute"
              className="bg-accent text-accent-foreground inline-flex rounded-lg px-4 py-2 text-sm font-medium"
            >
              Open contribution flow
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
