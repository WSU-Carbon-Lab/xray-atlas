"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  CheckCircleIcon,
  CheckIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Button, Input, Label, ListBox, Select } from "@heroui/react";
import { trpc } from "~/trpc/client";
import { FieldTooltip } from "~/components/ui/field-tooltip";
import { InstrumentFieldsBlock } from "./instrument-fields-block";
import { useInstrumentNameAvailability } from "./use-instrument-name-availability";
import type {
  InstrumentContributionFormMessage,
  InstrumentContributionFormProps,
  InstrumentFormData,
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
    return facilities.filter((f) =>
      [f.name, f.city ?? "", f.country ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(lower),
    );
  }, [facilitiesQuery.data?.facilities, searchTerm]);

  const createInstrument = trpc.instruments.create.useMutation();

  const instrumentDraft: InstrumentFormData = {
    name: instrumentName,
    link: instrumentLink,
    status,
  };

  const nameCheck = useInstrumentNameAvailability({
    facilityId: selectedFacilityId || undefined,
    name: instrumentName,
    mode: "new-row",
  });
  const instrumentExists =
    !!selectedFacilityId &&
    instrumentName.length > 0 &&
    (nameCheck.data?.exists ?? false);

  const handleInstrumentChange = (
    field: keyof InstrumentFormData,
    value: InstrumentFormData[keyof InstrumentFormData],
  ) => {
    if (field === "name") setInstrumentName(String(value));
    else if (field === "link") setInstrumentLink(String(value));
    else setStatus(value as InstrumentStatus);
  };

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

  const duplicateWarning =
    instrumentExists ? (
      <div className="text-muted mt-2 flex items-center gap-2 text-sm">
        <ExclamationTriangleIcon className="h-4 w-4 shrink-0" aria-hidden />
        <span>This instrument already exists at this facility</span>
      </div>
    ) : null;

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
                  {filteredFacilities.map((f) => (
                    <ListBox.Item
                      key={f.id}
                      textValue={f.name}
                      className="text-sm"
                    >
                      {f.name}
                      {f.city ? ` · ${f.city}` : ""}
                      {f.country ? `, ${f.country}` : ""}
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

        <InstrumentFieldsBlock
          instrument={instrumentDraft}
          onChange={handleInstrumentChange}
          nameFieldName="instrument-name"
          linkFieldName="instrument-link"
          nameLabel="Instrument Name"
          linkLabel="Reference Link"
          namePlaceholder="e.g., Beamline 5A, XPS Analyzer"
          nameInputGroupClassName={
            instrumentExists ? "border-warning/50 bg-warning/10" : undefined
          }
          duplicateWarning={duplicateWarning}
          linkFieldTooltip="Optional URL to the instrument's official documentation or facility page."
        />
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

      <div className="flex items-center justify-between gap-3">
        <Button
          type="submit"
          variant="primary"
          isDisabled={createInstrument.isPending}
          className="inline-flex items-center gap-2"
        >
          <CheckIcon className="h-4 w-4 shrink-0" />
          <span>{createInstrument.isPending ? "Saving..." : "Save Instrument"}</span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          onPress={onClose}
          className="inline-flex items-center gap-2"
        >
          <XMarkIcon className="h-4 w-4 shrink-0" />
          <span>Cancel</span>
        </Button>
      </div>
    </form>
  );
}
