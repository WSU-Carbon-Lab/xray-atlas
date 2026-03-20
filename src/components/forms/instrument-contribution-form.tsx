"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { trpc } from "~/trpc/client";
import { DefaultButton as Button } from "~/components/ui/button";
import { FieldTooltip } from "~/components/ui/field-tooltip";
import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { Input, Label, ListBox, Select } from "@heroui/react";

import { INSTRUMENT_STATUS_OPTIONS } from "./constants";
import type {
  InstrumentContributionFormMessage,
  InstrumentContributionFormProps,
  InstrumentStatus,
} from "./types";

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
  const [message, setMessage] = useState<InstrumentContributionFormMessage | null>(null);
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
          <h3 className="text-lg font-semibold text-foreground">
            Instrument Details
          </h3>
          <p className="text-sm text-muted">
            Provide the instrument&apos;s identifying information and link it to the correct facility.
          </p>
        </header>

        {!facilityId && (
          <div className="space-y-3">
            <Select
              className="w-full"
              placeholder="Select a facility"
              isRequired
              value={selectedFacilityId ? selectedFacilityId : null}
              onChange={(value) => {
                setSelectedFacilityId(
                  value == null
                    ? ""
                    : String(Array.isArray(value) ? value[0] : value),
                );
              }}
            >
              <Label className="flex items-center gap-1 text-sm font-medium text-foreground">
                Facility{" "}
                <span
                  className="text-error dark:text-error-light"
                  aria-hidden="true"
                >
                  *
                </span>
                <span className="sr-only">(required)</span>
                <FieldTooltip description="Choose the facility that hosts this instrument. Use the search box to filter by name, city, or country." />
              </Label>
              <Select.Trigger className="min-h-[44px]">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox aria-label="Facilities">
                  {filteredFacilities.map((facility) => (
                    <ListBox.Item
                      key={facility.id}
                      textValue={facility.name}
                      className="text-sm"
                    >
                      {facility.name}
                      {facility.city ? ` · ${facility.city}` : ""}
                      {facility.country ? `, ${facility.country}` : ""}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            <div className="flex items-center gap-2">
              <label htmlFor="facility-search" className="sr-only">
                Search facilities
              </label>
              <Input
                id="facility-search"
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search facilities..."
                aria-label="Search facilities by name, city, or country"
                className="flex-1 min-h-[44px] text-sm"
              />
              <FieldTooltip description="Filter facilities by name, city, or country" />
            </div>

            {facilitiesQuery.isLoading && (
              <p className="text-sm text-muted" role="status" aria-live="polite">
                Loading facilities…
              </p>
            )}
          </div>
        )}

        {facilityId && (
          <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
            <p className="font-medium text-foreground">Facility</p>
            <p className="text-muted">{facilityName ?? "Selected facility"}</p>
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor="instrument-name"
            className="mb-1 flex items-center gap-1 text-sm font-medium text-foreground"
          >
            Instrument Name{" "}
            <span className="text-error dark:text-error-light" aria-hidden="true">
              *
            </span>
            <span className="sr-only">(required)</span>
            <FieldTooltip description="Provide the instrument's commonly used name or designation." />
          </label>
          <Input
            id="instrument-name"
            type="text"
            value={instrumentName}
            onChange={(event) => setInstrumentName(event.target.value)}
            placeholder="e.g., Beamline 5A, XPS Analyzer"
            className="w-full min-h-[44px] text-sm"
            required
            aria-required="true"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="instrument-link"
            className="mb-1 flex items-center gap-1 text-sm font-medium text-foreground"
          >
            Reference Link
            <FieldTooltip description="Optional URL to the instrument's official documentation or facility page." />
          </label>
          <Input
            id="instrument-link"
            type="url"
            value={instrumentLink}
            onChange={(event) => setInstrumentLink(event.target.value)}
            placeholder="https://..."
            className="w-full min-h-[44px] text-sm"
          />
        </div>

        <Select
          className="w-full"
          value={status}
          onChange={(value) => {
            if (value == null) return;
            setStatus(
              String(Array.isArray(value) ? value[0] : value) as InstrumentStatus,
            );
          }}
        >
          <Label className="flex items-center gap-1 text-sm font-medium text-foreground">
            Status
            <FieldTooltip description="Indicate whether the instrument is actively operating, inactive, or undergoing maintenance." />
          </Label>
          <Select.Trigger className="min-h-[44px]">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox aria-label="Instrument status" className="w-full">
              {INSTRUMENT_STATUS_OPTIONS.map((option) => (
                <ListBox.Item
                  key={option.value}
                  textValue={option.label}
                  className="text-sm"
                >
                  {option.label}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </section>

      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          aria-live={message.type === "error" ? "assertive" : "polite"}
          aria-atomic="true"
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
            message.type === "success"
              ? "border-success/30 bg-success/10 text-success dark:border-success-light/40 dark:bg-success-light/15 dark:text-success-light"
              : "border-error/30 bg-error/10 text-error dark:border-error-light/40 dark:bg-error-light/15 dark:text-error-light"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircleIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <ExclamationCircleIcon
              className="h-4 w-4 shrink-0"
              aria-hidden="true"
            />
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
