import type { ReactElement } from "react";

/**
 * Renders a client guide that has no published client yet.
 *
 * @param props.title - Page heading.
 * @param props.summary - What the client will cover when it exists.
 */
export function ClientDocsSoon(props: {
  title: string;
  summary: string;
}): ReactElement {
  return (
    <article className="w-full min-w-0 space-y-4">
      <h1 className="text-foreground text-4xl font-bold">{props.title}</h1>
      <h2 id="status" className="text-foreground mb-2 text-xl font-semibold">
        Status
      </h2>
      <p className="text-muted">
        Coming soon. {props.summary} The repository slot exists under the
        extensions bridge. There is no installable client yet.
      </p>
    </article>
  );
}
