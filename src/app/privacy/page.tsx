import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy and Data Use",
  description:
    "Privacy, account data handling, and citation guidance for open datasets on X-ray Atlas.",
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
          <h1 className="text-foreground mb-3 text-4xl font-bold">
            Privacy and Data Use
          </h1>
          <p className="text-muted text-lg">
            X-ray Atlas publishes open spectroscopy metadata and spectra for
            research use. This page explains what information is public, what is
            used for accounts and platform operations, and how to cite datasets
            to preserve contributor attribution.
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
          <p className="text-muted">
            If your workflow requires non-public data, do not upload it to
            X-ray Atlas unless and until your team is ready for public release.
          </p>
          <p className="text-muted">
            If you need a non-public workflow, contact the core maintainers to
            discuss case-by-case allowances. Approved non-public datasets are
            stored internally and restricted to the publishing group and core
            maintainers.
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
          <p className="text-muted">
            Account profile fields and contribution metadata can be displayed in
            attribution contexts (for example contributor listings) to support
            scientific provenance.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-foreground text-2xl font-semibold">
            Citing data and attribution
          </h2>
          <p className="text-muted">
            Application code is licensed under the MIT License. Contributed
            datasets are licensed under{" "}
            <Link
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              CC BY 4.0
            </Link>
            . Citation is required when reusing hosted datasets.
          </p>
          <p className="text-muted">
            Each dataset has a minted DOI. When using X-ray Atlas data, cite:
          </p>
          <div className="border-border bg-surface space-y-3 rounded-lg border p-4">
            <div>
              <h3 className="text-foreground font-semibold">Individual dataset</h3>
              <p className="text-muted font-mono text-sm">
                [Dataset Name] [DOI]. Adapted from [Original Publication].
                Hosted by X-Ray Atlas.
              </p>
            </div>
            <div>
              <h3 className="text-foreground font-semibold">Entire collection</h3>
              <p className="text-muted font-mono text-sm">
                X-Ray Atlas [Collection DOI]. Accessed [Date].
              </p>
            </div>
          </div>
          <p className="text-muted">
            See dataset landing pages for full citation details and examples.
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
