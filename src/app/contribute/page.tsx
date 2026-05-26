"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { SignInButton } from "@/components/auth/sign-in-button";
import {
  AddNexafsCard,
  AddMoleculeCard,
  AddFacilityCard,
} from "@/components/contribute";
import { ContributionAgreementModal } from "@/components/contribute";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { PasskeyEnrollmentPrompt } from "@/components/auth/passkey-enrollment-prompt";
import { useContributionAgreementGate } from "~/hooks/useContributionAgreementGate";
import { usePasskeyEnrollmentGate } from "~/hooks/usePasskeyEnrollmentGate";

export default function ContributePage() {
  const router = useRouter();
  const {
    isSignedIn,
    isCheckingAgreement,
    canContribute,
    showAgreementModal,
    isAccepting,
    handleAgree,
    onModalClose,
  } = useContributionAgreementGate({
    onDecline: () => {
      router.push("/");
    },
  });
  const {
    isChecking: isCheckingPasskey,
    needsPasskeyEnrollment,
    requiresAal3Hardware,
    canAccessContributeWrites,
  } = usePasskeyEnrollmentGate();

  const { data: session } = useSession();
  const profileHref = session?.user?.id
    ? `/users/${encodeURIComponent(session.user.id)}`
    : "/sign-in";

  const canSubmitContributions =
    canContribute && canAccessContributeWrites && !needsPasskeyEnrollment;

  const handleContributionTypeSelect = (
    type: "molecule" | "facility" | "nexafs",
  ) => {
    if (!canSubmitContributions) {
      return;
    }
    if (type === "molecule") {
      router.push("/contribute/molecule");
    } else if (type === "facility") {
      router.push("/contribute/facility");
    } else if (type === "nexafs") {
      router.push("/contribute/nexafs");
    }
  };

  if (!isSignedIn) {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-20rem)] items-center justify-center px-4 py-16">
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="text-foreground mb-4 text-3xl font-bold">
            Sign In Required
          </h1>
          <p className="text-muted mb-8">
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
        onClose={onModalClose}
        onAgree={handleAgree}
        isSubmitting={isAccepting}
      />

      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 text-center">
            <h1 className="text-foreground mb-4 text-4xl font-bold">
              Contribute to X-ray Atlas
            </h1>
            <p className="text-muted text-lg">
              Help advance material research by contributing your data to our
              open database.
            </p>
          </div>

          {isCheckingAgreement || isCheckingPasskey ? (
            <p className="text-muted text-center text-sm">
              Checking account requirements...
            </p>
          ) : needsPasskeyEnrollment ? (
            <div className="mb-8">
              <PasskeyEnrollmentPrompt
                profileHref={profileHref}
                requiresAal3Hardware={requiresAal3Hardware}
              />
            </div>
          ) : (
            <>
              <div className="border-border bg-background-secondary text-foreground mb-8 rounded-xl border p-6">
                <h2 className="text-foreground mb-3 text-xl font-semibold">
                  Contribution Guidelines
                </h2>
                <ul className="text-muted space-y-2 text-sm">
                  <li className="flex items-start">
                    <CheckCircleIcon className="text-accent mt-0.5 mr-2 h-5 w-5 shrink-0" />
                    <span>
                      All contributions must be accurate and properly documented
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="text-accent mt-0.5 mr-2 h-5 w-5 shrink-0" />
                    <span>
                      Data will be made available under an open data license
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="text-accent mt-0.5 mr-2 h-5 w-5 shrink-0" />
                    <span>
                      Please verify that your data does not already exist in the
                      database
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="text-accent mt-0.5 mr-2 h-5 w-5 shrink-0" />
                    <span>
                      You must have the legal rights to contribute the data
                    </span>
                  </li>
                </ul>
              </div>

              <div
                className={
                  canSubmitContributions
                    ? "grid gap-6 md:grid-cols-2"
                    : "pointer-events-none opacity-50"
                }
                aria-hidden={!canSubmitContributions}
              >
                <AddNexafsCard
                  onClick={() => handleContributionTypeSelect("nexafs")}
                  fullWidth
                />
                <AddMoleculeCard
                  onClick={() => handleContributionTypeSelect("molecule")}
                />
                <AddFacilityCard
                  onClick={() => handleContributionTypeSelect("facility")}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
