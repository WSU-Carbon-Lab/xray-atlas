"use client";

import { useEffect, useState } from "react";
import {
  CheckIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@heroui/react";
import { trpc } from "~/trpc/client";
import { InstrumentFieldsBlock } from "./instrument-fields-block";
import { parseInstrumentStatus } from "./instrument-status";
import { useInstrumentNameAvailability } from "./use-instrument-name-availability";
import type {
  InstrumentFormData,
  RegisteredInstrumentEditorProps,
} from "./types";

export function RegisteredInstrumentEditor({
  facilityId,
  instrument,
  embedded = false,
  onUpdated,
}: RegisteredInstrumentEditorProps) {
  const utils = trpc.useUtils();
  const [name, setName] = useState(instrument.name);
  const [link, setLink] = useState(instrument.link ?? "");
  const [status, setStatus] = useState<InstrumentFormData["status"]>(() =>
    parseInstrumentStatus(instrument.status),
  );
  const [rowError, setRowError] = useState<string | null>(null);

  useEffect(() => {
    setName(instrument.name);
    setLink(instrument.link ?? "");
    setStatus(parseInstrumentStatus(instrument.status));
    setRowError(null);
  }, [instrument.id, instrument.name, instrument.link, instrument.status]);

  const updateMut = trpc.instruments.update.useMutation();

  const checkData = useInstrumentNameAvailability({
    facilityId,
    name,
    mode: "edit",
    excludeInstrumentId: instrument.id,
  });
  const nameConflict = checkData.data?.exists ?? false;

  const formInstrument: InstrumentFormData = {
    name,
    link,
    status,
  };

  const handleFieldChange = (
    field: keyof InstrumentFormData,
    value: InstrumentFormData[keyof InstrumentFormData],
  ) => {
    if (field === "name") setName(String(value));
    else if (field === "link") setLink(String(value));
    else setStatus(value as InstrumentFormData["status"]);
  };

  const dirty =
    name.trim() !== instrument.name ||
    (link.trim() || null) !== (instrument.link ?? null) ||
    status !== parseInstrumentStatus(instrument.status);

  const handleSave = async () => {
    setRowError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setRowError("Instrument name is required");
      return;
    }
    if (nameConflict) {
      setRowError("Another instrument at this facility already uses this name");
      return;
    }

    const payload: {
      id: string;
      name?: string;
      link?: string | null;
      status?: InstrumentFormData["status"];
    } = { id: instrument.id };

    if (trimmed !== instrument.name) {
      payload.name = trimmed;
    }
    const nextLink = link.trim() || null;
    const prevLink = instrument.link ?? null;
    if (nextLink !== prevLink) {
      payload.link = nextLink ?? "";
    }
    const baselineStatus = parseInstrumentStatus(instrument.status);
    if (status !== baselineStatus) {
      payload.status = status;
    }

    if (
      payload.name === undefined &&
      payload.link === undefined &&
      payload.status === undefined
    ) {
      return;
    }

    try {
      await updateMut.mutateAsync(payload);
      await utils.facilities.getById.invalidate({ id: facilityId });
      onUpdated();
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null
            ? (e as { data?: { message?: string } }).data?.message
            : null;
      setRowError(msg ?? "Could not save changes");
    }
  };

  const duplicateWarning =
    nameConflict && name.trim().length > 0 ? (
      <div className="text-muted mt-2 flex items-center gap-2 text-sm">
        <ExclamationTriangleIcon className="h-4 w-4 shrink-0" aria-hidden />
        <span>Name already taken at this facility</span>
      </div>
    ) : null;

  const form = (
    <InstrumentFieldsBlock
      instrument={formInstrument}
      onChange={handleFieldChange}
      nameFieldName={`edit-inst-name-${instrument.id}`}
      linkFieldName={`edit-inst-link-${instrument.id}`}
      nameLabel="Name"
      linkLabel="Link (optional)"
      nameInputGroupClassName={
        nameConflict && name.trim().length > 0
          ? "border-warning/50 bg-warning/10"
          : undefined
      }
      duplicateWarning={duplicateWarning}
      statusListboxLabel="Instrument status"
      nameFieldTooltip="Instrument or beamline name as used at this facility"
      linkFieldTooltip="URL for documentation or the instrument page"
      statusFieldTooltip="Operating status"
    />
  );

  const actions = (
    <>
      {rowError ? (
        <p className="text-danger text-sm" role="alert">
          {rowError}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          isDisabled={!dirty || updateMut.isPending}
          onPress={() => {
            setName(instrument.name);
            setLink(instrument.link ?? "");
            setStatus(parseInstrumentStatus(instrument.status));
            setRowError(null);
          }}
          className="inline-flex items-center gap-2"
        >
          <XMarkIcon className="h-4 w-4 shrink-0" />
          <span>Reset</span>
        </Button>
        <Button
          type="button"
          variant="primary"
          isDisabled={
            !dirty || updateMut.isPending || !name.trim() || nameConflict
          }
          onPress={() => {
            void handleSave();
          }}
          className="inline-flex items-center gap-2"
        >
          <CheckIcon className="h-4 w-4 shrink-0" />
          <span>{updateMut.isPending ? "Saving..." : "Save changes"}</span>
        </Button>
      </div>
    </>
  );

  if (embedded) {
    return (
      <div className="space-y-4 pb-1">
        {form}
        {actions}
      </div>
    );
  }

  return (
    <div
      role="listitem"
      className="border-border bg-surface-1 space-y-4 rounded-lg border p-4 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <WrenchScrewdriverIcon className="text-muted h-5 w-5 shrink-0" />
        <span className="text-foreground text-sm font-semibold">
          {instrument.name}
        </span>
      </div>
      {form}
      {actions}
    </div>
  );
}
