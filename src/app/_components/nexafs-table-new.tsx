// app/_components/nexafs-table-new.tsx
"use client";

import React, { useState, useEffect } from "react";
import type { Molecule, Experiment, DataSet } from "~/server/db";
import { Uid } from "~/server/db";
import {
  ArrowDownTrayIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import {
  getDataSet,
  getPolarValues,
  getAzimuthValues,
  downloadData,
} from "~/server/queries";
import { NexafsPlot } from "./nexafs-plot";
import {
  TableCard,
  SearchInput,
  Modal,
  ModalContent,
  Button,
  Card,
} from "./ui";

export const NexafsTable = (props: {
  molecule: Molecule;
  className?: string;
}) => {
  const [selectedExperiment, setSelectedExperiment] =
    useState<Experiment | null>(null);
  const [dataSet, setDataSet] = useState<DataSet | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Add sort state - default to sorting by edge in ascending order
  const [sortField, setSortField] = useState<keyof Experiment>("edge");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

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

  // Handle sort function
  const handleSort = (field: keyof Experiment) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Sort Icon Component
  const SortIcon = ({ field }: { field: keyof Experiment }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUpIcon className="h-4 w-4" />
    ) : (
      <ChevronDownIcon className="h-4 w-4" />
    );
  };

  const filteredExperiments = (props.molecule.data || []).filter(
    (experiment) => {
      const searchString = searchQuery.toLowerCase();
      return (
        experiment.edge.toLowerCase().includes(searchString) ||
        experiment.method.toLowerCase().includes(searchString) ||
        experiment.facility.toLowerCase().includes(searchString) ||
        experiment.instrument.toLowerCase().includes(searchString) ||
        experiment.source.toLowerCase().includes(searchString) ||
        experiment.group.toLowerCase().includes(searchString)
      );
    },
  );

  // Sort the filtered experiments
  const sortedExperiments = [...filteredExperiments].sort((a, b) => {
    const valueA = a[sortField]?.toLowerCase() ?? "";
    const valueB = b[sortField]?.toLowerCase() ?? "";

    if (valueA < valueB) {
      return sortDirection === "asc" ? -1 : 1;
    }
    if (valueA > valueB) {
      return sortDirection === "asc" ? 1 : -1;
    }
    return 0;
  });

  // Column headers with their keys for sorting
  const columns: { key: keyof Experiment; label: string }[] = [
    { key: "edge", label: "Edge" },
    { key: "method", label: "Method" },
    { key: "facility", label: "Facility" },
    { key: "instrument", label: "Instrument" },
    { key: "source", label: "Source" },
    { key: "group", label: "Group" },
  ];

  return (
    <TableCard className="w-full">
      {/* Search Bar */}
      <div className="border-b border-gray-200 p-4">
        <SearchInput
          placeholder="Search experiments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery("")}
        />
      </div>

      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="cursor-pointer px-4 py-3 text-left text-sm font-medium text-gray-600 hover:text-wsu-crimson"
                onClick={() => handleSort(column.key)}
              >
                <div className="flex items-center space-x-1">
                  <span>{column.label}</span>
                  <SortIcon field={column.key} />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedExperiments.map((experiment) => (
            <tr
              key={experiment.edge + experiment.method + experiment.facility}
              className="table-row-hover group"
              onClick={() => setSelectedExperiment(experiment)}
            >
              <td className="table-cell-hover px-4 py-3 text-sm">
                {experiment.edge}
              </td>
              <td className="table-cell-hover px-4 py-3 text-sm">
                {experiment.method}
              </td>
              <td className="table-cell-hover px-4 py-3 text-sm">
                {experiment.facility}
              </td>
              <td className="table-cell-hover px-4 py-3 text-sm">
                {experiment.instrument}
              </td>
              <td className="table-cell-hover px-4 py-3 text-sm">
                {experiment.source}
              </td>
              <td className="table-cell-hover px-4 py-3 text-sm">
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
    </TableCard>
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
      const url = downloadData(molecule.name, experiment, kind);
      const response = await fetch(encodeURI(url), { mode: "cors" });

      let blob: Blob;
      if (kind === "csv") {
        const csvText = await response.text();
        blob = new Blob([csvText], { type: "text/csv" });
      } else {
        blob = await response.blob();
      }

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${molecule.name}_${Uid(experiment)}.${kind}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading data:", error);
    }
  };

  if (!experiment) return null;

  return (
    <Modal
      open={!!experiment}
      onClose={onClose}
      title={`${experiment.edge} Experiment Details ${isLoading ? "Loading..." : ""}`}
      size="2xl"
    >
      <ModalContent>
        <div className="mb-4 flex gap-2">
          <Button
            onClick={() => handleDownload("csv")}
            variant="primary"
            size="sm"
            className="flex items-center gap-1"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Download CSV
          </Button>
          <Button
            onClick={() => handleDownload("json")}
            variant="secondary"
            size="sm"
            className="flex items-center gap-1"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Download JSON
          </Button>
        </div>

        {dataSet ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DetailSection title="Experiment Details">
                <DetailItem label="Edge" value={experiment.edge} />
                <DetailItem label="Method" value={experiment.method} />
                <DetailItem label="Facility" value={experiment.facility} />
                <DetailItem label="Instrument" value={experiment.instrument} />
                <DetailItem label="Source" value={experiment.source} />
                <DetailItem label="Group" value={experiment.group} />
              </DetailSection>

              <DetailSection title="Data Information">
                <DetailItem
                  label="Polar Values"
                  value={getPolarValues(dataSet).join(", ")}
                />
                <DetailItem
                  label="Azimuth Values"
                  value={getAzimuthValues(dataSet).join(", ")}
                />{" "}
                <DetailItem
                  label="Data Points"
                  value={dataSet.dataset.length.toString()}
                />
              </DetailSection>
            </div>

            <DetailSection title="Spectrum Visualization">
              <div className="mt-4">
                <NexafsPlot data={dataSet} />
              </div>
            </DetailSection>
          </div>
        ) : (
          <div className="mt-4 text-center text-gray-600">
            Failed to load experiment details
          </div>
        )}
      </ModalContent>
    </Modal>
  );
};

const DetailSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <Card className="p-4 hover:border-wsu-crimson/30 hover:shadow-sm">
    <h3 className="mb-3 text-sm font-semibold text-gray-900">{title}</h3>
    <div className="space-y-2">{children}</div>
  </Card>
);

const DetailItem = ({ label, value }: { label: string; value?: string }) => (
  <div className="flex-col text-sm">
    <span className="font-medium text-gray-600">{label}:</span>
    <span className="ml-2 text-gray-500">{value ?? "N/A"}</span>
  </div>
);
