"use client";

import { useEffect, useMemo, useState } from "react";
import { trpc } from "~/trpc/client";
import { DefaultButton as Button } from "~/components/ui/button";
import { FieldTooltip } from "~/components/ui/field-tooltip";
import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";

type InstrumentContributionFormProps = {
  facilityId?: string;
  facilityName?: string;
  onCompleted?: (payload: { instrumentId: string; facilityId: string }) => void;
  onClose?: () => void;
};

type InstrumentStatus = "active" | "inactive" | "under_maintenance";

const statusOptions: Array<{ value: InstrumentStatus; label: string }> = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "under_maintenance", label: "Under Maintenance" },
];

export function InstrumentContributionForm({
  facilityId,
  facilityName,
  onCompleted,
  onClose,
}: InstrumentContributionFormProps) {
  const [selectedFacilityId, setSelectedFacilityId] = useState(facilityId ?? "");
  const [instrumentName, setInstrumentName] = useState("");
  const [instrumentLink, setInstrumentLink] = useState("");
  const [status, setStatus] = useState<InstrumentStatus>("active");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const facilitiesQuery = trpc.facilities.list.useQuery(
    {
      limit: 200,
      offset: 0,
      sortBy: "name",
    },
    {
      enabled: !facilityId,
      staleTime: 5 * 60 * 1000,
    },
  );

  useEffect(() => {
    if (facilityId) {
      setSelectedFacilityId(facilityId);
    }
  }, [facilityId]);

  const filteredFacilities = useMemo(() => {
    const facilities = facilitiesQuery.data?.facilities ?? [];
    if (!searchTerm.trim()) {
      return facilities;
    }
    const lower = searchTerm.toLowerCase();
    return facilities.filter((facility) =>
      [facility.name, facility.city ?? "", facility.country ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(lower),
    );
  }, [facilitiesQuery.data?.facilities, searchTerm]);

  const createInstrument = trpc.instruments.create.useMutation();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!selectedFacilityId) {
      setMessage({ type: "error", text: "Please choose a facility for the instrument." });
      return;
    }

    if (instrumentName.trim().length === 0) {
      setMessage({ type: "error", text: "Instrument name is required." });
      return;
    }

    try {
      const created = await createInstrument.mutateAsync({
        facilityId: selectedFacilityId,
        name: instrumentName.trim(),
        link: instrumentLink.trim().length > 0 ? instrumentLink.trim() : null,
        status,
      });

      setMessage({
        type: "success",
        text: `Instrument "${created.name}" created successfully.`,
      });

      onCompleted?.({ instrumentId: created.id, facilityId: selectedFacilityId });
      onClose?.();
    } catch (error: unknown) {
      const derivedMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null
            ? (error as { data?: { message?: string } }).data?.message
            : null;
      setMessage({
        type: "error",
        text: derivedMessage ?? "Unable to create instrument. Please try again.",
      });
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="space-y-4">
        <header>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Instrument Details
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Provide the instrument&apos;s identifying information and link it to the correct facility.
          </p>
        </header>

        {!facilityId && (
          <div className="space-y-3">
            <label className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Facility <span className="text-red-500">*</span>
              <FieldTooltip description="Choose the facility that hosts this instrument. Use the search box to filter by name, city, or country." />
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search facilities..."
              className="focus:border-accent focus:ring-accent/20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
            <select
              value={selectedFacilityId}
              onChange={(event) => setSelectedFacilityId(event.target.value)}
              className="focus:border-accent focus:ring-accent/20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">Select a facility</option>
              {filteredFacilities.map((facility) => (
                <option key={facility.id} value={facility.id}>
                  {facility.name}
                  {facility.city ? ` · ${facility.city}` : ""}
                  {facility.country ? `, ${facility.country}` : ""}
                </option>
              ))}
            </select>
            {facilitiesQuery.isLoading && (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading facilities…</p>
            )}
          </div>
        )}

        {facilityId && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <p className="font-medium">Facility</p>
            <p>{facilityName ?? "Selected facility"}</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Instrument Name <span className="text-red-500">*</span>
            <FieldTooltip description="Provide the instrument's commonly used name or designation." />
          </label>
          <input
            type="text"
            value={instrumentName}
            onChange={(event) => setInstrumentName(event.target.value)}
            placeholder="e.g., Beamline 5A, XPS Analyzer"
            className="focus:border-accent focus:ring-accent/20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Reference Link
            <FieldTooltip description="Optional URL to the instrument's official documentation or facility page." />
          </label>
          <input
            type="url"
            value={instrumentLink}
            onChange={(event) => setInstrumentLink(event.target.value)}
            placeholder="https://..."
            className="focus:border-accent focus:ring-accent/20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        <div className="space-y-2">
          <label className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Status
            <FieldTooltip description="Indicate whether the instrument is actively operating, inactive, or undergoing maintenance." />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as InstrumentStatus)}
            className="focus:border-accent focus:ring-accent/20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {message && (
        <div
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/10 dark:text-green-200"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircleIcon className="h-4 w-4 shrink-0" />
          ) : (
            <ExclamationCircleIcon className="h-4 w-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button type="submit" variant="primary" isDisabled={createInstrument.isPending}>
          {createInstrument.isPending ? "Saving..." : "Save Instrument"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
