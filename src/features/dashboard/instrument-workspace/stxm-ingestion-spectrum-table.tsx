"use client";

import { useMemo } from "react";
import { ScrollShadow, Table } from "@heroui/react";
import type { StxmIngestionResult } from "~/features/dashboard/lib/computeStxmIngestion";
import type { StxmRegionSpectrumSeries } from "~/lib/stxm/stxm-region-types";

export type StxmIngestionSpectrumTableProps = {
  result: StxmIngestionResult | null;
  regionSpectra: StxmRegionSpectrumSeries[];
};

type TableRow = {
  key: string;
  energyEv: number;
  i0: string;
  sample: string;
  od: string;
  odNorm: string;
  massAbs: string;
  beta: string;
  delta: string;
  regionLabel: string;
};

function formatCell(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "";
  }
  return value.toPrecision(6);
}

/**
 * Tabular view of reduced STXM ingestion spectra (primary reduced trace plus per-region raw rows).
 */
export function StxmIngestionSpectrumTable({
  result,
  regionSpectra,
}: StxmIngestionSpectrumTableProps) {
  const rows = useMemo((): TableRow[] => {
    if (result && result.energyEv.length > 0) {
      return result.energyEv.map((energyEv, index) => ({
        key: `reduced-${energyEv}-${index}`,
        energyEv,
        i0: formatCell(result.i0[index]),
        sample: formatCell(result.iSample[index]),
        od: formatCell(result.od[index]),
        odNorm: formatCell(result.odNormalized[index]),
        massAbs: formatCell(result.massAbsorption?.[index]),
        beta: formatCell(result.beta?.[index]),
        delta: formatCell(result.delta?.[index]),
        regionLabel: "Reduced",
      }));
    }
    const primary = regionSpectra[0];
    if (!primary) {
      return [];
    }
    return primary.energyEv.map((energyEv, index) => ({
      key: `raw-${primary.regionId}-${energyEv}-${index}`,
      energyEv,
      i0: formatCell(primary.isIzero ? primary.signal[index] : null),
      sample: formatCell(!primary.isIzero ? primary.signal[index] : null),
      od: formatCell(primary.od?.[index]),
      odNorm: formatCell(primary.odNormalized?.[index]),
      massAbs: formatCell(primary.massAbsorption?.[index]),
      beta: formatCell(primary.beta?.[index]),
      delta: formatCell(primary.delta?.[index]),
      regionLabel: primary.spotLabel,
    }));
  }, [regionSpectra, result]);

  if (rows.length === 0) {
    return (
      <div className="border-border bg-default/20 text-muted flex min-h-[280px] items-center justify-center rounded-xl border p-6 text-sm">
        No spectrum rows to display. Configure regions and run reduction.
      </div>
    );
  }

  return (
    <div className="border-border flex min-h-[280px] min-w-0 flex-col rounded-xl border p-4">
      <ScrollShadow className="min-h-0 flex-1" hideScrollBar={false}>
        <Table aria-label="STXM ingestion spectrum table">
          <Table.Header>
            <Table.Column isRowHeader>Energy (eV)</Table.Column>
            <Table.Column>Region</Table.Column>
            <Table.Column>I0</Table.Column>
            <Table.Column>Sample</Table.Column>
            <Table.Column>OD</Table.Column>
            <Table.Column>Norm OD</Table.Column>
            <Table.Column>Mass abs</Table.Column>
            <Table.Column>Beta</Table.Column>
            <Table.Column>Delta</Table.Column>
          </Table.Header>
          <Table.Body items={rows}>
            {(row) => (
              <Table.Row key={row.key}>
                <Table.Cell>{row.energyEv.toFixed(3)}</Table.Cell>
                <Table.Cell>{row.regionLabel}</Table.Cell>
                <Table.Cell>{row.i0}</Table.Cell>
                <Table.Cell>{row.sample}</Table.Cell>
                <Table.Cell>{row.od}</Table.Cell>
                <Table.Cell>{row.odNorm}</Table.Cell>
                <Table.Cell>{row.massAbs}</Table.Cell>
                <Table.Cell>{row.beta}</Table.Cell>
                <Table.Cell>{row.delta}</Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </ScrollShadow>
    </div>
  );
}
