import React from "react";
import Link from "next/link";
import collaborators from "~/lib/collaborators";

export default function CommunityPage() {
  return (
    <div className="prose prose-lg max-w-none">
      <h1 className="mb-4 text-3xl font-bold">Community and Contributions</h1>
      <p className="mb-4">
        Xray Atlas is a community-driven project that thrives on the
        contributions of researchers, developers, and data scientists like you.
        This page outlines how you can get involved, from contributing data to
        improving the platform itself.
      </p>

      <h2 className="mb-2 text-2xl font-bold">Our Collaborators</h2>
      <p>
        We are grateful for the invaluable contributions from our collaborators.
        Their expertise and support are crucial to the success of the Xray
        Atlas.
      </p>
      <div className="not-prose mt-6">
        <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {collaborators.map((c) => (
            <li key={c.name} className="h-full">
              <Link
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group block h-full rounded-lg border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wsu-crimson"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-gray-50 text-wsu-crimson ring-1 ring-wsu-crimson group-hover:bg-gray-100">
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 3h7v7" />
                    <path d="M10 14 21 3" />
                    <path d="M5 7v14h14v-5" />
                  </svg>
                </div>
                <p className="mb-2 line-clamp-3 text-sm font-medium leading-snug text-card-foreground group-hover:text-wsu-crimson">
                  {c.name}
                </p>
                <span className="inline-flex items-center text-xs text-muted-foreground">
                  Visit site
                  <svg
                    className="ml-1 h-3 w-3 transition group-hover:translate-x-0.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M7 17 17 7" />
                    <path d="M7 7h10v10" />
                  </svg>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <h2 className="m-0">Contribute to the Website</h2>
          <p className="text-muted-foreground">
            Help us improve the Xray Atlas platform. Find an issue, make a
            change, and submit a pull request.
          </p>
          <Link
            href="/about/community/contribute"
            className="font-semibold text-wsu-crimson hover:underline"
          >
            View Contribution Guide &rarr;
          </Link>
        </div>
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <h2 className="m-0">Upload Your Data</h2>
          <p className="text-muted-foreground">
            Have X-ray spectroscopy data to share? Follow our guide to upload
            and contribute to our growing database.
          </p>
          <Link
            href="/upload"
            className="font-semibold text-wsu-crimson hover:underline"
          >
            Go to Upload Page &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
