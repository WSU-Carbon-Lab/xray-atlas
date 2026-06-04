"use client";

import { Copy } from "lucide-react";
import { Button, Tooltip } from "@heroui/react";
import { MoleculeRegistryFaviconLinks } from "./molecule-registry-links";
import type { MoleculeCardActionsProps } from "./molecule-card-types";

/**
 * Renders InChI/SMILES copy actions and external registry favicon links for molecule cards.
 */
export function MoleculeCardActions({
  molecule,
  pubChemUrl,
  casUrl,
  copiedText,
  handleCopy,
  size = "sm",
  actionsLayout = "browse",
}: MoleculeCardActionsProps) {
  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const textClass = size === "sm" ? "text-[10px]" : "text-xs";
  const showInchiSmilesCopy =
    actionsLayout === "browse" || actionsLayout === "carousel";
  const inchiSmilesRowClass =
    actionsLayout === "carousel"
      ? "hidden min-w-0 flex-row flex-wrap items-center gap-2 @lg:flex"
      : "flex min-w-0 flex-row flex-wrap items-center gap-2";
  const registryRowClass =
    actionsLayout === "carousel"
      ? "hidden min-w-0 flex-row flex-wrap items-center gap-2 @lg:flex"
      : "flex min-w-0 flex-row flex-wrap items-center gap-2";
  if (actionsLayout === "compact") {
    return (
      <div
        className="flex min-w-0 flex-row flex-wrap items-center gap-2"
        onClick={(e) => e.stopPropagation()}
        role="group"
      >
        <MoleculeRegistryFaviconLinks casUrl={casUrl} pubChemUrl={pubChemUrl} />
      </div>
    );
  }
  return (
    <div
      className="flex w-full min-w-0 flex-row flex-wrap items-center gap-x-4 gap-y-2"
      onClick={(e) => e.stopPropagation()}
      role="group"
    >
      {showInchiSmilesCopy ? (
        <div className={inchiSmilesRowClass}>
          {molecule.InChI ? (
            <Tooltip delay={0}>
              <Button
                size={size}
                variant="secondary"
                aria-label="Copy InChI"
                onPress={() => handleCopy(molecule.InChI, "InChI")}
                className={`focus-visible:ring-accent inline-flex shrink-0 items-center gap-1.5 ${
                  copiedText === "InChI"
                    ? "text-accent dark:text-accent-light"
                    : "text-text-tertiary"
                }`}
              >
                <Copy className={iconClass} aria-hidden />
                <span className={textClass}>InChI</span>
              </Button>
              <Tooltip.Content placement="top">
                {copiedText === "InChI" ? "Copied!" : "Copy InChI"}
              </Tooltip.Content>
            </Tooltip>
          ) : null}
          {molecule.SMILES ? (
            <Tooltip delay={0}>
              <Button
                size={size}
                variant="secondary"
                aria-label="Copy SMILES"
                onPress={() => handleCopy(molecule.SMILES, "SMILES")}
                className={`focus-visible:ring-accent inline-flex shrink-0 items-center gap-1.5 ${
                  copiedText === "SMILES"
                    ? "text-accent dark:text-accent-light"
                    : "text-text-tertiary"
                }`}
              >
                <Copy className={iconClass} aria-hidden />
                <span className={textClass}>SMILES</span>
              </Button>
              <Tooltip.Content placement="top">
                {copiedText === "SMILES" ? "Copied!" : "Copy SMILES"}
              </Tooltip.Content>
            </Tooltip>
          ) : null}
        </div>
      ) : null}
      <div className={registryRowClass}>
        <MoleculeRegistryFaviconLinks casUrl={casUrl} pubChemUrl={pubChemUrl} />
      </div>
    </div>
  );
}
