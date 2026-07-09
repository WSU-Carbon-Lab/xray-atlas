"use client";

import Link from "next/link";
import { ArrowDownTrayIcon, BeakerIcon } from "@heroicons/react/24/outline";
import { Chip, ScrollShadow, Table } from "@heroui/react";
import { buttonVariants, cn } from "@heroui/styles";
import { PlotToolbarRichHint } from "~/components/plots/toolbars/plot-toolbar-rich-hint";
import {
  NEXAFS_UPLOAD_TEMPLATE_COLUMNS,
  NEXAFS_UPLOAD_TEMPLATE_CSV_PUBLIC_PATH,
  NEXAFS_UPLOAD_TEMPLATE_EXAMPLE_ROWS,
  type NexafsUploadTemplateColumn,
} from "~/lib/nexafs-upload-template-columns";
import { WIKI_NEXAFS_UPLOAD_TEMPLATE_FILENAME } from "~/lib/wiki-nexafs-upload-template-csv";
import { FileUploadZone } from "./file-upload-zone";

type NexafsUploadPortalProps = {
  onFilesSelected: (files: File[]) => void;
};

const EXAMPLE_TABLE_CLASSNAME = cn(
  "w-max min-w-[72rem] text-sm",
  "[&_thead]:bg-surface-2/90",
  "[&_th]:border-border [&_th]:border-b [&_th]:text-left",
  "[&_th]:px-3 [&_th]:py-2.5",
  "[&_thead_th:first-child]:rounded-tl-xl",
  "[&_thead_th:last-child]:rounded-tr-xl",
  "[&_td]:px-3 [&_td]:py-2",
  "[&_tbody_tr:nth-child(odd)]:bg-background/70",
  "[&_tbody_tr:nth-child(even)]:bg-surface-2/40",
  "[&_tbody_tr]:transition-colors",
  "[&_tbody_tr:hover]:bg-accent/5",
  "[&_tbody_tr:last-child_td:first-child]:rounded-bl-xl",
  "[&_tbody_tr:last-child_td:last-child]:rounded-br-xl",
);

function ColumnRequirementChip({ required }: { required: boolean }) {
  return required ? (
    <Chip
      size="sm"
      variant="soft"
      color="accent"
      className="h-5 px-1.5 text-[10px]"
    >
      Required
    </Chip>
  ) : (
    <Chip
      size="sm"
      variant="soft"
      className="text-muted h-5 px-1.5 text-[10px]"
    >
      Optional
    </Chip>
  );
}

function ColumnHeaderCell({ column }: { column: NexafsUploadTemplateColumn }) {
  return (
    <PlotToolbarRichHint
      title={column.label}
      description={column.tooltip}
      placement="top"
      openDelayMs={0}
      closeDelayMs={0}
    >
      <span
        tabIndex={0}
        className="focus-visible:ring-accent inline-flex max-w-[9rem] cursor-help flex-col items-start gap-0.5 rounded-sm font-mono text-xs leading-tight outline-offset-2 focus-visible:ring-2"
        aria-label={`${column.label}: ${column.required ? "required" : "optional"}. Hover for ingest mapping help.`}
      >
        <span className="text-foreground truncate">{column.label}</span>
        <ColumnRequirementChip required={column.required} />
      </span>
    </PlotToolbarRichHint>
  );
}

