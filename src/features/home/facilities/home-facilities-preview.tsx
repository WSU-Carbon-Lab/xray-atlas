import type { ReactElement } from "react";

/** Tile preview: blurred beamline row with one sharp node. */
export function HomeFacilitiesPreview(): ReactElement {
  return (
    <span className="flex h-full items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="border-foreground/40 bg-foreground/5 h-7 w-12 rounded-md border-2 blur-[2px]"
        />
      ))}
      <span className="border-accent text-foreground rounded-md border px-1.5 py-0.5 text-[0.625rem] font-semibold">
        11.0.1.2
      </span>
    </span>
  );
}
