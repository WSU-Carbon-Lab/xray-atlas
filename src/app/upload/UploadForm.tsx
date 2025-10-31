"use client";

import { useEffect, useMemo, useState } from "react";

type ApiError = { message: string };

function FieldTooltip({ description }: { description: string }) {
  return (
    <span className="group relative inline-block">
      <svg
        className="ml-1 h-4 w-4 cursor-help text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-label="More information"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className="invisible absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 rounded bg-gray-800 px-3 py-2 text-sm text-white opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
        {description}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
      </span>
    </span>
  );
}

function parseNumberArray(input: string): number[] {
  return input
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
}

export default function UploadForm() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [molecule, setMolecule] = useState({
    name: "",
    iupacName: "",
    synonyms: "",
    molecularFormula: "",
    smiles: "",
    inchi: "",
    image: "",
    inchiKey: "",
    casNumber: "",
    pubChemCid: "",
  });

  const [vendor, setVendor] = useState({ name: "", url: "" });
  const [instrument, setInstrument] = useState({
    facility: "",
    instrument: "",
    link: "",
  });

  // Facilities and instruments state
  const [facilities, setFacilities] = useState<string[]>([]);
  const [instruments, setInstruments] = useState<
    Array<{ id: string; name: string; link: string | null }>
  >([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [loadingInstruments, setLoadingInstruments] = useState(false);
  const [customInstrument, setCustomInstrument] = useState(false);
  const [customFacility, setCustomFacility] = useState(false);
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

  // Fetch facilities on mount
  useEffect(() => {
    async function fetchFacilities() {
      setLoadingFacilities(true);
      try {
        const res = await fetch("/api/instruments/facilities");
        if (res.ok) {
          const data = await res.json();
          setFacilities(data.facilities || []);
        }
      } catch (err) {
        console.error("Failed to fetch facilities:", err);
      } finally {
        setLoadingFacilities(false);
      }
    }
    fetchFacilities();
  }, []);

  // Fetch instruments when facility changes
  useEffect(() => {
    async function fetchInstruments() {
      if (!instrument.facility) {
        setInstruments([]);
        setCustomInstrument(false);
        return;
      }

      setLoadingInstruments(true);
      try {
        const res = await fetch(
          `/api/instruments/list?facility=${encodeURIComponent(instrument.facility)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setInstruments(data.instruments || []);
          setCustomInstrument(false);
          // Reset instrument selection when facility changes
          setInstrument((prev) => ({ ...prev, instrument: "" }));
        }
      } catch (err) {
        console.error("Failed to fetch instruments:", err);
        setInstruments([]);
      } finally {
        setLoadingInstruments(false);
      }
    }
    fetchInstruments();
  }, [instrument.facility]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        molecule: {
          name: molecule.name,
          iupacName: molecule.iupacName,
          synonyms: molecule.synonyms
            .split(/[,\n]+/)
            .map((s) => s.trim())
            .filter(Boolean),
          molecularFormula: molecule.molecularFormula,
          image: molecule.image || undefined,
          smiles: molecule.smiles,
          inchi: molecule.inchi,
          inchiKey: molecule.inchiKey || undefined,
          casNumber: molecule.casNumber || undefined,
          pubChemCid: molecule.pubChemCid || undefined,
        },
        vendor: {
          name: vendor.name,
          url: vendor.url || undefined,
        },
        instrument: {
          facility: instrument.facility,
          instrument: instrument.instrument,
          link: instrument.link || undefined,
        },
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
      };

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(data?.message || `Upload failed (${res.status})`);
      }
      setSuccess("Upload saved successfully.");
      // Optionally clear form
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6">
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

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Molecule</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              Name
              <FieldTooltip description="The common name for the molecule being studied" />
            </span>
            <input
              required
              className="rounded border p-2"
              value={molecule.name}
              onChange={(e) =>
                setMolecule({ ...molecule, name: e.target.value })
              }
              title="The common name for the molecule being studied"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              Molecular Formula
              <FieldTooltip description="The chemical formula showing the number of atoms of each element (e.g., C6H6 for benzene)" />
            </span>
            <input
              required
              className="rounded border p-2"
              value={molecule.molecularFormula}
              onChange={(e) =>
                setMolecule({ ...molecule, molecularFormula: e.target.value })
              }
              title="The chemical formula showing the number of atoms of each element (e.g., C6H6 for benzene)"
            />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="flex items-center">
              IUPAC Name
              <FieldTooltip description="The International Union of Pure and Applied Chemistry (IUPAC) name of the molecule being studied" />
            </span>
            <textarea
              required
              className="rounded border p-2"
              rows={3}
              value={molecule.iupacName}
              onChange={(e) =>
                setMolecule({ ...molecule, iupacName: e.target.value })
              }
              title="The International Union of Pure and Applied Chemistry (IUPAC) name of the molecule being studied"
            />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="flex items-center">
              Synonyms (comma or newline separated)
              <FieldTooltip description="Alternative names or aliases for the molecule (e.g., benzene, benzol, cyclohexatriene). Separate multiple synonyms with commas or new lines" />
            </span>
            <textarea
              className="rounded border p-2"
              rows={2}
              value={molecule.synonyms}
              onChange={(e) =>
                setMolecule({ ...molecule, synonyms: e.target.value })
              }
              title="Alternative names or aliases for the molecule. Separate multiple synonyms with commas or new lines"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              SMILES
              <FieldTooltip description="Simplified Molecular Input Line Entry System - a line notation for describing molecular structure using ASCII strings (e.g., c1ccccc1 for benzene)" />
            </span>
            <input
              required
              className="rounded border p-2"
              value={molecule.smiles}
              onChange={(e) =>
                setMolecule({ ...molecule, smiles: e.target.value })
              }
              title="Simplified Molecular Input Line Entry System - a line notation for describing molecular structure"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              InChI
              <FieldTooltip description="International Chemical Identifier - a textual identifier for chemical substances that standardizes molecular representation (e.g., InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H for benzene)" />
            </span>
            <input
              required
              className="rounded border p-2"
              value={molecule.inchi}
              onChange={(e) =>
                setMolecule({ ...molecule, inchi: e.target.value })
              }
              title="International Chemical Identifier - a textual identifier for chemical substances"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              InChI Key (optional)
              <FieldTooltip description="A fixed-length (27 character) condensed representation of the InChI identifier, useful for database lookups and indexing" />
            </span>
            <input
              className="rounded border p-2"
              value={molecule.inchiKey}
              onChange={(e) =>
                setMolecule({ ...molecule, inchiKey: e.target.value })
              }
              title="A fixed-length condensed representation of the InChI identifier, useful for database lookups"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              CAS Number (optional)
              <FieldTooltip description="Chemical Abstracts Service Registry Number - a unique numeric identifier assigned by CAS to every chemical substance described in the open scientific literature" />
            </span>
            <input
              className="rounded border p-2"
              value={molecule.casNumber}
              onChange={(e) =>
                setMolecule({ ...molecule, casNumber: e.target.value })
              }
              title="Chemical Abstracts Service Registry Number - a unique numeric identifier for chemical substances"
            />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="flex items-center">
              PubChem CID (optional)
              <FieldTooltip description="PubChem Compound Identifier - a unique identifier for chemical compounds in the PubChem database" />
            </span>
            <input
              className="rounded border p-2"
              value={molecule.pubChemCid}
              onChange={(e) =>
                setMolecule({ ...molecule, pubChemCid: e.target.value })
              }
              title="PubChem Compound Identifier - a unique identifier for chemical compounds in the PubChem database"
            />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Vendor</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              Name
              <FieldTooltip description="The name of the vendor or supplier from which the sample was obtained" />
            </span>
            <input
              required
              className="rounded border p-2"
              value={vendor.name}
              onChange={(e) => setVendor({ ...vendor, name: e.target.value })}
              title="The name of the vendor or supplier from which the sample was obtained"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              URL (optional)
              <FieldTooltip description="Website URL or catalog link for the vendor" />
            </span>
            <input
              className="rounded border p-2"
              value={vendor.url}
              onChange={(e) => setVendor({ ...vendor, url: e.target.value })}
              title="Website URL or catalog link for the vendor"
            />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Instrument</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              Facility
              <FieldTooltip description="The name of the research facility or synchrotron beamline where the experiment was conducted (e.g., ALS, APS, SSRL)" />
            </span>
            {!customFacility ? (
              <div className="flex gap-2">
                <select
                  required
                  className="flex-1 rounded border p-2"
                  value={instrument.facility}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setCustomFacility(true);
                      setInstrument({
                        ...instrument,
                        facility: "",
                        instrument: "",
                      });
                    } else {
                      setInstrument({
                        ...instrument,
                        facility: e.target.value,
                        instrument: "",
                      });
                      setCustomInstrument(false);
                    }
                  }}
                  disabled={loadingFacilities}
                  title="The name of the research facility or synchrotron beamline where the experiment was conducted"
                >
                  <option value="">Select a facility...</option>
                  <option value="__custom__">+ Add custom facility</option>
                  {facilities.map((facility) => (
                    <option key={facility} value={facility}>
                      {facility}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <input
                required
                type="text"
                className="rounded border p-2"
                placeholder="Enter facility name..."
                value={instrument.facility}
                onChange={(e) =>
                  setInstrument({
                    ...instrument,
                    facility: e.target.value,
                    instrument: "",
                  })
                }
                title="The name of the research facility or synchrotron beamline where the experiment was conducted"
              />
            )}
            {customFacility && (
              <button
                type="button"
                onClick={() => {
                  setCustomFacility(false);
                  setInstrument({
                    ...instrument,
                    facility: "",
                    instrument: "",
                  });
                }}
                className="mt-1 text-xs text-gray-600 underline hover:text-gray-800"
              >
                Select from existing facilities
              </button>
            )}
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              Instrument
              <FieldTooltip description="The specific instrument or beamline name used for the X-ray absorption spectroscopy measurement" />
            </span>
            {instrument.facility ? (
              !customInstrument ? (
                <select
                  required
                  className="rounded border p-2"
                  value={instrument.instrument}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setCustomInstrument(true);
                      setInstrument({ ...instrument, instrument: "" });
                    } else {
                      const selectedInstrument = instruments.find(
                        (i) => i.name === e.target.value,
                      );
                      setInstrument({
                        ...instrument,
                        instrument: e.target.value,
                        link: selectedInstrument?.link || instrument.link,
                      });
                    }
                  }}
                  disabled={loadingInstruments}
                  title="The specific instrument or beamline name used for the X-ray absorption spectroscopy measurement"
                >
                  <option value="">Select an instrument...</option>
                  <option value="__custom__">+ Add custom instrument</option>
                  {instruments.map((inst) => (
                    <option key={inst.id} value={inst.name}>
                      {inst.name}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    required
                    type="text"
                    className="rounded border p-2"
                    placeholder="Enter instrument name..."
                    value={instrument.instrument}
                    onChange={(e) =>
                      setInstrument({
                        ...instrument,
                        instrument: e.target.value,
                      })
                    }
                    title="The specific instrument or beamline name used for the X-ray absorption spectroscopy measurement"
                  />
                  {instruments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomInstrument(false);
                        setInstrument({ ...instrument, instrument: "" });
                      }}
                      className="mt-1 text-xs text-gray-600 underline hover:text-gray-800"
                    >
                      Select from existing instruments
                    </button>
                  )}
                </>
              )
            ) : (
              <input
                required
                disabled
                className="rounded border bg-gray-100 p-2"
                placeholder="Select a facility first"
                value=""
              />
            )}
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              Link (optional)
              <FieldTooltip description="URL to documentation or information about the instrument or beamline" />
            </span>
            <input
              className="rounded border p-2"
              value={instrument.link}
              onChange={(e) =>
                setInstrument({ ...instrument, link: e.target.value })
              }
              title="URL to documentation or information about the instrument or beamline"
            />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Experiment</h2>
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
          {submitting ? "Saving..." : "Save Upload"}
        </button>
      </div>
    </form>
  );
}
