"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Button } from "@heroui/react";
import { SocialSignInButtons } from "./SocialSignInButtons";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  callbackUrl: string;
}

export function SignInModal({
  isOpen,
  onClose,
  callbackUrl,
}: SignInModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-modal" onClose={onClose}>
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

        <div className="fixed inset-0 overflow-y-auto overscroll-contain">
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-border-default bg-surface-1 p-6 text-left align-middle shadow-xl transition-[opacity,transform] duration-200">
                <Dialog.Title
                  as="h2"
                  className="mb-1 text-xl font-semibold text-text-primary"
                >
                  Sign in to X-ray Atlas
                </Dialog.Title>
                <p className="mb-6 text-sm text-text-secondary">
                  ORCID is recommended for researchers. GitHub and passkeys are
                  also available as alternatives.
                </p>
                <SocialSignInButtons
                  callbackUrl={callbackUrl}
                  onSignIn={onClose}
                />
                <div className="mt-4 rounded-lg bg-surface-2 p-4">
                  <p className="text-xs text-text-secondary">
                    <a
                      href="https://orcid.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:text-accent-dark underline"
                    >
                      Learn more at orcid.org
                    </a>
                  </p>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" onPress={onClose}>
                    Cancel
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
