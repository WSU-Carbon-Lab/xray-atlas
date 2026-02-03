"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { SignInButton } from "@/components/auth/sign-in-button";
import { ContributionAgreementModal } from "~/app/components/ContributionAgreementModal";
import {
  CheckCircleIcon,
  BeakerIcon,
  BuildingOfficeIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, HTMLAttributes } from "react";

type ContributionCardIcon = ComponentType<
  HTMLAttributes<SVGSVGElement> & { className?: string }
>;

type ContributionCardProps = {
  label: string;
  description: string;
  icon: ContributionCardIcon;
  onClick: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
};

function ContributionCard({
  label,
  description,
  icon: Icon,
  onClick,
  disabled = false,
  fullWidth = false,
}: ContributionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-2xl border-2 border-dashed bg-white px-6 py-6 text-left transition-transform duration-200 dark:bg-gray-800 ${
        disabled
          ? "cursor-not-allowed border-gray-200 bg-gray-100 opacity-50 dark:border-gray-700 dark:bg-gray-900"
          : "hover:border-accent border-gray-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-700"
      } ${fullWidth ? "md:col-span-2" : ""}`}
    >
      <div className="flex flex-col gap-2">
        <span className="text-accent dark:text-accent-light text-sm font-semibold tracking-wide uppercase">
          {label}
        </span>
        <span className="text-base text-gray-700 transition-colors duration-200 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-gray-100">
          {description}
        </span>
      </div>
      <div className="group-hover:text-accent dark:text-accent-light hidden shrink-0 text-gray-300 transition-colors duration-200 md:block">
        <Icon className="h-16 w-16" aria-hidden="true" />
      </div>
    </button>
  );
}

export default function ContributePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isSignedIn = !!session?.user;
  const [showAgreementModal, setShowAgreementModal] = useState(false);

  const handleContributionTypeSelect = (
    type: "molecule" | "facility" | "nexafs",
  ) => {
    if (type === "molecule") {
      router.push("/contribute/molecule");
    } else if (type === "facility") {
      router.push("/contribute/facility");
    } else if (type === "nexafs") {
      router.push("/contribute/nexafs");
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
            <SignInButton variant="primary">Sign In</SignInButton>
          </div>
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
            <ContributionCard
              label="Upload NEXAFS Experiment"
              description="Contribute Near-Edge X-ray Absorption Fine Structure data with geometry and spectral datasets."
              icon={BoltIcon}
              onClick={() => handleContributionTypeSelect("nexafs")}
              fullWidth
            />
            <ContributionCard
              label="Contribute Molecule"
              description="Add a new molecule with its chemical properties, structure, and related data."
              icon={BeakerIcon}
              onClick={() => handleContributionTypeSelect("molecule")}
            />
            <ContributionCard
              label="Link Facility and Instrument"
              description="Add a missing facility and its instruments to the database."
              icon={BuildingOfficeIcon}
              onClick={() => handleContributionTypeSelect("facility")}
            />
          </div>
        </div>
      </div>
    </>
  );
}
