import type { ReactElement, ReactNode } from "react";

/**
 * Definition list for Dev Docs flag, signature, and error tables.
 *
 * `columns` puts the label beside the detail, which suits short CLI flags.
 * `stacked` puts the label above the detail so a long Python signature keeps
 * a full line to wrap in.
 */

/**
 * Renders labeled rows as a divided definition list.
 *
 * @param props.rows - Title and detail per row, in display order.
 * @param props.layout - `columns` (default) or `stacked`.
 */
export function DocsFlagList({
  rows,
  layout = "columns",
}: {
  rows: readonly (readonly [string, ReactNode])[];
  layout?: "columns" | "stacked";
}): ReactElement {
  return (
    <dl className="border-border divide-border divide-y rounded-xl border">
      {rows.map(([name, detail]) => (
        <div
          key={name}
          className={
            layout === "stacked"
              ? "space-y-1 px-4 py-3"
              : "grid gap-1 px-4 py-3 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-4"
          }
        >
          <dt className="text-foreground font-mono text-sm wrap-break-word">
            {name}
          </dt>
          <dd className="text-muted text-sm leading-6">{detail}</dd>
        </div>
      ))}
    </dl>
  );
}
