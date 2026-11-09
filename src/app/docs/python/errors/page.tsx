import type { Metadata } from "next";
import type { ReactElement } from "react";
import { DocsFlagList } from "~/components/docs/docs-flag-list";

const errorRows = [
  ["AtlasError", "Base class for every client error."],
  ["ApiError", "HTTP failure; subclass per status."],
  ["AuthError", "Authentication or credential problem."],
  ["ConflictError", "Version conflict or unavailable pin."],
  ["ForbiddenError", "Authenticated but not allowed."],
  ["NotFoundError", "Resource not found."],
  ["ValidationError", "Bad input."],
  ["NetworkError", "Network failure after retries."],
] as const;

export const metadata: Metadata = { title: "Python: Errors", alternates: { canonical: "/docs/python/errors" } };

export default function Page(): ReactElement {
  return (
    <article className="w-full min-w-0 space-y-8">
      <h1 className="font-display text-foreground text-3xl font-semibold">Errors</h1>
      <p className="text-muted max-w-2xl leading-7">
        Every client error derives from <code className="text-foreground">AtlasError</code>. HTTP failures derive from <code className="text-foreground">ApiError</code>, with a subclass for each status a caller can act on. Network failures after retries raise <code className="text-foreground">NetworkError</code>. Catch the specific class you can act on and let the rest propagate.
      </p>
      <DocsFlagList rows={errorRows} />
    </article>
  );
}
