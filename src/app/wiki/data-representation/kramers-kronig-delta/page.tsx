/**
 * Legacy wiki route; content moved to optical constant components.
 */

import { permanentRedirect } from "next/navigation";

export default function WikiKramersKronigDeltaRedirectPage(): never {
  permanentRedirect("/wiki/data-representation/optical-constants");
}
