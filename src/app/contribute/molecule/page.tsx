"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Breadcrumbs } from "@heroui/react";
import { BeakerIcon } from "@heroicons/react/24/outline";
import { site } from "~/app/brand";
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
          Molecule registry
        </h1>
        <p className="text-muted mb-8">
          Sign in to link molecules into the {site.name} catalog.
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
                <Breadcrumbs.Item>Molecule registry</Breadcrumbs.Item>
              </Breadcrumbs>
            </div>
          ) : null}
          <div className="mb-8 flex items-start gap-4">
            <span
              className="text-accent bg-accent/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              aria-hidden
            >
              <BeakerIcon className="h-6 w-6 stroke-[1.75]" />
            </span>
            <div>
              <h1 className="text-foreground mb-3 text-3xl font-bold sm:text-4xl">
                Link molecule to Atlas
              </h1>
              <p className="text-muted max-w-2xl text-lg">
                Register or update compound metadata in the {site.name} catalog:
                identifiers, synonyms, optional tags, and an SVG depiction. For
                NEXAFS spectra and experiment files, use{" "}
                <Link
                  href="/contribute/nexafs"
                  className="text-accent hover:underline"
                >
                  Contribute NEXAFS
                </Link>
                .
              </p>
            </div>
          </div>
          {isCheckingAgreement ? (
            <p className="text-muted text-sm">
              Checking contribution agreement status…
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