function UploadExampleTable() {
  const rowHeaderKey = NEXAFS_UPLOAD_TEMPLATE_COLUMNS[0]?.key ?? "energy_eV";

  return (
    <div className="border-border bg-surface/80 ring-border/60 flex min-w-0 flex-col rounded-xl border shadow-sm ring-1">
      <div className="border-border border-accent/30 flex flex-wrap items-start justify-between gap-3 border-b border-l-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-sm font-semibold tracking-tight">
            Example CSV layout
          </p>
          <p className="text-muted mt-0.5 text-xs leading-relaxed">
            Column names in the downloadable template with sample values. Hover
            a header for how each field maps at ingest.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <ColumnRequirementChip required={true} />
          <ColumnRequirementChip required={false} />
        </div>
      </div>
      <ScrollShadow
        className="scrollshadow-tags-x w-full min-w-0 p-2"
        orientation="horizontal"
        tabIndex={0}
        aria-label="Example CSV columns; scroll horizontally to see all fields"
      >
        <div className="w-max min-w-full overflow-hidden rounded-xl">
          <Table className="!w-max max-w-none !overflow-visible">
            <Table.Content
              aria-label="Example NEXAFS upload columns and sample values"
              className={EXAMPLE_TABLE_CLASSNAME}
            >
              <Table.Header>
                {NEXAFS_UPLOAD_TEMPLATE_COLUMNS.map((column) => (
                  <Table.Column
                    key={column.key}
                    id={column.key}
                    isRowHeader={column.key === rowHeaderKey}
                  >
                    <ColumnHeaderCell column={column} />
                  </Table.Column>
                ))}
              </Table.Header>
              <Table.Body items={NEXAFS_UPLOAD_TEMPLATE_EXAMPLE_ROWS}>
                {(row) => (
                  <Table.Row id={`example-row-${row.energy_eV}`}>
                    {NEXAFS_UPLOAD_TEMPLATE_COLUMNS.map((column) => {
                      const value = row[column.key];
                      const display =
                        value && value.length > 0 ? (
                          value
                        ) : (
                          <span className="text-muted">—</span>
                        );
                      return (
                        <Table.Cell
                          key={column.key}
                          className="text-foreground font-mono text-xs tabular-nums"
                        >
                          {display}
                        </Table.Cell>
                      );
                    })}
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table>
        </div>
      </ScrollShadow>
      <p className="text-muted border-border border-t px-4 py-2.5 text-xs leading-relaxed">
        Required column:{" "}
        <span className="text-foreground font-mono">energy_eV</span>. Supply at
        least one primary signal column:{" "}
        <span className="text-foreground font-mono">mu</span> (legacy raw
        trace),{" "}
        <span className="text-foreground font-mono">mass_absorption</span>,{" "}
        <span className="text-foreground font-mono">beta</span>, or{" "}
        <span className="text-foreground font-mono">od</span> (0-1). Optional
        channels include geometry, I0, additional processed channels, delta, and
        matching uncertainty columns; compact alias names (for example{" "}
        <span className="text-foreground font-mono">muerr</span>,{" "}
        <span className="text-foreground font-mono">oderr</span>) auto-match
        when present. The native primary is stored verbatim in{" "}
        <span className="text-foreground font-mono">rawabs</span>; Atlas derives
        other channels through a mass-absorption hub.
      </p>
    </div>
  );
}

/**
 * Empty-state upload portal for NEXAFS contribute: template download, column preview, and drop zone.
 */
export function NexafsUploadPortal({
  onFilesSelected,
}: NexafsUploadPortalProps) {
  return (
    <section
      aria-labelledby="nexafs-upload-portal-heading"
      className="border-border bg-surface relative mb-8 w-full min-w-0 shrink-0 rounded-2xl border shadow-sm"
    >
      <div
        className="bg-accent/15 pointer-events-none absolute -top-24 -right-16 h-48 w-48 rounded-full blur-3xl"
        aria-hidden
      />
      <div
        className="bg-accent/10 pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full blur-3xl"
        aria-hidden
      />

      <div className="border-border relative border-b px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="bg-accent/10 text-accent ring-accent/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1">
            <BeakerIcon className="h-7 w-7" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="nexafs-upload-portal-heading"
              className="text-foreground text-xl font-semibold tracking-tight"
            >
              Start with a spectrum file
            </h2>
            <p className="text-muted mt-1 max-w-2xl text-sm leading-relaxed">
              Drop one or more CSV or JSON files, or browse from your computer.
              Each file becomes a dataset tab you can map, normalize, and submit
              with sample metadata.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <a
              href={NEXAFS_UPLOAD_TEMPLATE_CSV_PUBLIC_PATH}
              download={WIKI_NEXAFS_UPLOAD_TEMPLATE_FILENAME}
              className={cn(
                buttonVariants({ variant: "primary", size: "sm" }),
                "inline-flex items-center gap-1.5",
              )}
            >
              <ArrowDownTrayIcon className="h-4 w-4" aria-hidden />
              Download CSV template
            </a>
          </div>
        </div>
      </div>

      <div className="relative flex flex-col gap-6 p-5 sm:p-6">
        <UploadExampleTable />
        <div className="flex min-w-0 flex-col gap-3">
          <FileUploadZone onFilesSelected={onFilesSelected} multiple={true} />
          <p className="text-muted text-xs leading-relaxed">
            JSON uploads are supported for multi-geometry bundles. For a
            column-by-column reference, see{" "}
            <Link
              href="/wiki/atlas/uploading-data"
              className="text-accent hover:underline"
            >
              input spectroscopy
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
