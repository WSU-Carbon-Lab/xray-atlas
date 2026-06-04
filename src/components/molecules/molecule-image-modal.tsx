"use client";

import { createPortal } from "react-dom";
import { Atom, X } from "lucide-react";
import { MoleculeImageSVG } from "./molecule-image-svg";
import type { MoleculeImageModalProps } from "./molecule-card-types";

/**
 * Full-screen modal overlay for viewing a molecule structure depiction or gradient placeholder.
 */
export function MoleculeImageModal({
  isOpen,
  onClose,
  hasImage,
  imageUrl,
  primaryName,
  chemicalFormula: _chemicalFormula,
  previewGradient,
}: MoleculeImageModalProps) {
  if (!isOpen || typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="button"
      tabIndex={0}
      aria-label="Close"
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl border-2 border-zinc-600 bg-white shadow-2xl dark:border-zinc-500 dark:bg-black"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close"
          className="absolute top-2 right-2 z-10 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        {hasImage ? (
          <div className="flex h-[min(75vh,800px)] max-h-[85vh] w-[min(75vw,800px)] max-w-[85vw] items-center justify-center overflow-hidden bg-white p-8 dark:bg-black">
            <MoleculeImageSVG
              imageUrl={imageUrl}
              name={primaryName}
              className="h-full max-h-[65vh] w-full max-w-[65vw] [&_svg]:h-full [&_svg]:w-full [&_svg]:object-contain"
            />
          </div>
        ) : (
          <div
            className={`flex h-80 w-80 items-center justify-center rounded-xl bg-linear-to-br ${previewGradient}`}
          >
            <Atom
              className="h-40 w-40 text-white/80"
              strokeWidth={1}
              aria-hidden
            />
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
