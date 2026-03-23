"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";
import type { ReactNode, ComponentType, HTMLAttributes } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ContributionCard } from "./contribution-card";

type TriggerIcon = ComponentType<
  HTMLAttributes<SVGSVGElement> & { className?: string }
>;

type AddEntityModalProps = {
  title: string;
  description?: string;
  triggerLabel: string;
  triggerDescription?: string;
  triggerIcon?: TriggerIcon;
  triggerClassName?: string;
  size?: "md" | "lg" | "xl";
  fullWidth?: boolean;
  variant?: "card" | "compact";
  children: (helpers: { close: () => void }) => ReactNode;
};

const sizeToPanelClass: Record<
  NonNullable<AddEntityModalProps["size"]>,
  string
> = {
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
};

export function AddEntityModal({
  title,
  description,
  triggerLabel,
  triggerDescription,
  triggerIcon,
  triggerClassName = "",
  size = "lg",
  fullWidth = false,
  variant = "card",
  children,
}: AddEntityModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const close = () => setIsOpen(false);
  const open = () => setIsOpen(true);

  const isCompact = variant === "compact";

  return (
    <>
      <ContributionCard
        variant={isCompact ? "compact" : "default"}
        label={triggerLabel}
        description={description ?? ""}
        subDescription={triggerDescription}
        icon={triggerIcon}
        onClick={open}
        className={triggerClassName}
        fullWidth={fullWidth}
      />

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={close}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel
                  className={`border-border bg-surface relative w-full ${sizeToPanelClass[size]} transform overflow-hidden rounded-3xl border shadow-2xl transition-all`}
                >
                  <div className="border-border flex items-start justify-between border-b px-6 py-5">
                    <div>
                      <Dialog.Title className="text-foreground text-2xl font-semibold">
                        {title}
                      </Dialog.Title>
                      {description && (
                        <p className="text-muted mt-1 text-sm">
                          {description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={close}
                      className="text-muted hover:bg-default hover:text-foreground rounded-full p-2 transition-colors"
                      aria-label="Close dialog"
                    >
                      <XMarkIcon className="h-5 w-5" aria-hidden />
                    </button>
                  </div>

                  <div className="max-h-[80vh] overflow-y-auto px-6 py-6">
                    {children({ close })}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
