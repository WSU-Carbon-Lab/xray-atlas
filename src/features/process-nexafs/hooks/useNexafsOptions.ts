"use client";

import { useMemo } from "react";
import { trpc } from "~/trpc/client";

export function useNexafsOptions() {
  const { data: vendorsData, isLoading: isLoadingVendors } =
    trpc.vendors.list.useQuery({ limit: 100 });
  const { data: instrumentsData, isLoading: isLoadingInstruments } =
    trpc.instruments.list.useQuery({ limit: 100 });
  const { data: edgesData, isLoading: isLoadingEdges } =
    trpc.experiments.listEdges.useQuery();
  const { data: calibrationMethodsData, isLoading: isLoadingCalibrations } =
    trpc.experiments.listCalibrationMethods.useQuery();

  const instrumentOptions = useMemo(
    () =>
      instrumentsData?.instruments?.map(
        (instrument: {
          id: string;
          name: string;
          facilities?: { name: string | null } | null;
        }) => ({
          id: instrument.id,
          name: instrument.name,
          facilityName: instrument.facilities?.name ?? undefined,
        }),
      ) ?? [],
    [instrumentsData?.instruments],
  );

  const edgeOptions = useMemo(() => edgesData?.edges ?? [], [edgesData?.edges]);
  const calibrationOptions = calibrationMethodsData?.calibrationMethods ?? [];
  const vendors = useMemo(
    () =>
      (vendorsData?.vendors ?? []).map(
        (v: { id: string; name: string | null; url?: string | null }) => ({
          id: v.id,
          name: v.name,
          url: v.url ?? undefined,
        }),
      ),
    [vendorsData?.vendors],
  );

  return {
    instrumentOptions,
    edgeOptions,
    calibrationOptions,
    vendors,
    isLoadingInstruments,
    isLoadingEdges,
    isLoadingCalibrations,
    isLoadingVendors,
  };
}
