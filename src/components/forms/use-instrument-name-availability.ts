"use client";

import { trpc } from "~/trpc/client";

export type InstrumentNameAvailabilityMode = "new-row" | "edit";

export function useInstrumentNameAvailability(options: {
  facilityId: string | undefined;
  name: string;
  mode: InstrumentNameAvailabilityMode;
  excludeInstrumentId?: string;
}) {
  const isEdit = options.mode === "edit";
  const nameForApi = isEdit ? options.name.trim() : options.name;
  const enabled =
    !!options.facilityId &&
    (isEdit ? options.name.trim().length > 0 : options.name.length > 0);

  return trpc.instruments.checkExists.useQuery(
    {
      facilityId: options.facilityId ?? "",
      name: nameForApi,
      ...(isEdit && options.excludeInstrumentId
        ? { excludeInstrumentId: options.excludeInstrumentId }
        : {}),
    },
    { enabled },
  );
}
