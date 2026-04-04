import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Privacy and data handling information for the X-ray Atlas platform.",
};

/**
 * Static privacy overview for footer and compliance links.
 *
 * Summarizes how the public catalog relates to accounts and open data; does not
 * replace institutional policies. For questions, use the Contact mailto in the footer.
 */
export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-foreground mb-3 text-4xl font-bold">Privacy</h1>
          <p className="text-muted text-lg">
            X-ray Atlas publishes open spectroscopy metadata and spectra for
            research use. This page describes how the site handles information
            at a high level.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-foreground text-2xl font-semibold">
            Public catalog data
          </h2>
          <p className="text-muted">
            Molecule identifiers, experimental metadata, and spectrum values
            you browse or download are intended to be public and may be indexed
            or cached by third-party services once published on the site.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-foreground text-2xl font-semibold">Accounts</h2>
          <p className="text-muted">
            When you sign in, authentication providers and our application may
            process account identifiers (for example email and name) as needed
            to operate sign-in, sessions, and contribution workflows. Use
            provider settings to review or revoke access where applicable.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-foreground text-2xl font-semibold">Contact</h2>
          <p className="text-muted">
            For privacy-related questions, reach the maintainers via{" "}
            <Link
              href="mailto:brian.collins@wsu.edu"
              className="text-accent hover:underline"
            >
              brian.collins@wsu.edu
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
