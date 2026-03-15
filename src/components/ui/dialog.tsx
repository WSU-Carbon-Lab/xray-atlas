"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import type { ReactNode } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

type SimpleDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string; // Optional max-width class (e.g., "max-w-4xl", "max-w-6xl")
};

export function SimpleDialog({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-md",
}: SimpleDialogProps) {
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

        <div className="fixed inset-0 overflow-y-auto">
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
                className={`w-full ${maxWidth} transform overflow-hidden rounded-2xl bg-surface border border-border p-6 text-left align-middle text-foreground shadow-xl transition-all`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-foreground"
                  >
                    {title}
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-1 text-muted hover:bg-default hover:text-foreground"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                {children}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
