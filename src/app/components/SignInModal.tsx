"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { Dialog, Transition } from "@headlessui/react";
import { signIn } from "next-auth/react";
import { GitHubIcon } from "./icons";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const pathname = usePathname();
  const callbackUrl = pathname && pathname !== "/" ? pathname : "/";

  const handleGitHubSignIn = () => {
    void signIn("github", { callbackUrl });
    onClose();
  };

  const handleORCIDSignIn = () => {
    void signIn("orcid", { callbackUrl });
    onClose();
  };

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
                <div className="flex flex-col items-center justify-center space-y-4">
                  <h2 className="text-xl font-semibold">Sign in to X-ray Atlas</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Choose your preferred sign-in method
                  </p>
                  <div className="w-full space-y-3">
                    <button
                      onClick={handleGitHubSignIn}
                      className="flex w-full items-center justify-center gap-3 rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 transition-colors dark:bg-gray-700 dark:hover:bg-gray-600"
                    >
                      <GitHubIcon className="h-5 w-5" />
                      Sign in with GitHub
                    </button>
                    <button
                      onClick={handleORCIDSignIn}
                      className="flex w-full items-center justify-center gap-3 rounded-lg bg-accent px-4 py-2 text-white hover:bg-accent-dark transition-colors"
                    >
                      <span className="text-sm font-semibold">ORCID</span>
                      Sign in with ORCID
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
