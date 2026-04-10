"use client";

import { Dialog, Transition } from "@headlessui/react";
import {
  Fragment,
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import type { ReactNode } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

const DialogRacOverlayHostContext = createContext<
  HTMLDivElement | null | undefined
>(undefined);

/**
 * Overlay portal target for React Aria / HeroUI popovers inside {@link SimpleDialog}.
 *
 * - `undefined`: not wrapped by {@link SimpleDialog} (use library default portal, usually `document.body`).
 * - `null`: dialog is open but the host element is not attached yet.
 * - `HTMLDivElement`: mount overlays here so Headless UI focus / inert rules still apply.
 */
export function useDialogRacOverlayHost(): HTMLDivElement | null | undefined {
  return useContext(DialogRacOverlayHostContext);
}

type SimpleDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string; // Optional max-width class (e.g., "max-w-4xl", "max-w-6xl")
};

/**
 * Headless UI modal with a single scroll container inside the panel so focus moves
 * (for example checkbox toggles) do not scroll an outer `overflow-y-auto` wrapper and
 * re-center the dialog. Avoid nesting another `overflow-y-auto` in `children`.
 */
export function SimpleDialog({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-md",
}: SimpleDialogProps) {
  const [racOverlayHost, setRacOverlayHost] = useState<HTMLDivElement | null>(
    null,
  );

  const onRacOverlayHostRef = useCallback((node: HTMLDivElement | null) => {
    setRacOverlayHost(node);
  }, []);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-[var(--z-modal)]"
        onClose={onClose}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden overscroll-contain">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={`relative flex max-h-[min(90vh,48rem)] min-h-0 w-full ${maxWidth} transform flex-col overflow-visible rounded-2xl border border-border bg-surface p-6 text-left align-middle text-foreground shadow-xl transition-all`}
              >
                <div
                  ref={onRacOverlayHostRef}
                  data-slot="dialog-rac-overlay-host"
                  className="pointer-events-none absolute inset-0 z-[var(--z-popover)] min-h-0"
                />
                <div className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col">
                  <div className="mb-4 flex shrink-0 items-center justify-between">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-foreground"
                    >
                      {title}
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Close dialog"
                      className="rounded-lg p-1 text-muted hover:bg-default hover:text-foreground"
                    >
                      <XMarkIcon className="h-5 w-5" aria-hidden />
                    </button>
                  </div>
                  <DialogRacOverlayHostContext.Provider value={racOverlayHost}>
                    <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable]">
                      {children}
                    </div>
                  </DialogRacOverlayHostContext.Provider>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
