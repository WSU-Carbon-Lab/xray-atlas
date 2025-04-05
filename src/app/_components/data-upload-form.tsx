"use client";

import React, { useState } from "react";
import type { Molecule, DataSet, Experiment, Data, Signal } from "~/server/db";
import { Uid } from "~/server/db";

interface CSVRow {
  Energy: number;
  mu: number;
  theta: number;
  phi: number;
}

// Add these constants right after your interface declarations

// Facilities and their NEXAFS-capable beamlines
const FACILITIES = [
  {
    name: "ALS",
    beamlines: ["5.3.2", "11.0.1.2"],
  },
  {
    name: "NSLS-II",
    beamlines: ["SST-1", "SST-2", "SMI"],
  },
  {
    name: "ANSTO",
    beamlines: ["SXR"],
  },
  {
    name: "Diamond",
    beamlines: ["B18", "I18", "I20", "I08", "I06", "B07", "I14"],
  },
  {
    name: "MAX IV",
    beamlines: [
      "Balder",
      "FlexPES",
      "HIPPIE",
      "SPECIES",
      "BLOCH",
      "FinEstBeAMS",
    ],
  },
];

// NEXAFS measurement techniques
const TECHNIQUES = [
  "TEY (Total Electron Yield)",
  "PEY (Partial Electron Yield)",
  "AEY (Auger Electron Yield)",
  "FY (Fluorescence Yield)",
  "TFY (Total Fluorescence Yield)",
  "PFY (Partial Fluorescence Yield)",
  "iPFY (Inverse Partial Fluorescence Yield)",
  "TRANS (Transmission)",
  "REFLECTIVITY",
];

// Absorption edges with proper formatting
const ABSORPTION_EDGES = ["C(K)", "N(K)", "O(K)", "F(K)"];

// Normalization methods
const NORMALIZATION_METHODS = [
  "Pre-edge to 0, Post-edge to 1",
  "Min to 0, Max to 1",
  "I/I0",
  "Area normalization",
];

