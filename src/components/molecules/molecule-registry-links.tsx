"use client";

import Image from "next/image";
import Link from "next/link";
import { Tooltip } from "@heroui/react";
import { cn } from "@heroui/styles";
import {
  CAS_FAVICON_URL,
  PUBCHEM_FAVICON_URL,
} from "./molecule-display-constants";

export type MoleculeRegistryFaviconLinksProps = {
  casUrl: string | null;
  pubChemUrl: string | null;
  className?: string;
};

/**
 * Renders CAS Registry and PubChem favicon links; shows disabled placeholders when the corresponding URL is null.
 */
export function MoleculeRegistryFaviconLinks({
  casUrl,
  pubChemUrl,
  className,
}: MoleculeRegistryFaviconLinksProps) {
  return (
    <div
      className={cn("flex shrink-0 items-center gap-1", className)}
      role="group"
      aria-label="External registry links"
    >
      {casUrl ? (
        <Tooltip delay={0}>
          <Tooltip.Trigger>
            <Link
              href={casUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open CAS Registry"
              className="text-text-secondary focus-visible:ring-accent inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-[background-color,color] hover:bg-zinc-200 hover:text-zinc-900 focus-visible:ring-2 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={CAS_FAVICON_URL}
                alt="CAS registry icon"
                width={20}
                height={20}
                className="h-5 w-5 object-contain"
                unoptimized
              />
            </Link>
          </Tooltip.Trigger>
          <Tooltip.Content placement="top">Open in CAS Registry</Tooltip.Content>
        </Tooltip>
      ) : (
        <Tooltip delay={0}>
          <span
            className="inline-flex h-8 w-8 shrink-0 cursor-not-allowed items-center justify-center rounded-lg opacity-50"
            title="CAS not available"
          >
            <Image
              src={CAS_FAVICON_URL}
              alt="CAS registry icon unavailable"
              width={20}
              height={20}
              className="h-5 w-5 object-contain opacity-50"
              unoptimized
            />
          </span>
          <Tooltip.Content placement="top">CAS not available</Tooltip.Content>
        </Tooltip>
      )}
      {pubChemUrl ? (
        <Tooltip delay={0}>
          <Tooltip.Trigger>
            <Link
              href={pubChemUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open PubChem"
              className="text-text-secondary focus-visible:ring-accent inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-[background-color,color] hover:bg-zinc-200 hover:text-zinc-900 focus-visible:ring-2 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={PUBCHEM_FAVICON_URL}
                alt="PubChem registry icon"
                width={20}
                height={20}
                className="h-5 w-5 object-contain"
                unoptimized
              />
            </Link>
          </Tooltip.Trigger>
          <Tooltip.Content placement="top">Open in PubChem</Tooltip.Content>
        </Tooltip>
      ) : (
        <Tooltip delay={0}>
          <span
            className="inline-flex h-8 w-8 shrink-0 cursor-not-allowed items-center justify-center rounded-lg opacity-50"
            title="PubChem not available"
          >
            <Image
              src={PUBCHEM_FAVICON_URL}
              alt="PubChem registry icon unavailable"
              width={20}
              height={20}
              className="h-5 w-5 object-contain opacity-50"
              unoptimized
            />
          </span>
          <Tooltip.Content placement="top">PubChem not available</Tooltip.Content>
        </Tooltip>
      )}
    </div>
  );
}
