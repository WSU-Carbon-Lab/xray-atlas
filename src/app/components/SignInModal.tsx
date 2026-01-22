"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { Dialog, Transition } from "@headlessui/react";
import { SignIn } from "@clerk/nextjs";
import { isDevelopment } from "~/utils/isDevelopment";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const pathname = usePathname();
  const afterSignInUrl = pathname && pathname !== "/" ? pathname : "/";
  const isDev = isDevelopment();

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm dark:bg-black/50" />
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 text-left align-middle shadow-xl transition-all dark:border-gray-700 dark:bg-gray-800">
                <div className="flex justify-center">
                  <SignIn
                    appearance={{
                      elements: {
                        rootBox: "mx-auto",
                        card: "shadow-none",
                      },
                    }}
                    routing="virtual"
                    oauthFlow={isDev ? "redirect" : "popup"}
                    afterSignInUrl={afterSignInUrl}
                  />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