export const DataUploadForm = () => {
  // Molecule metadata state
  const [molecule, setMolecule] = useState<Partial<Molecule>>({
    name: "",
    synonyms: [],
    chemical_formula: "",
    description: "",
    SMILES: "",
    InChI: "",
    img: "",
    data: [],
  });

  // Experiment metadata state
  const [experiment, setExperiment] = useState<Experiment>({
    edge: "",
    method: "",
    facility: "",
    instrument: "",
    group: "",
    source: "",
  });

  // Additional dataset info
  const [user, setUser] = useState({
    name: "",
    affiliation: "",
    group: "",
    email: "",
    doi: "",
  });

  const [instrumentDetails, setInstrumentDetails] = useState({
    normalization_method: "",
    technique: "",
    technical_details: "",
  });

  const [sample, setSample] = useState({
    vendor: "",
    preparation_method: {
      method: "",
      details: "",
    },
    mol_orientation_details: "",
  });

  // Synonym handling
  const [synonym, setSynonym] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Add a synonym to the list
  const addSynonym = () => {
    if (synonym.trim() !== "") {
      setMolecule((prev) => ({
        ...prev,
        synonyms: [...(prev.synonyms || []), synonym.trim()],
      }));
      setSynonym("");
    }
  };

  // Remove a synonym from the list
  const removeSynonym = (index: number) => {
    setMolecule((prev) => ({
      ...prev,
      synonyms: prev.synonyms?.filter((_, i) => i !== index) || [],
    }));
  };

  // Handle molecule metadata changes
  const handleMoleculeChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setMolecule((prev) => ({ ...prev, [name]: value }));
  };

  // Handle experiment details changes
  const handleExperimentChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setExperiment((prev) => ({ ...prev, [name]: value }));
  };

  // Handle user details changes
  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  // Handle instrument details changes
  const handleInstrumentChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setInstrumentDetails((prev) => ({ ...prev, [name]: value }));
  };

  // Handle sample details changes
  const handleSampleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      if (!parent || !child) return;
      setSample((prev) => ({
        ...prev,
        [parent]: {
          ...((prev[parent as keyof typeof prev] as Record<string, any>) || {}),
          [child]: value,
        },
      }));
    } else {
      setSample((prev) => ({ ...prev, [name]: value }));
    }
    // Automatically sync vendor/source fields
    if (name === "vendor") {
      setExperiment((prev) => ({ ...prev, source: value }));
    }
  };

  // Handle CSV file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]!);
    }
  };

  // Parse CSV content into rows with robust error handling
  const parseCSV = (content: string): CSVRow[] => {
    if (!content || content.trim() === "") {
      throw new Error("CSV file is empty");
    }

    const lines: string[] = content.split(/\r?\n/); // Handle different line endings
    if (lines.length < 2) {
      throw new Error(
        "CSV file must contain at least a header row and one data row",
      );
    }
    const headers = lines[0]!.split(",").map((header) => header.trim());

    // Find column indices with fallbacks for differently named columns
    const energyIndex = headers.findIndex(
      (h) =>
        h.toLowerCase().includes("energy") ||
        h.toLowerCase() === "e" ||
        h.toLowerCase() === "ev",
    );
    const muIndex = headers.findIndex(
      (h) =>
        h.toLowerCase().includes("mu") ||
        h.toLowerCase().includes("intensity") ||
        h.toLowerCase() === "i",
    );
    const thetaIndex = headers.findIndex(
      (h) =>
        h.toLowerCase().includes("theta") ||
        h.toLowerCase() === "polar" ||
        h.toLowerCase() === "θ",
    );
    const phiIndex = headers.findIndex(
      (h) =>
        h.toLowerCase().includes("phi") ||
        h.toLowerCase() === "azimuth" ||
        h.toLowerCase() === "φ",
    );

    // Provide specific error messages for each missing column
    if (energyIndex === -1)
      throw new Error("Could not find Energy column in CSV");
    if (muIndex === -1)
      throw new Error("Could not find intensity/mu column in CSV");
    if (thetaIndex === -1)
      throw new Error("Could not find theta/polar angle column in CSV");
    if (phiIndex === -1)
      throw new Error("Could not find phi/azimuthal angle column in CSV");

    const rows: CSVRow[] = [];

    // Process data rows with validation
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (line === "") continue; // Skip empty lines

      const values = line.split(",").map((val) => val.trim());

      // Check if this row has enough columns
      if (
        values.length <= Math.max(energyIndex, muIndex, thetaIndex, phiIndex)
      ) {
        console.warn(
          `Skipping row ${i + 1} due to insufficient columns: ${line}`,
        );
        continue;
      }

      // Parse values with validation
      const energy = parseFloat(values[energyIndex]!);
      const mu = parseFloat(values[muIndex]!);
      const theta = parseFloat(values[thetaIndex]!);
      const phi = parseFloat(values[phiIndex]!);

      // Validate parsed numbers
      if (isNaN(energy) || isNaN(mu) || isNaN(theta) || isNaN(phi)) {
        console.warn(
          `Skipping row ${i + 1} due to invalid numeric values: ${line}`,
        );
        continue;
      }

      rows.push({ Energy: energy, mu, theta, phi });
    }

    if (rows.length === 0) {
      throw new Error("No valid data rows found in CSV file");
    }

    return rows;
  };

  // Convert parsed CSV data to DataSet format with improved type safety
  const convertToDataSet = (rows: CSVRow[]): DataSet => {
    // Group rows by unique theta-phi combinations
    const groupedByAngles: Record<string, CSVRow[]> = {};

    rows.forEach((row) => {
      const key = `${row.theta}-${row.phi}`;
      if (!groupedByAngles[key]) {
        groupedByAngles[key] = [];
      }
      groupedByAngles[key].push(row);
    });

    // Create dataset array with validation
    const dataset: Data[] = Object.entries(groupedByAngles).map(
      ([key, angleRows]) => {
        // Sort rows by energy to ensure correct order
        angleRows.sort((a, b) => a.Energy - b.Energy);

        // Extract angle values from the key
        const [thetaStr, phiStr] = key.split("-");
        const theta = parseFloat(thetaStr || "0");
        const phi = parseFloat(phiStr || "0");

        // Validate we have enough points for a meaningful spectrum
        if (angleRows.length < 3) {
          console.warn(
            `Warning: Only ${angleRows.length} points for angles theta=${theta}, phi=${phi}`,
          );
        }

        // Create the energy and intensity signals with proper typing
        const energySignal: number[] = angleRows.map((row) => row.Energy);
        const intensitySignal: number[] = angleRows.map((row) => row.mu);

        return {
          geometry: {
            e_field_azimuth: phi,
            e_field_polar: theta,
          },
          energy: {
            signal: energySignal,
            units: "eV", // Default unit, could be made configurable
          },
          intensity: {
            signal: intensitySignal,
            units: "arb. u.", // Default unit, could be made configurable
          },
        };
      },
    );

    // Ensure we have at least one dataset entry
    if (dataset.length === 0) {
      throw new Error(
        "Could not create any valid dataset entries from CSV data",
      );
    }

    // Construct the full DataSet with null/undefined guards
    return {
      user: {
        name: user.name || "",
        affiliation: user.affiliation || "",
        group: user.group || "",
        email: user.email || "",
        doi: user.doi || undefined,
      },
      instrument: {
        facility: experiment.facility || "",
        instrument: experiment.instrument || "",
        edge: experiment.edge || "",
        normalization_method: instrumentDetails.normalization_method || "",
        technique: instrumentDetails.technique || "",
        technical_details: instrumentDetails.technical_details || "",
      },
      sample: {
        vendor: sample.vendor || "",
        preparation_method: {
          method: sample.preparation_method?.method || "",
          details: sample.preparation_method?.details || "",
        },
        mol_orientation_details: sample.mol_orientation_details || "",
      },
      dataset: dataset,
    };
  };

  // Create downloadable file
  const createDownloadableFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle form submission with enhanced error handling and type safety
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate required inputs
      if (!csvFile) {
        throw new Error("Please upload a CSV file");
      }

      if (
        !molecule.name ||
        !molecule.chemical_formula ||
        !molecule.description
      ) {
        throw new Error(
          "Please fill in all required molecule information fields",
        );
      }

      if (!sample.vendor) {
        throw new Error("Please fill in the vendor information field");
      }

      if (
        !experiment.edge ||
        !experiment.method ||
        !experiment.facility ||
        !experiment.instrument ||
        !experiment.group
      ) {
        throw new Error(
          "Please fill in all required experiment information fields",
        );
      }

      if (!user.name || !user.affiliation || !user.group || !user.email) {
        throw new Error("Please fill in all required user information fields");
      }

      // Update molecule data with experiment - ensure type safety
      const updatedMolecule: Molecule = {
        name: molecule.name || "",
        synonyms: molecule.synonyms || [],
        chemical_formula: molecule.chemical_formula || "",
        description: molecule.description || "",
        SMILES: molecule.SMILES || "",
        InChI: molecule.InChI || "",
        img: molecule.name
          ? `https://raw.githubusercontent.com/WSU-Carbon-Lab/molecules/main/${molecule.name
              .toUpperCase()
              .replace(/\s+/g, "")
              .replace(/[^a-zA-Z0-9]/g, "")}.svg`
          : "",
        data: [...(molecule.data || []), { ...experiment }],
      };

      // Create METADATA.json
      const metadataJson = JSON.stringify(updatedMolecule, null, 2);

      // Read and process CSV file with proper error handling
      const fileContent = await csvFile.text();
      let parsedRows: CSVRow[] = [];

      try {
        parsedRows = parseCSV(fileContent);
      } catch (parseError) {
        throw new Error(
          `CSV parsing error: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
        );
      }

      if (parsedRows.length === 0) {
        throw new Error("No valid data rows found in the CSV file");
      }

      let dataSet: DataSet;
      try {
        dataSet = convertToDataSet(parsedRows);
      } catch (convertError) {
        throw new Error(
          `Data conversion error: ${convertError instanceof Error ? convertError.message : "Unknown error"}`,
        );
      }

      // Create UID.json
      const uidJson = JSON.stringify(dataSet, null, 2);
      const uid = Uid(experiment);

      // Create UID.csv (original CSV with standardized name)
      const csvContent = fileContent.trim();

      // Generate downloadable files
      createDownloadableFile(metadataJson, "METADATA.json");
      createDownloadableFile(uidJson, `${uid}.json`);
      createDownloadableFile(csvContent, `${uid}.csv`);

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 shadow-sm">
      <div className="mx-auto mt-12 max-w-4xl rounded-lg p-6">
        <h2 className="mb-4 text-xl font-semibold">Upload Instructions</h2>
        <ol className="list-decimal space-y-2 pl-6">
          <li>Fill out all required fields in the form above</li>
          <li>
            Upload your CSV data file with columns for Energy, mu (intensity),
            theta, and phi
          </li>
          <li>Click "Submits" to create the necessary JSON files</li>
          <li>
            Submit these files through a GitHub issue at{" "}
            <a
              href="https://github.com/WSU-Carbon-Lab/xray-atlas/issues/new?template=upload-data.md"
              className="text-wsu-crimson hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              WSU-Carbon-Lab/xray-atlas
            </a>
          </li>
        </ol>
        <p className="text-xs text-gray-500">
          You'll need a GitHub account to upload this data.
        </p>
      </div>

      {success ? (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          <h2 className="font-semibold">Success!</h2>
          <p>
            Your files have been generated. Please upload them to GitHub using
            the issue template.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="https://github.com/WSU-Carbon-Lab/xray-atlas/issues/new?template=upload-data.md"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:bg-wsu-crimson-dark inline-block rounded-md bg-wsu-crimson px-4 py-2 text-white"
            >
              Open GitHub Issue
            </a>
            <button
              onClick={() => setSuccess(false)}
              className="rounded-md bg-gray-100 px-4 py-2 hover:bg-gray-200"
            >
              Upload Another Dataset
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
              {error}
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Molecule Information
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Molecule Name*
                </label>
                <input
                  type="text"
                  name="name"
                  value={molecule.name}
                  onChange={handleMoleculeChange}
                  required
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Chemical Formula*
                </label>
                <input
                  type="text"
                  name="chemical_formula"
                  value={molecule.chemical_formula}
                  onChange={handleMoleculeChange}
                  required
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Synonyms
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={synonym}
                    onChange={(e) => setSynonym(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                    placeholder="Add synonym"
                  />
                  <button
                    type="button"
                    onClick={addSynonym}
                    className="rounded-md bg-gray-100 px-4 py-2 hover:bg-gray-200"
                  >
                    Add
                  </button>
                </div>

                {molecule.synonyms && molecule.synonyms.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {molecule.synonyms.map((syn, index) => (
                      <div
                        key={index}
                        className="flex items-center rounded-full bg-gray-100 px-3 py-1"
                      >
                        <span>{syn}</span>
                        <button
                          type="button"
                          onClick={() => removeSynonym(index)}
                          className="ml-2 text-gray-500 hover:text-red-500"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Chemical Description*
                </label>
                <textarea
                  name="description"
                  value={molecule.description}
                  onChange={handleMoleculeChange}
                  required
                  rows={1}
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  SMILES
                </label>
                <input
                  type="text"
                  name="SMILES"
                  value={molecule.SMILES}
                  onChange={handleMoleculeChange}
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  InChI
                </label>
                <input
                  type="text"
                  name="InChI"
                  value={molecule.InChI}
                  onChange={handleMoleculeChange}
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                />
              </div>

              <div className="md:col-span-2">
                <a
                  href="https://github.com/WSU-Carbon-Lab/molecules"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-wsu-crimson hover:underline"
                >
                  Create a PR to upload the SVG image to the
                  WSU-Carbon-Lab/molecules repository
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Experiment Information
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Facility / Synchrotron*
                </label>
                <select
                  name="facility"
                  value={experiment.facility}
                  onChange={(e) => {
                    handleExperimentChange(e);
                    // Reset instrument when facility changes
                    setExperiment((prev) => ({ ...prev, instrument: "" }));
                  }}
                  required
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                >
                  <option value="">Select Facility</option>
                  {FACILITIES.map((facility) => (
                    <option key={facility.name} value={facility.name}>
                      {facility.name}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>

                {experiment.facility === "Other" && (
                  <input
                    type="text"
                    name="facility_custom"
                    placeholder="Enter facility name"
                    value={
                      experiment.facility === "Other" ? "" : experiment.facility
                    }
                    onChange={(e) =>
                      setExperiment((prev) => ({
                        ...prev,
                        facility: e.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                  />
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Instrument / Beamline*
                </label>
                <select
                  name="instrument"
                  value={experiment.instrument}
                  onChange={handleExperimentChange}
                  required
                  disabled={
                    !experiment.facility || experiment.facility === "Other"
                  }
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">
                    {!experiment.facility
                      ? "Select a facility first"
                      : experiment.facility === "Other"
                        ? "Specify custom instrument below"
                        : "Select an instrument"}
                  </option>

                  {experiment.facility &&
                    experiment.facility !== "Other" &&
                    FACILITIES.find(
                      (f) => f.name === experiment.facility,
                    )?.beamlines.map((beamline) => (
                      <option key={beamline} value={beamline}>
                        {beamline}
                      </option>
                    ))}
                </select>

                {(experiment.facility === "Other" ||
                  (experiment.instrument === "Other" &&
                    experiment.facility !== "")) && (
                  <input
                    type="text"
                    name="instrument"
                    placeholder="Enter instrument/beamline name"
                    value={
                      experiment.instrument === "Other"
                        ? ""
                        : experiment.instrument
                    }
                    onChange={handleExperimentChange}
                    required
                    className="mt-2 w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                  />
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  NEXAFS / XANES Technique*
                </label>
                <select
                  name="method"
                  value={experiment.method}
                  onChange={(e) => {
                    handleExperimentChange(e);
                    // Also set the technique field to match the method
                    setInstrumentDetails((prev) => ({
                      ...prev,
                      technique:
                        e.target.value === "Other" ? "" : e.target.value,
                    }));
                  }}
                  required
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                >
                  <option value="">Select Technique</option>
                  {TECHNIQUES.map((technique) => (
                    <option key={technique} value={technique.split(" ")[0]}>
                      {technique}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>

                {experiment.method === "Other" && (
                  <input
                    type="text"
                    name="method"
                    placeholder="Specify technique"
                    value=""
                    onChange={(e) => {
                      handleExperimentChange(e);
                      // Also update the technique field
                      setInstrumentDetails((prev) => ({
                        ...prev,
                        technique: e.target.value,
                      }));
                    }}
                    required
                    className="mt-2 w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                  />
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Targeted Absorption Edge*
                </label>
                <select
                  name="edge"
                  value={experiment.edge}
                  onChange={handleExperimentChange}
                  required
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                >
                  <option value="">Select Edge</option>
                  {ABSORPTION_EDGES.map((edge) => (
                    <option key={edge} value={edge}>
                      {edge}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>

                {experiment.edge === "Other" && (
                  <div>
                    <input
                      type="text"
                      name="edge"
                      placeholder="Specify edge (e.g., Ni(L))"
                      value=""
                      onChange={handleExperimentChange}
                      pattern="[A-Z][a-z]?\((K|L|M|N|O)\)"
                      title="Format: Element(Edge) - Example: C(K), Fe(L)"
                      required
                      className="mt-2 w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Format: Element(Edge) - Example: C(K), Fe(L)
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Normalization Method*
                </label>
                <select
                  name="normalization_method"
                  value={instrumentDetails.normalization_method}
                  onChange={handleInstrumentChange}
                  required
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                >
                  <option value="">Select Method</option>
                  {NORMALIZATION_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>

                {instrumentDetails.normalization_method === "Other" && (
                  <input
                    type="text"
                    name="normalization_method"
                    placeholder="Describe normalization method"
                    value=""
                    onChange={handleInstrumentChange}
                    required
                    className="mt-2 w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                  />
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Research Group*
                </label>
                <input
                  type="text"
                  name="group"
                  value={experiment.group}
                  onChange={handleExperimentChange}
                  required
                  placeholder="Collins Lab, etc."
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                />
              </div>

              <div className="md:col-span-3">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Technical Details
                </label>
                <textarea
                  name="technical_details"
                  value={instrumentDetails.technical_details}
                  onChange={handleInstrumentChange}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                  placeholder="Additional details about the data collection"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              User Information
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Name*
                </label>
                <input
                  type="text"
                  name="name"
                  value={user.name}
                  onChange={handleUserChange}
                  required
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Affiliation*
                </label>
                <input
                  type="text"
                  name="affiliation"
                  value={user.affiliation}
                  onChange={handleUserChange}
                  required
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Group*
                </label>
                <input
                  type="text"
                  name="group"
                  value={user.group}
                  onChange={handleUserChange}
                  required
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email*
                </label>
                <input
                  type="email"
                  name="email"
                  value={user.email}
                  onChange={handleUserChange}
                  required
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  DOI
                </label>
                <input
                  type="text"
                  name="doi"
                  value={user.doi}
                  onChange={handleUserChange}
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Sample Information
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Material Vendor / Source*
                </label>
                <input
                  type="text"
                  name="vendor"
                  value={sample.vendor}
                  onChange={handleSampleChange}
                  required
                  placeholder="Sigma Aldrich, etc."
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Preparation Method
                </label>
                <input
                  type="text"
                  name="preparation_method.method"
                  value={sample.preparation_method.method}
                  onChange={handleSampleChange}
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Preparation Details
                </label>
                <textarea
                  name="preparation_method.details"
                  value={sample.preparation_method.details}
                  onChange={handleSampleChange}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Molecular Orientation Details
                </label>
                <textarea
                  name="mol_orientation_details"
                  value={sample.mol_orientation_details}
                  onChange={handleSampleChange}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Upload CSV File
            </h2>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                CSV File*
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                required
                className="w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-wsu-crimson"
              />
            </div>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Molecule Image Upload
            </h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                To include a molecular structure image in the database, you need
                to create a GitHub issue to upload the SVG file.
              </p>

              <div className="rounded-md bg-blue-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1 md:flex md:justify-between">
                    <p className="text-sm text-blue-700">
                      The image should be an SVG file of the molecular structure
                      with dimensions of at least 500x500 pixels.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <p className="text-sm text-gray-700">
                  Please create a GitHub issue to upload your molecular
                  structure image:
                </p>

                <a
                  href={`https://github.com/WSU-Carbon-Lab/molecules/issues/new?template=new-molecule.md&title=Add%20molecule:%20${encodeURIComponent(molecule.name || "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 self-start rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                  </svg>
                  Create GitHub Issue for SVG Upload
                </a>

                <p className="text-xs text-gray-500">
                  You'll need a GitHub account to create this issue.
                </p>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="hover:bg-wsu-crimson-dark w-full rounded-md bg-wsu-crimson px-4 py-3 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-wsu-crimson focus:ring-offset-2"
            >
              {loading ? "Processing..." : "Submit"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
