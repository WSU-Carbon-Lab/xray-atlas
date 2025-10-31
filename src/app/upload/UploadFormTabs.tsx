"use client";

import { useState } from "react";
import { MoleculeForm } from "./components/MoleculeForm";
import { VendorForm } from "./components/VendorForm";
import { InstrumentForm } from "./components/InstrumentForm";
import { ExperimentForm } from "./components/ExperimentForm";

function MoleculeFormWithSubmit() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded border border-green-300 bg-green-50 p-3 text-green-700">
          {success}
        </div>
      )}
      <MoleculeForm
        onSubmit={async (molecule) => {
          setSubmitting(true);
          setError(null);
          setSuccess(null);
          try {
            // Convert Molecule type to the format expected by the API
            const payload = {
              name: molecule.name,
              iupacName: molecule.iupacName,
              synonyms: molecule.synonyms,
              molecularFormula: molecule.molecularFormula,
              image: molecule.image || undefined,
              smiles: molecule.smiles,
              inchi: molecule.inchi,
              inchiKey: molecule.inchiKey || undefined,
              casNumber: molecule.casNumber || undefined,
              pubChemCid: molecule.pubChemCid || undefined,
            };

            const res = await fetch("/api/molecules/create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            if (!res.ok) {
              const errorData = await res.json().catch(() => null);
              throw new Error(
                errorData?.message ||
                  `Failed to create molecule (${res.status})`,
              );
            }

            const data = await res.json();
            setSuccess(
              data.message ||
                `Molecule ${data.created ? "created" : "updated"} successfully!`,
            );
            setError(null);
          } catch (err: any) {
            setError(err?.message ?? "Something went wrong");
            setSuccess(null);
          } finally {
            setSubmitting(false);
          }
        }}
        submitLabel={submitting ? "Saving..." : "Save Molecule"}
      />
    </div>
  );
}

function ExperimentFormWithSubmit() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded border border-green-300 bg-green-50 p-3 text-green-700">
          {success}
        </div>
      )}
      <ExperimentForm
        submitting={submitting}
        onSubmit={async (data) => {
          setSubmitting(true);
          setError(null);
          setSuccess(null);
          try {
            const res = await fetch("/api/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                moleculeId: data.moleculeId,
                vendorId: data.vendorId,
                instrumentId: data.instrumentId,
                experiment: data.experiment,
              }),
            });

            if (!res.ok) {
              const errorData = await res.json().catch(() => null);
              throw new Error(
                errorData?.message || `Upload failed (${res.status})`,
              );
            }

            setSuccess("Experiment created successfully!");
            setError(null);
          } catch (err: any) {
            setError(err?.message ?? "Something went wrong");
            setSuccess(null);
          } finally {
            setSubmitting(false);
          }
        }}
      />
    </div>
  );
}

type Tab = "molecule" | "vendor" | "instrument" | "experiment";

export default function UploadFormTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("experiment");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "molecule", label: "Add Molecule" },
    { id: "vendor", label: "Add Vendor" },
    { id: "instrument", label: "Add Instrument" },
    { id: "experiment", label: "Create Experiment" },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSuccess(null);
                setError(null);
              }}
              className={`border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-black text-black"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              } `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded border border-green-300 bg-green-50 p-3 text-green-700">
          {success}
        </div>
      )}

      {/* Tab Content */}
      <div>
        {activeTab === "molecule" && <MoleculeFormWithSubmit />}

        {activeTab === "vendor" && (
          <VendorForm
            onSubmit={async (vendor) => {
              // TODO: Create API route for creating vendors
              setSuccess(
                "Vendor form submitted. (API route not yet implemented)",
              );
            }}
          />
        )}

        {activeTab === "instrument" && (
          <InstrumentForm
            onSubmit={async (instrument) => {
              // TODO: Create API route for creating instruments
              setSuccess(
                "Instrument form submitted. (API route not yet implemented)",
              );
            }}
          />
        )}

        {activeTab === "experiment" && <ExperimentFormWithSubmit />}
      </div>
    </div>
  );
}
