"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { DefaultButton as Button } from "~/app/components/Button";
import { trpc } from "~/trpc/client";

interface ContributionQuestion {
  id: string;
  question: string;
  required: boolean;
}

const QUESTIONS: ContributionQuestion[] = [
  {
    id: "duplicate-check",
    question:
      "Have you verified that this data does not already exist in the database?",
    required: true,
  },
  {
    id: "legal-rights",
    question:
      "Do you have the legal rights to contribute this data for free, unadulterated use by the user community?",
    required: true,
  },
  {
    id: "open-license",
    question:
      "Do you understand that contributions will be made available under an open data license?",
    required: true,
  },
  {
    id: "data-quality",
    question:
      "Have you reviewed the data quality and accuracy of your submission?",
    required: true,
  },
  {
    id: "authorization",
    question:
      "Are you authorized to share this data on behalf of your institution/organization (if applicable)?",
    required: false,
  },
];

interface ContributionAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgree: () => void;
}

export function ContributionAgreementModal({
  isOpen,
  onClose,
  onAgree,
}: ContributionAgreementModalProps) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const utils = trpc.useUtils();
  const acceptAgreement = trpc.users.acceptContributionAgreement.useMutation({
    onSuccess: () => {
      // Invalidate the agreement status query to refetch
      void utils.users.getContributionAgreementStatus.invalidate();
      onAgree();
    },
  });

  // Reset answers when modal opens
  useEffect(() => {
    if (isOpen) {
      setAnswers({});
    }
  }, [isOpen]);

  const handleAnswer = (questionId: string, value: boolean) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const allRequiredAnswered = QUESTIONS.filter((q) => q.required).every(
    (q) => answers[q.id] === true,
  );

  const handleAgree = async () => {
    try {
      await acceptAgreement.mutateAsync();
      // onAgree will be called in onSuccess
    } catch (error) {
      console.error("Failed to accept agreement:", error);
    }
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
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 text-left align-middle shadow-xl transition-all dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-6">
                  <Dialog.Title
                    as="h3"
                    className="text-2xl font-bold leading-6 text-gray-900 dark:text-gray-100"
                  >
                    Contribution Agreement
                  </Dialog.Title>
                </div>

                <div className="mb-6">
                  <p className="text-gray-600 dark:text-gray-400">
                    Please answer the following questions before proceeding with your
                    contribution. Your agreement will be saved so you won&rsquo;t need to
                    answer these again.
                  </p>
                </div>

                <div className="mb-6 max-h-[60vh] space-y-4 overflow-y-auto pr-2">
                  {QUESTIONS.map((question) => (
                    <div
                      key={question.id}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
                    >
                      <div className="mb-3">
                        <label className="text-base font-medium text-gray-900 dark:text-gray-100">
                          {question.question}
                          {question.required && (
                            <span className="ml-2 text-red-500">*</span>
                          )}
                        </label>
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleAnswer(question.id, true)}
                          className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                            answers[question.id] === true
                              ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                          }`}
                        >
                          <CheckCircleIcon className="h-5 w-5" />
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAnswer(question.id, false)}
                          className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                            answers[question.id] === false
                              ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                          }`}
                        >
                          <XCircleIcon className="h-5 w-5" />
                          No
                        </button>
                      </div>
                      {question.required &&
                        answers[question.id] === false &&
                        answers[question.id] !== undefined && (
                          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                            This question must be answered &quot;Yes&quot; to proceed.
                          </p>
                        )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-center border-t border-gray-200 pt-6 dark:border-gray-700">
                  <Button
                    variant="solid"
                    onClick={handleAgree}
                    disabled={!allRequiredAnswered || acceptAgreement.isPending}
                    className="w-full sm:w-auto min-w-[200px]"
                  >
                    {acceptAgreement.isPending ? "Saving..." : "I Agree"}
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
