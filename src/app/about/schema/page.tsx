import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schema",
  description: "The data schema used in the Xray Atlas.",
};

const SchemaPage = () => {
  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">Data Schema</h1>
      <p className="mb-6 text-lg">
        The data schema for the Xray Atlas has been carefully designed to be
        both comprehensive and extensible.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="mb-2 text-2xl font-semibold">Molecule Information</h2>
          <p>
            We store detailed information about each molecule, including its
            chemical formula, synonyms, and a 3D structure image.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-2xl font-semibold">NEXAFS Spectra</h2>
          <p>
            For each molecule, we can store multiple NEXAFS spectra. Each
            spectrum includes the raw data points, experimental parameters, and
            a reference to the publication where the data was originally
            reported.
          </p>
        </section>
      </div>
    </div>
  );
};

export default SchemaPage;
