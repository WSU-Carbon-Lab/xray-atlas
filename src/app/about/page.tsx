import React from "react";
import type { Metadata } from "next";

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
      </div>
    </div>
  );
};

export default AboutPage;
