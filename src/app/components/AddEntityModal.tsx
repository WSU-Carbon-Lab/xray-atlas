"use client";

import { Dialog, Transition } from "@headlessui/react";
import {
  ReactNode,
  Fragment,
  useState,
  ComponentType,
  HTMLAttributes,
} from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

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

const sizeToPanelClass: Record<NonNullable<AddEntityModalProps["size"]>, string> =
  {
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-5xl",
  };

export function AddEntityModal({
  title,
  description,
  triggerLabel,
  triggerDescription,
  triggerIcon: Icon,
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
  const triggerBaseClasses = isCompact
    ? "group inline-flex items-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-3 text-left transition hover:border-wsu-crimson hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-500"
    : "group relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-white px-6 py-6 text-left transition-transform duration-200 hover:-translate-y-0.5 hover:border-wsu-crimson hover:shadow-lg dark:border-gray-700 dark:bg-gray-800";

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={`${triggerBaseClasses} ${fullWidth ? "" : "md:w-auto"} ${triggerClassName}`}
      >
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-wsu-crimson">
            {triggerLabel}
          </span>
          {description && (
            <span className="text-base text-gray-700 transition-colors duration-200 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-gray-100">
              {description}
            </span>
          )}
          {triggerDescription && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {triggerDescription}
            </span>
          )}
        </div>
        {Icon && !isCompact && (
          <div className="hidden shrink-0 text-gray-300 transition-colors duration-200 group-hover:text-wsu-crimson md:block">
            <Icon className="h-16 w-16" aria-hidden="true" />
          </div>
        )}
        {Icon && isCompact && (
          <div className="shrink-0 text-gray-300 transition-colors duration-200 group-hover:text-wsu-crimson">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>
        )}
      </button>

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
                  className={`relative w-full ${sizeToPanelClass[size]} transform overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl transition-all dark:border-gray-700 dark:bg-gray-900`}
                >
                  <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">
                    <div>
                      <Dialog.Title className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        {title}
                      </Dialog.Title>
                      {description && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={close}
                      className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    >
                      <XMarkIcon className="h-5 w-5" />
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
