import React from "react";
import type { Metadata } from "next";
import { InterpretingCard } from "./_components/InterpretingCard";
import { InterpretingData } from "./_components/InterpretingData";
import { NexafsMetadata } from "./_components/NexafsMetadata";

export const metadata: Metadata = {
  title: "How-to Guide",
  description: "A guide on how to use the Xray Atlas.",
};

const HowToGuidePage = () => {
  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">How-to Guide</h1>
      <p className="mb-6 text-lg">
        This guide will walk you through the features of the Xray Atlas and how
        to use them effectively.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="mb-2 text-2xl font-semibold">
            Searching for Molecules
          </h2>
          <p>
            The home page features a powerful search bar that allows you to find
            molecules by name, chemical formula, or synonyms. Simply start
            typing, and the list of molecules will update in real-time.
          </p>
        </section>

        <section>
          <h3 className="mb-2 text-2xl font-semibold">Molecular Card</h3>
          <p>
            Each molecule in the search results is displayed as a card with key
            information. Here we use the molecule Y11 as an example to explain
            each part of the card. Click around on the card to see what each
            section represents.
          </p>
          <InterpretingCard />
        </section>

        <section>
          <h2 className="mb-2 text-2xl font-semibold">NEXAFS Metadata Table</h2>
          <p>
            Clicking on a molecule card will take you to its dedicated page.
            Here, you can view detailed information about the molecule,
            including its structure and a table of its NEXAFS spectra.
          </p>
          <NexafsMetadata />
        </section>
        <section>
          <h3 className="mb-2 text-2xl font-semibold">
            Experimental Data Displays
          </h3>
          <p>
            Understanding the various elements displayed in the experimental
            data views is crucial for interpreting the results accurately. Pay
            close attention to the metadata provided, as it can offer valuable
            context about the experimental conditions and data collection
            methods.
          </p>
          <InterpretingData />
        </section>
      </div>
    </div>
  );
};

export default HowToGuidePage;
