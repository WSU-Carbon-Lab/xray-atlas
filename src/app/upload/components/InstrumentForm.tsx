"use client";

import { useEffect, useState } from "react";
import { FieldTooltip } from "./FieldTooltip";

type InstrumentData = {
  facility: string;
  instrument: string;
  link: string;
};

type InstrumentFormProps = {
  onSubmit: (instrument: InstrumentData) => void | Promise<void>;
  initialData?: Partial<InstrumentData>;
  submitLabel?: string;
};

export function InstrumentForm({
  onSubmit,
  initialData,
  submitLabel = "Save Instrument",
}: InstrumentFormProps) {
  const [instrument, setInstrument] = useState<InstrumentData>({
    facility: "",
    instrument: "",
    link: "",
    ...initialData,
  });

  const [facilities, setFacilities] = useState<string[]>([]);
  const [instruments, setInstruments] = useState<
    Array<{ id: string; name: string; link: string | null }>
  >([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [loadingInstruments, setLoadingInstruments] = useState(false);
  const [customInstrument, setCustomInstrument] = useState(false);
  const [customFacility, setCustomFacility] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(instrument);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Add Instrument</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              Facility
              <FieldTooltip description="The name of the research facility or synchrotron beamline where the experiment was conducted (e.g., ALS, APS, SSRL)" />
            </span>
            {!customFacility ? (
              <select
                required
                className="rounded border p-2"
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

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
