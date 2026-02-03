"use client";

import type { ProcessMethod } from "@prisma/client";
import { FormField } from "~/components/ui/form-field";
import { PROCESS_METHOD_OPTIONS } from "~/app/contribute/nexafs/types";

type VendorOption = {
  id: string;
  name: string;
};

type SampleInformationSectionProps = {
  preparationDate: string;
  setPreparationDate: (value: string) => void;
  processMethod: ProcessMethod | null;
  setProcessMethod: (value: ProcessMethod | null) => void;
  substrate: string;
  setSubstrate: (value: string) => void;
  solvent: string;
  setSolvent: (value: string) => void;
  thickness: number | null;
  setThickness: (value: number | null) => void;
  molecularWeight: number | null;
  setMolecularWeight: (value: number | null) => void;
  selectedVendorId: string;
  setSelectedVendorId: (value: string) => void;
  newVendorName: string;
  setNewVendorName: (value: string) => void;
  newVendorUrl: string;
  setNewVendorUrl: (value: string) => void;
  vendors: VendorOption[];
  isLoadingVendors: boolean;
};

export function SampleInformationSection({
  preparationDate,
  setPreparationDate,
  processMethod,
  setProcessMethod,
  substrate,
  setSubstrate,
  solvent,
  setSolvent,
  thickness,
  setThickness,
  molecularWeight,
  setMolecularWeight,
  selectedVendorId,
  setSelectedVendorId,
  newVendorName,
  setNewVendorName,
  newVendorUrl,
  setNewVendorUrl,
  vendors,
  isLoadingVendors,
}: SampleInformationSectionProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 space-y-2">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          2. Sample Information
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Provide context describing the specimen used across your experiments.
        </p>
      </div>

      <FormField
        label="Preparation Date"
        type="date"
        name="preparationDate"
        value={preparationDate}
        onChange={(value) => setPreparationDate(value as string)}
        tooltip="Date when the sample was prepared"
      />

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <FormField
          label="Process Method"
          type="select"
          name="processMethod"
          value={processMethod ?? ""}
          onChange={(value) =>
            setProcessMethod(
              typeof value === "string" && value.length > 0
                ? (value as ProcessMethod)
                : null,
            )
          }
          tooltip="Method used to process the sample"
          options={[
            { value: "", label: "Select process method (optional)" },
            ...PROCESS_METHOD_OPTIONS.map((opt) => ({
              value: opt.value,
              label: opt.label,
            })),
          ]}
        />
        <FormField
          label="Substrate"
          type="text"
          name="substrate"
          value={substrate}
          onChange={(value) => setSubstrate(value as string)}
          placeholder="e.g., Si wafer, glass"
          tooltip="Substrate material on which the sample sits"
        />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <FormField
          label="Solvent"
          type="text"
          name="solvent"
          value={solvent}
          onChange={(value) => setSolvent(value as string)}
          placeholder="e.g., chloroform, toluene"
          tooltip="Solvent used during sample prep (if any)"
        />
        <FormField
          label="Thickness (nm)"
          type="number"
          name="thickness"
          value={typeof thickness === "number" ? thickness : ""}
          onChange={(value) =>
            setThickness(typeof value === "number" ? value : null)
          }
          placeholder="e.g., 50"
          tooltip="Sample thickness in nanometers"
          min={0}
          step={0.1}
        />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <FormField
          label="Molecular Weight (g/mol)"
          type="number"
          name="molecularWeight"
          value={typeof molecularWeight === "number" ? molecularWeight : ""}
          onChange={(value) =>
            setMolecularWeight(typeof value === "number" ? value : null)
          }
          placeholder="e.g., 1000.5"
          tooltip="Molecular weight in grams per mole"
          min={0}
          step={0.01}
        />
        <FormField
          label="Select Existing Vendor"
          type="select"
          name="vendor"
          value={selectedVendorId}
          onChange={(value) => setSelectedVendorId(value as string)}
          tooltip="Pick an existing vendor or add a new one"
          options={[
            {
              value: "",
              label: isLoadingVendors
                ? "Loading vendors..."
                : "Select a vendor (optional)",
            },
            ...vendors.map((vendor) => ({
              value: vendor.id,
              label: vendor.name,
            })),
          ]}
        />
      </div>

      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
        <p className="font-medium">Or create a new vendor</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            value={newVendorName}
            onChange={(event) => setNewVendorName(event.target.value)}
            placeholder="Vendor name"
            className="focus:border-accent focus:ring-accent/20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
          <input
            value={newVendorUrl}
            onChange={(event) => setNewVendorUrl(event.target.value)}
            placeholder="Vendor website (optional)"
            className="focus:border-accent focus:ring-accent/20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
      </div>
    </section>
  );
}
