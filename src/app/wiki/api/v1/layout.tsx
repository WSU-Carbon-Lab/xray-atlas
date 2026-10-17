import type { ReactNode } from "react";
import { ApiDocChrome } from "~/components/about/api-doc-chrome";

/**
 * Shared chrome for every v1 reference page.
 *
 * `children` is the overview or one resource. The version control, resource
 * links, and try console stay above that body at the same column width.
 *
 * @returns The API docs column.
 */
export default function ApiV1Layout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return <ApiDocChrome>{children}</ApiDocChrome>;
}
