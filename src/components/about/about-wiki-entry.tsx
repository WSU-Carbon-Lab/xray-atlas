import type { ReactElement } from "react";
import { BookOpenIcon } from "@heroicons/react/24/outline";
import { AccentNavChip } from "~/components/ui/accent-nav-chip";

/**
 * Minimal About-page wiki entry as a single accent nav chip to `/wiki`.
 */
export function AboutWikiEntry(): ReactElement {
  return (
    <div className="flex justify-start">
      <AccentNavChip
        href="/wiki"
        icon={BookOpenIcon}
        label="Take me to the wiki"
      />
    </div>
  );
}
