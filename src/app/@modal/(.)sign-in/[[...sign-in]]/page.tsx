"use client";

import { Suspense, Fragment } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { SocialSignInButtons } from "@/components/auth/social-sign-in-buttons";

function getSafeRedirectTarget(callbackUrl: string | null): string {
  const raw = callbackUrl ?? "/";
  if (raw === "/sign-in" || raw.startsWith("/sign-in?")) return "/";
  if (raw.startsWith("//")) return "/";
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    if (typeof window === "undefined") return "/";
    try {
      const u = new URL(raw);
      return u.origin === window.location.origin
        ? u.pathname + u.search + u.hash
        : "/";
    } catch {
      return "/";
    }
  }
  return raw.startsWith("/") ? raw : "/";
}

function SignInModalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawCallback = searchParams.get("callbackUrl") ?? "/";
  const safeCallbackUrl = getSafeRedirectTarget(rawCallback);

  const handleClose = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(safeCallbackUrl);
    }
  };

  return (
    <Transition appear show={true} as={Fragment}>
      <Dialog as="div" className="relative z-modal" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-lg dark:bg-black/50" />
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
                <div className="mb-4 flex items-start justify-between">
                  <Dialog.Title
                    as="h2"
                    className="text-xl font-semibold text-text-primary"
                  >
                    Sign in to X-ray Atlas
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Close sign in modal"
                    className="cursor-pointer rounded-lg border border-red-500 bg-red-50 p-2 text-red-600 transition-[background-color,border-color,transform] duration-150 hover:bg-red-100 hover:border-red-600 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 active:scale-[0.98] dark:border-red-600 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:border-red-500"
                  >
                    <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
                <p className="mb-6 text-sm text-text-secondary">
                  ORCID is recommended for researchers. GitHub, Hugging Face, and passkeys are
                  also available as alternatives.
                </p>
                <SocialSignInButtons
                  callbackUrl={safeCallbackUrl}
                />
                <div className="mt-4 rounded-lg bg-surface-2 p-4">
                  <p className="text-xs text-text-secondary">
                    Hover the ORCID button above for details.{" "}
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
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export default function SignInModalPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-black/25 backdrop-blur-sm dark:bg-black/50">
          <div className="text-text-secondary">Loading…</div>
        </div>
      }
    >
      <SignInModalContent />
    </Suspense>
  );
}
