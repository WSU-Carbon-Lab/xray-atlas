// app/_components/nexafs.tsx
"use client";

import React, { useState, useEffect } from "react";
import type { Molecule, Experiment, DataSet } from "~/server/db";
import { Uid } from "~/server/db";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import {
  getDataSet,
  getPolarValues,
  getAzimuthValues,
  downloadData,
} from "~/server/queries";
import { NexafsPlot } from "./nexafs_plot";

export const NexafsTable = (props: {
  molecule: Molecule;
  className?: string;
}) => {
  const [selectedExperiment, setSelectedExperiment] =
    useState<Experiment | null>(null);
  const [dataSet, setDataSet] = useState<DataSet | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedExperiment) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const data = await getDataSet(
            props.molecule.name,
            selectedExperiment,
          );
          setDataSet(data);
        } catch (error) {
          console.error("Error fetching dataset:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData().catch((error) => console.error("Error in fetchData:", error));
    }
  }, [selectedExperiment, props.molecule.name]);

  if (!props.molecule.data)
    return (
      <div className="p-4 text-gray-600">No experimental data available</div>
    );

  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            {[
              "Edge",
              "Method",
              "Facility",
              "Instrument",
              "Source",
              "Group",
            ].map((header) => (
              <th
                key={header}
                className="px-4 py-3 text-left text-sm font-semibold text-gray-900"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {props.molecule.data.map((experiment) => (
            <tr
              key={Uid(experiment)}
              className="cursor-pointer transition-colors hover:bg-purple-50"
              onClick={() => setSelectedExperiment(experiment)}
            >
              <td className="px-4 py-3 text-sm text-gray-900">
                {experiment.edge}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {experiment.method}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {experiment.facility}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {experiment.instrument}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {experiment.source}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {experiment.group}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ExperimentModal
        molecule={props.molecule}
        experiment={selectedExperiment}
        dataSet={dataSet}
        isLoading={isLoading}
        onClose={() => {
          setSelectedExperiment(null);
          setDataSet(null);
        }}
      />
    </div>
  );
};

const ExperimentModal = ({
  molecule,
  experiment,
  dataSet,
  isLoading,
  onClose,
}: {
  molecule: Molecule;
  experiment: Experiment | null;
  dataSet: DataSet | null;
  isLoading: boolean;
  onClose: () => void;
}) => {
  const handleDownload = async (kind: "csv" | "json") => {
    if (!experiment || !dataSet) return;

    try {
      // Get the download URL (assumed to be implemented elsewhere)
      const url = downloadData(molecule.name, experiment, kind);
      const response = await fetch(encodeURI(url), { mode: "cors" });

      // Process the response differently based on the kind
      let blob: Blob;
      if (kind === "csv") {
        // For CSV, read the response as text and create a Blob with the correct MIME type
        const csvText = await response.text();
        blob = new Blob([csvText], { type: "text/csv" });
      } else {
        // For JSON, you can simply get the blob
        blob = await response.blob();
      }

      // Create a temporary link element to trigger the download
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${molecule.name}_${Uid(experiment)}.${kind}`;
      document.body.appendChild(link);
      link.click();

      // Clean up the link element
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading data:", error);
    }
  };

  if (!experiment) return null;

  return (
    <Dialog open={!!experiment} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-5xl rounded-xl bg-white p-6 shadow-xl">
          <DialogTitle className="text-lg font-semibold text-gray-900">
            {experiment.edge} Experiment Details {isLoading && "Loading ... "}
          </DialogTitle>
          <div className="flex gap-2">
            <button
              onClick={() => handleDownload("csv")}
              className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              CSV
            </button>
            <button
              onClick={() => handleDownload("json")}
              className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              JSON
            </button>
          </div>
          {isLoading ? (
            <div className="mt-4 flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
            </div>
          ) : dataSet ? (
            <div className="mt-4 space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <DetailSection title="User Information">
                  <DetailItem label="Name" value={dataSet.user.name} />
                  <DetailItem
                    label="Affiliation"
                    value={dataSet.user.affiliation}
                  />
                  <DetailItem label="Email" value={dataSet.user.email} />
                </DetailSection>

                <DetailSection title="Instrument Details">
                  <DetailItem
                    label="Facility"
                    value={dataSet.instrument.facility}
                  />
                  <DetailItem
                    label="Instrument"
                    value={dataSet.instrument.instrument}
                  />
                  <DetailItem
                    label="Technique"
                    value={dataSet.instrument.technique}
                  />
                </DetailSection>

                <DetailSection title="Experiment Details">
                  <DetailItem label="Edge" value={experiment.edge} />
                  <DetailItem label="Method" value={experiment.method} />
                  <DetailItem
                    label="E Field Polar Angles"
                    value={getPolarValues(dataSet).join(", ")}
                  />
                  <DetailItem
                    label="E Field Azimuth Angles"
                    value={getAzimuthValues(dataSet).join(", ")}
                  />
                </DetailSection>

                <DetailSection title="Sample Information">
                  <DetailItem label="Vendor" value={dataSet.sample.vendor} />
                  <DetailItem
                    label="Preparation Method"
                    value={dataSet.sample.preparation_method.method}
                  />
                </DetailSection>
              </div>

              <DetailSection title="Data Visualization">
                <div className="h-full rounded-lg bg-gray-50 p-4">
                  {/* Placeholder for data visualization */}
                  <div className="flex h-full items-center justify-center text-gray-400">
                    <NexafsPlot data={dataSet} />
                  </div>
                </div>
              </DetailSection>
            </div>
          ) : (
            <div className="mt-4 text-center text-gray-600">
              Failed to load experiment details
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
};

const DetailSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-lg border border-gray-200 p-4">
    <h3 className="mb-3 text-sm font-semibold text-gray-900">{title}</h3>
    <div className="space-y-2">{children}</div>
  </div>
);

const DetailItem = ({ label, value }: { label: string; value?: string }) => (
  <div className="text-sm">
    <span className="font-medium text-gray-600">{label}:</span>
    <span className="ml-2 text-gray-500">{value ?? "N/A"}</span>
  </div>
);
