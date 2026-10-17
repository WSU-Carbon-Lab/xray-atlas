import type { ReactElement } from "react";

/** Tile preview: blurred beamline row with one sharp node. */
export function HomeFacilitiesPreview(): ReactElement {
  return (
    <span className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="border-border h-6 w-10 rounded-md border opacity-50 blur-[2px]"
        />
      ))}
      <span className="border-accent text-foreground rounded-md border px-1.5 py-0.5 text-[0.625rem] font-semibold">
        11.0.1.2
      </span>
    </span>
  );
}
