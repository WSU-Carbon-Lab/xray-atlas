"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { DefaultButton as Button } from "~/components/ui/button";

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

  const handleAccept = () => {
    onAgree();
  };

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

  const handleAgree = () => {
    handleAccept();
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
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
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
              <Dialog.Panel className="border-border bg-surface w-full max-w-3xl transform overflow-hidden rounded-2xl border p-6 text-left align-middle shadow-xl transition-all">
                <div className="mb-6">
                  <Dialog.Title
                    as="h3"
                    className="text-foreground text-2xl font-bold leading-6"
                  >
                    Contribution Agreement
                  </Dialog.Title>
                </div>

                <div className="mb-6">
                  <p className="text-muted">
                    Please answer the following questions before proceeding with
                    your contribution. Your agreement will be saved so you
                    won&rsquo;t need to answer these again.
                  </p>
                </div>

                <div className="mb-6 max-h-[60vh] space-y-4 overflow-y-auto pr-2">
                  {QUESTIONS.map((question) => (
                    <div
                      key={question.id}
                      className="border-border bg-default rounded-lg border p-4"
                    >
                      <div className="mb-3">
                        <label className="text-foreground text-base font-medium">
                          {question.question}
                          {question.required && (
                            <span className="text-danger ml-2">*</span>
                          )}
                        </label>
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleAnswer(question.id, true)}
                          className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                            answers[question.id] === true
                              ? "border-success bg-success/10 text-success-foreground"
                              : "border-border bg-surface text-foreground hover:bg-default"
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
                              ? "border-danger bg-danger/10 text-danger-foreground"
                              : "border-border bg-surface text-foreground hover:bg-default"
                          }`}
                        >
                          <XCircleIcon className="h-5 w-5" />
                          No
                        </button>
                      </div>
                      {question.required &&
                        answers[question.id] === false &&
                        answers[question.id] !== undefined && (
                          <p className="text-danger mt-2 text-sm">
                            This question must be answered &quot;Yes&quot; to
                            proceed.
                          </p>
                        )}
                    </div>
                  ))}
                </div>

                <div className="border-border flex items-center justify-center border-t pt-6">
                  <Button
                    variant="primary"
                    onClick={handleAgree}
                    isDisabled={!allRequiredAnswered}
                    className="w-full min-w-[200px] sm:w-auto"
                  >
                    I Agree
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
