"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { cn } from "@heroui/styles";
import { BeakerIcon } from "@heroicons/react/24/outline";
import { Modal } from "@heroui/react";
import {
  REGISTRY_THUMBNAIL_SIZE,
  buildRegistryDepictionFromSmiles,
} from "../utils/registry-depiction";

export type RegistryDepictionThumbnailProps = {
  smiles: string | null;
  isDark: boolean;
  label: string;
  className?: string;
  enlargeable?: boolean;
};

/**
 * Renders a cropped registry structure thumbnail with optional click-to-enlarge.
 */
export function RegistryDepictionThumbnail({
  smiles,
  isDark,
  label,
  className,
  enlargeable = true,
}: RegistryDepictionThumbnailProps) {
  const [mounted, setMounted] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  const svgId = useId().replace(/:/g, "");

  useEffect(() => {
    setMounted(true);
  }, []);

  const trimmed = smiles?.trim() ?? "";
  const svgMarkup = useMemo(() => {
    if (!mounted || trimmed.length === 0) {
      return null;
    }
    return buildRegistryDepictionFromSmiles(trimmed, {
      width: REGISTRY_THUMBNAIL_SIZE * 2,
      height: REGISTRY_THUMBNAIL_SIZE * 2,
      isDark,
      svgId: `registry-thumb-${svgId}`,
    });
  }, [isDark, mounted, svgId, trimmed]);

  const shellClass = cn(
    "border-border bg-surface relative shrink-0 overflow-hidden rounded-lg border",
    className ?? "h-24 w-24",
  );

  if (trimmed.length === 0 || svgMarkup === null) {
    return (
      <div className={shellClass} aria-hidden>
        <div className="text-muted flex h-full w-full items-center justify-center">
          <BeakerIcon className="h-8 w-8 opacity-50" />
        </div>
      </div>
    );
  }

  const body = (
    <div
      className={cn(
        shellClass,
        enlargeable ? "cursor-zoom-in focus-visible:ring-accent focus:outline-none focus-visible:ring-2" : undefined,
      )}
      aria-label={label}
      role={enlargeable ? "button" : undefined}
      tabIndex={enlargeable ? 0 : undefined}
      onClick={enlargeable ? () => setEnlarged(true) : undefined}
      onKeyDown={
        enlargeable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setEnlarged(true);
              }
            }
          : undefined
      }
    >
      <div
        className="h-full w-full [&_svg]:block [&_svg]:h-full [&_svg]:w-full [&_svg]:max-h-full [&_svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
    </div>
  );

  if (!enlargeable) {
    return body;
  }

  return (
    <>
      {body}
      <Modal.Backdrop isOpen={enlarged} onOpenChange={setEnlarged}>
        <Modal.Container size="lg">
          <Modal.Dialog aria-label={label}>
            <Modal.Header>{label}</Modal.Header>
            <Modal.Body>
              <div className="border-border bg-surface flex min-h-64 items-center justify-center rounded-lg border p-4">
                <div
                  className="max-h-[min(420px,70vh)] w-full [&_svg]:mx-auto [&_svg]:block [&_svg]:h-auto [&_svg]:max-h-[min(420px,70vh)] [&_svg]:w-full"
                  dangerouslySetInnerHTML={{
                    __html:
                      buildRegistryDepictionFromSmiles(trimmed, {
                        width: 480,
                        height: 360,
                        isDark,
                        svgId: `registry-enlarge-${svgId}`,
                      }) ?? "",
                  }}
                />
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
