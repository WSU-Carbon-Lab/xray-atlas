"use client";

import { useEffect, useMemo, useState } from "react";
import { FieldTooltip } from "./FieldTooltip";

function parseNumberArray(input: string): number[] {
  return input
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
}

type ExperimentFormProps = {
  onSubmit: (data: {
    moleculeId: string;
    vendorId: string;
    instrumentId: string;
    experiment: {
      absorbingAtom: string;
      coreLevel: string;
      normalization?: string;
      incidentElectricFieldPolarAngle?: number;
      incidentElectricFieldAzimuthalAngle?: number;
      energy: number[];
      intensity: number[];
      izero: number[];
      izero2: number[];
    };
  }) => void | Promise<void>;
  submitting?: boolean;
};

export function ExperimentForm({ onSubmit, submitting = false }: ExperimentFormProps) {
  const [molecules, setMolecules] = useState<
    Array<{ id: string; name: string; molecularFormula: string; smiles: string }>
  >([]);
  const [vendors, setVendors] = useState<
    Array<{ id: string; name: string; url: string | null }>
  >([]);
  const [facilities, setFacilities] = useState<string[]>([]);
  const [instruments, setInstruments] = useState<
    Array<{ id: string; name: string; link: string | null }>
  >([]);

  const [selectedMolecule, setSelectedMolecule] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedFacility, setSelectedFacility] = useState("");
  const [selectedInstrument, setSelectedInstrument] = useState("");

  const [experiment, setExperiment] = useState({
    absorbingAtom: "",
    coreLevel: "K",
    normalization: "",
    polarAngle: "",
    azimuthalAngle: "",
    energy: "",
    intensity: "",
    izero: "",
    izero2: "",
  });

  const coreLevels = useMemo(
    () => ["K", "L1", "L2", "L3", "M1", "M2", "M3"],
    [],
  );

  // Fetch molecules
  useEffect(() => {
    async function fetchMolecules() {
      try {
        const res = await fetch("/api/molecules/list");
        if (res.ok) {
          const data = await res.json();
          setMolecules(data.molecules || []);
        }
      } catch (err) {
        console.error("Failed to fetch molecules:", err);
      }
    }
    fetchMolecules();
  }, []);

  // Fetch vendors
  useEffect(() => {
    async function fetchVendors() {
      try {
        const res = await fetch("/api/vendors/list");
        if (res.ok) {
          const data = await res.json();
          setVendors(data.vendors || []);
        }
      } catch (err) {
        console.error("Failed to fetch vendors:", err);
      }
    }
    fetchVendors();
  }, []);

  // Fetch facilities
  useEffect(() => {
    async function fetchFacilities() {
      try {
        const res = await fetch("/api/instruments/facilities");
        if (res.ok) {
          const data = await res.json();
          setFacilities(data.facilities || []);
        }
      } catch (err) {
        console.error("Failed to fetch facilities:", err);
      }
    }
    fetchFacilities();
  }, []);

  // Fetch instruments when facility changes
  useEffect(() => {
    async function fetchInstruments() {
      if (!selectedFacility) {
        setInstruments([]);
        setSelectedInstrument("");
        return;
      }

      try {
        const res = await fetch(
          `/api/instruments/list?facility=${encodeURIComponent(selectedFacility)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setInstruments(data.instruments || []);
          setSelectedInstrument("");
        }
      } catch (err) {
        console.error("Failed to fetch instruments:", err);
        setInstruments([]);
      }
    }
    fetchInstruments();
  }, [selectedFacility]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({
      moleculeId: selectedMolecule,
      vendorId: selectedVendor,
      instrumentId: selectedInstrument,
      experiment: {
        absorbingAtom: experiment.absorbingAtom,
        coreLevel: experiment.coreLevel,
        normalization: experiment.normalization || undefined,
        incidentElectricFieldPolarAngle: experiment.polarAngle
          ? Number(experiment.polarAngle)
          : undefined,
        incidentElectricFieldAzimuthalAngle: experiment.azimuthalAngle
          ? Number(experiment.azimuthalAngle)
          : undefined,
        energy: parseNumberArray(experiment.energy),
        intensity: parseNumberArray(experiment.intensity),
        izero: parseNumberArray(experiment.izero),
        izero2: parseNumberArray(experiment.izero2),
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Select Entities</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              Molecule
              <FieldTooltip description="Select the molecule for this experiment" />
            </span>
            <select
              required
              className="rounded border p-2"
              value={selectedMolecule}
              onChange={(e) => setSelectedMolecule(e.target.value)}
            >
              <option value="">Select a molecule...</option>
              {molecules.map((mol) => (
                <option key={mol.id} value={mol.id}>
                  {mol.name} ({mol.molecularFormula})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              Vendor
              <FieldTooltip description="Select the vendor for this experiment" />
            </span>
            <select
              required
              className="rounded border p-2"
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
            >
              <option value="">Select a vendor...</option>
              {vendors.map((ven) => (
                <option key={ven.id} value={ven.id}>
                  {ven.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              Facility
              <FieldTooltip description="Select the facility for this experiment" />
            </span>
            <select
              required
              className="rounded border p-2"
              value={selectedFacility}
              onChange={(e) => {
                setSelectedFacility(e.target.value);
                setSelectedInstrument("");
              }}
            >
              <option value="">Select a facility...</option>
              {facilities.map((facility) => (
                <option key={facility} value={facility}>
                  {facility}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              Instrument
              <FieldTooltip description="Select the instrument for this experiment" />
            </span>
            <select
              required
              className="rounded border p-2"
              value={selectedInstrument}
              onChange={(e) => setSelectedInstrument(e.target.value)}
              disabled={!selectedFacility}
            >
              <option value="">Select an instrument...</option>
              {instruments.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Experiment Details</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              Absorbing Atom
              <FieldTooltip description="The atomic symbol of the element whose X-ray absorption edge is being probed (e.g., Fe for iron K-edge, Cu for copper L-edge)" />
            </span>
            <input
              required
              className="rounded border p-2"
              value={experiment.absorbingAtom}
              onChange={(e) =>
                setExperiment({ ...experiment, absorbingAtom: e.target.value })
              }
              title="The atomic symbol of the element whose X-ray absorption edge is being probed"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              Core Level
              <FieldTooltip description="The specific core electron shell being excited: K (1s), L1/L2/L3 (2s, 2p1/2, 2p3/2), or M1/M2/M3 (3s, 3p1/2, 3p3/2)" />
            </span>
            <select
              className="rounded border p-2"
              value={experiment.coreLevel}
              onChange={(e) =>
                setExperiment({ ...experiment, coreLevel: e.target.value })
              }
              title="The specific core electron shell being excited"
            >
              {coreLevels.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              Normalization (optional)
              <FieldTooltip description="Method or description of how the spectrum was normalized (e.g., edge jump normalization, area normalization)" />
            </span>
            <input
              className="rounded border p-2"
              value={experiment.normalization}
              onChange={(e) =>
                setExperiment({ ...experiment, normalization: e.target.value })
              }
              title="Method or description of how the spectrum was normalized"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              Polar Angle (deg, optional)
              <FieldTooltip description="The polar angle (θ) of the incident electric field vector relative to the sample surface normal, in degrees. Used for polarization-dependent XAS measurements" />
            </span>
            <input
              className="rounded border p-2"
              inputMode="decimal"
              value={experiment.polarAngle}
              onChange={(e) =>
                setExperiment({ ...experiment, polarAngle: e.target.value })
              }
              title="The polar angle of the incident electric field vector relative to the sample surface normal, in degrees"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              Azimuthal Angle (deg, optional)
              <FieldTooltip description="The azimuthal angle (φ) of the incident electric field vector in the plane perpendicular to the sample surface, in degrees. Used for orientation-dependent measurements" />
            </span>
            <input
              className="rounded border p-2"
              inputMode="decimal"
              value={experiment.azimuthalAngle}
              onChange={(e) =>
                setExperiment({ ...experiment, azimuthalAngle: e.target.value })
              }
              title="The azimuthal angle of the incident electric field vector in the plane perpendicular to the sample surface, in degrees"
            />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              Energy array
              <FieldTooltip description="Array of incident X-ray photon energies in eV, corresponding to each data point in the spectrum. Enter values separated by commas or whitespace" />
            </span>
            <textarea
              required
              rows={4}
              className="rounded border p-2"
              placeholder="e.g. 7090, 7091, 7092 ..."
              value={experiment.energy}
              onChange={(e) =>
                setExperiment({ ...experiment, energy: e.target.value })
              }
              title="Array of incident X-ray photon energies in eV. Enter values separated by commas or whitespace"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              Intensity array
              <FieldTooltip description="Array of X-ray absorption intensities (transmission or fluorescence signal), corresponding to each energy point. Must have the same length as the energy array" />
            </span>
            <textarea
              required
              rows={4}
              className="rounded border p-2"
              value={experiment.intensity}
              onChange={(e) =>
                setExperiment({ ...experiment, intensity: e.target.value })
              }
              title="Array of X-ray absorption intensities. Must have the same length as the energy array"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              I0 array
              <FieldTooltip description="Array of incident beam intensity (I0) measurements for each energy point, used for normalization. I0 is typically measured before the sample" />
            </span>
            <textarea
              required
              rows={4}
              className="rounded border p-2"
              value={experiment.izero}
              onChange={(e) =>
                setExperiment({ ...experiment, izero: e.target.value })
              }
              title="Array of incident beam intensity (I0) measurements for each energy point"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              I0 (secondary) array
              <FieldTooltip description="Array of secondary incident beam intensity (I0') measurements, often used for high-energy resolution fluorescence detection (HERFD) or when using a reference channel" />
            </span>
            <textarea
              required
              rows={4}
              className="rounded border p-2"
              value={experiment.izero2}
              onChange={(e) =>
                setExperiment({ ...experiment, izero2: e.target.value })
              }
              title="Array of secondary incident beam intensity (I0') measurements, often used for reference channels"
            />
          </label>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Create Experiment"}
        </button>
      </div>
    </form>
  );
}
