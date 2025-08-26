import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import collaborators from "~/lib/collaborators";

export const metadata: Metadata = {
  title: "About",
  description: "Learn more about the Xray Atlas project.",
};

const AboutPage = () => {
  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">About Xray Atlas</h1>
      <p className="mb-6 text-lg">
        The Xray Atlas is a comprehensive database for X-ray spectroscopy data,
        primarily focusing on Near Edge X-ray Absorption Fine Structure (NEXAFS)
        data on organic compounds. This project is a collaborative effort to
        make research data more accessible and useful for the scientific
        community.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="mb-2 text-2xl font-semibold">Our Mission</h2>
          <p>
            Our mission is to provide a centralized, open-access platform for
            researchers to share, browse, and analyze X-ray spectroscopy data.
            By standardizing data formats and providing easy-to-use tools, we
            aim to accelerate discovery in materials science, chemistry, and
            related fields.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-2xl font-semibold">Schema Design</h2>
          <p>
            The data schema for the Xray Atlas has been carefully designed to be
            both comprehensive and extensible. We store detailed information
            about each molecule, including its chemical formula, synonyms, and
            structure. For each molecule, we can store multiple NEXAFS spectra,
            each with its own set of experimental parameters.
          </p>
          <p className="mt-2">
            This schema allows for rich querying and analysis, enabling users to
            compare spectra across different molecules and experimental
            conditions. We are continuously working on refining our schema to
            accommodate new types of data and research needs.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-2xl font-semibold">Technology Stack</h2>
          <p>
            The Xray Atlas is built on a modern, robust technology stack to
            ensure a high-quality user experience and long-term maintainability.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>
              <strong>Next.js:</strong> A React framework for building fast,
              server-rendered web applications.
            </li>
            <li>
              <strong>TypeScript:</strong> For type safety and improved
              developer experience.
            </li>
            <li>
              <strong>Tailwind CSS:</strong> A utility-first CSS framework for
              rapid UI development.
            </li>
            <li>
              <strong>AWS &amp; Huggingface:</strong> Data storage is handled
              though a light weight AWS stack storing raw data in a S3 bucket.
              Huggingface provides a CDN for fast global delivery of raw data.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="mb-2 text-2xl font-semibold">
            Community Contributions
          </h2>
          <p>
            We welcome contributions from the scientific community to help
            expand and improve the Xray Atlas. Whether you have new data to
            share, suggestions for features, or want to help with development,
            your involvement is valuable. Check out our{" "}
            <a
              href="/about/community/contribute"
              className="text-wsu-crimson hover:underline"
            >
              contribution guide
            </a>{" "}
            to get started.
          </p>
          <h3 className="mb-2 text-xl font-semibold">Core Collaborators</h3>
          <p>
            We would like to thank all the contributors who have helped make the
            Xray Atlas a reality. Your hard work and dedication are greatly
            appreciated!
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
        </section>
      </div>
    </div>
  );
};

export default AboutPage;
