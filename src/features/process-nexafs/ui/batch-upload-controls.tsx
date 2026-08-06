"use client";

type InstrumentOption = { id: string; name: string; facilityName?: string };

/**
 * Batch controls for folder / multi-file NEXAFS uploads: one instrument applied
 * to every open dataset tab.
 */
export function BatchUploadControls(props: {
  instrumentOptions: InstrumentOption[];
  batchInstrumentId: string;
  onBatchInstrumentChange: (instrumentId: string) => void;
  isLoadingInstruments?: boolean;
  datasetCount: number;
}) {
  const {
    instrumentOptions,
    batchInstrumentId,
    onBatchInstrumentChange,
    isLoadingInstruments = false,
    datasetCount,
  } = props;

  if (datasetCount === 0) {
    return null;
  }

  return (
    <div className="border-border bg-surface-2/40 mb-3 flex flex-col gap-2 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-foreground text-sm font-semibold">
          Batch instrument
        </p>
        <p className="text-muted text-xs">
          Applies to all {datasetCount} open dataset
          {datasetCount === 1 ? "" : "s"} from a multi-file or folder drop.
          Filenames like transmission_* map to TRANS / Beer-law.
        </p>
      </div>
      <label className="flex w-full flex-col gap-1 sm:max-w-sm">
        <span className="text-foreground text-xs font-medium">
          Instrument for all datasets
        </span>
        <select
          className="border-border bg-surface text-foreground focus:border-accent focus:ring-accent min-h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-1"
          value={batchInstrumentId}
          disabled={isLoadingInstruments || instrumentOptions.length === 0}
          aria-label="Instrument for all uploaded datasets"
          onChange={(event) => onBatchInstrumentChange(event.target.value)}
        >
          <option value="">
            {isLoadingInstruments
              ? "Loading instruments..."
              : "Select instrument"}
          </option>
          {instrumentOptions.map((instrument) => (
            <option key={instrument.id} value={instrument.id}>
              {instrument.facilityName
                ? `${instrument.name} (${instrument.facilityName})`
                : instrument.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
