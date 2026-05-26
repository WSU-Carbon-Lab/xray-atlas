"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Breadcrumbs } from "@heroui/react";
import { ContributionAgreementModal } from "~/components/contribute";
import { MoleculeContributionForm } from "~/components/forms";
import type { MoleculeContributePageProps } from "~/components/forms";
import { useContributionAgreementGate } from "~/hooks/useContributionAgreementGate";

export type { MoleculeContributePageProps };

export default function MoleculeContributePage({
  variant = "page",
  onCompleted,
  onClose,
}: MoleculeContributePageProps = {}) {
  const router = useRouter();
  const { data: session } = useSession();
  const isSignedIn = !!session?.user;
  const isModal = variant === "modal";

  const {
    isCheckingAgreement,
    canContribute,
    showAgreementModal,
    isAccepting,
    handleAgree,
    onModalClose,
  } = useContributionAgreementGate({
    onDecline: () => {
      if (isModal) {
        onClose?.();
      } else {
        router.push("/contribute");
      }
    },
  });

  if (!isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-foreground mb-4 text-4xl font-bold">
          Contribute Molecule
        </h1>
        <p className="text-muted mb-8">
          Please sign in to contribute molecules to the X-ray Atlas database.
        </p>
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
      <div className={`${isModal ? "" : "container mx-auto"} px-4 py-8`}>
        <div className="mx-auto max-w-4xl">
          {!isModal ? (
            <div className="mb-6">
              <Breadcrumbs className="text-sm font-medium">
                <Breadcrumbs.Item href="/contribute">
                  Contributions
                </Breadcrumbs.Item>
                <Breadcrumbs.Item>Molecule</Breadcrumbs.Item>
              </Breadcrumbs>
            </div>
          ) : null}
          <h1 className="text-foreground mb-2 text-3xl font-bold sm:text-4xl">
            Contribute molecule
          </h1>
          <p className="text-muted mb-8 max-w-xl text-sm">
            Search by common name or PubChem CID to fill identifiers, then
            review and submit. Drag a molecule JSON or CSV onto the page to
            import fields.
          </p>
          {isCheckingAgreement ? (
            <p className="text-muted text-sm">
              Checking contribution agreement status...
            </p>
          ) : canContribute ? (
            <MoleculeContributionForm
              variant={variant}
              onCompleted={onCompleted}
              onClose={onClose}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
