"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { SignInButton } from "~/app/components/SignInButton";
import { ContributionAgreementModal } from "~/app/components/ContributionAgreementModal";
import {
  CheckCircleIcon,
  BeakerIcon,
  BuildingOfficeIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import { trpc } from "~/trpc/client";

export default function ContributePage() {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const [showAgreementModal, setShowAgreementModal] = useState(false);

  // Check if user has already agreed to the contribution agreement
  const { data: agreementStatus, isLoading: isLoadingAgreement } =
    trpc.users.getContributionAgreementStatus.useQuery(undefined, {
      enabled: isSignedIn ?? false,
    });

  // Show modal automatically when page loads if user hasn't agreed yet
  useEffect(() => {
    if (isSignedIn && !isLoadingAgreement && !agreementStatus?.accepted) {
      setShowAgreementModal(true);
    }
  }, [isSignedIn, isLoadingAgreement, agreementStatus?.accepted]);

  const handleContributionTypeSelect = (
    type: "molecule" | "facility" | "nexafs",
  ) => {
    // User can only select if they've already agreed
    if (agreementStatus?.accepted) {
      if (type === "molecule") {
        router.push("/contribute/molecule");
      } else if (type === "facility") {
        router.push("/contribute/facility");
      } else if (type === "nexafs") {
        router.push("/contribute/nexafs");
      }
    }
  };

  const handleAgreementAccepted = () => {
    setShowAgreementModal(false);
    // Modal will close and user can now select contribution type
  };

  if (!isSignedIn) {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-20rem)] items-center justify-center px-4 py-16">
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100">
            Sign In Required
          </h1>
          <p className="mb-8 text-gray-600 dark:text-gray-400">
            You must be signed in to contribute data to the X-ray Atlas.
          </p>
          <div className="flex justify-center">
            <SignInButton variant="solid">Sign In</SignInButton>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingAgreement) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-7xl text-center">
          <div className="border-t-wsu-crimson mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ContributionAgreementModal
        isOpen={showAgreementModal}
        onClose={() => {
          // Don't allow closing without agreeing - user must agree to continue
          // Modal will only close after agreement is accepted
        }}
        onAgree={handleAgreementAccepted}
      />

      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 text-center">
            <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-gray-100">
              Contribute to X-ray Atlas
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Help advance material research by contributing your data to our
              open database.
            </p>
            {agreementStatus?.accepted && (
              <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                ✓ You have agreed to the contribution terms
              </p>
            )}
            {!agreementStatus?.accepted && !isLoadingAgreement && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Please review and accept the contribution agreement to continue.
              </p>
            )}
          </div>

          <div className="mb-8 rounded-xl border border-gray-200 bg-blue-50 p-6 dark:border-gray-700 dark:bg-blue-900/20">
            <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-100">
              Contribution Guidelines
            </h2>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start">
                <CheckCircleIcon className="mt-0.5 mr-2 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                <span>
                  All contributions must be accurate and properly documented
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircleIcon className="mt-0.5 mr-2 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                <span>
                  Data will be made available under an open data license
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircleIcon className="mt-0.5 mr-2 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                <span>
                  Please verify that your data does not already exist in the
                  database
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircleIcon className="mt-0.5 mr-2 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                <span>
                  You must have the legal rights to contribute the data
                </span>
              </li>
            </ul>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <button
              onClick={() => handleContributionTypeSelect("nexafs")}
              disabled={!agreementStatus?.accepted}
              className={`group rounded-xl border-2 p-8 text-left transition-all md:col-span-2 ${
                agreementStatus?.accepted
                  ? "hover:border-wsu-crimson border-gray-200 bg-white hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
                  : "cursor-not-allowed border-gray-200 bg-gray-100 opacity-50 dark:border-gray-700 dark:bg-gray-900"
              }`}
            >
              <BoltIcon className="text-wsu-crimson mb-4 h-12 w-12" />
              <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                Upload NEXAFS Experiment
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Contribute Near-Edge X-ray Absorption Fine Structure data with
                geometry and spectral datasets.
              </p>
            </button>

            <button
              onClick={() => handleContributionTypeSelect("molecule")}
              disabled={!agreementStatus?.accepted}
              className={`group rounded-xl border-2 p-8 text-left transition-all ${
                agreementStatus?.accepted
                  ? "hover:border-wsu-crimson border-gray-200 bg-white hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
                  : "cursor-not-allowed border-gray-200 bg-gray-100 opacity-50 dark:border-gray-700 dark:bg-gray-900"
              }`}
            >
              <BeakerIcon className="text-wsu-crimson mb-4 h-12 w-12" />
              <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                Contribute Molecule
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Add a new molecule with its chemical properties, structure, and
                related data.
              </p>
            </button>

            <button
              onClick={() => handleContributionTypeSelect("facility")}
              disabled={!agreementStatus?.accepted}
              className={`group rounded-xl border-2 p-8 text-left transition-all ${
                agreementStatus?.accepted
                  ? "hover:border-wsu-crimson border-gray-200 bg-white hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
                  : "cursor-not-allowed border-gray-200 bg-gray-100 opacity-50 dark:border-gray-700 dark:bg-gray-900"
              }`}
            >
              <BuildingOfficeIcon className="text-wsu-crimson mb-4 h-12 w-12" />
              <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                Link Facility and Instrument
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Add a missing facility and its instruments to the database.
              </p>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
