"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { MoleculeDisplay } from "@/components/molecules/molecule-display";
import { MoleculeNexafsTabs } from "./molecule-nexafs-tabs";
import { MoleculeDetailProvider } from "./molecule-detail-context";
import { ToastContainer, useToast } from "@/components/ui/toast";
import { trpc } from "~/trpc/client";
import type { MoleculeView } from "~/types/molecule";

type Molecule = MoleculeView;

/**
 * Client shell for molecule detail: breadcrumb, header card, and NEXAFS tabs.
 * Gates Edit/tag controls on `molecules.canEdit` (not mere sign-in).
 */
export function MoleculeDetailLayoutClient({
  molecule,
  moleculeId,
  children,
}: {
  molecule: Molecule;
  moleculeId: string;
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const { toasts, removeToast } = useToast();
  const isSignedIn = !!session?.user?.id;
  const canEditQuery = trpc.molecules.canEdit.useQuery(
    { moleculeId },
    { enabled: isSignedIn },
  );
  const canEditSettled = !isSignedIn || canEditQuery.isFetched;
  const canEdit =
    isSignedIn && canEditSettled && canEditQuery.data?.canEdit === true;

  return (
    <MoleculeDetailProvider
      molecule={molecule}
      moleculeId={moleculeId}
      isSignedIn={isSignedIn}
      canEdit={canEdit}
    >
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="py-8">
        <div className="mb-6">
          <nav aria-label="Breadcrumb" className="text-sm text-gray-600 dark:text-gray-400">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link
                  href="/"
                  className="hover:text-accent dark:hover:text-accent-light"
                >
                  Home
                </Link>
              </li>
              <li aria-hidden className="text-gray-400 dark:text-gray-600">
                /
              </li>
              <li>
                <Link
                  href="/browse"
                  className="hover:text-accent dark:hover:text-accent-light"
                >
                  Browse
                </Link>
              </li>
              <li aria-hidden className="text-gray-400 dark:text-gray-600">
                /
              </li>
              <li>
                <Link
                  href="/browse/molecules"
                  className="hover:text-accent dark:hover:text-accent-light"
                >
                  Molecules
                </Link>
              </li>
              <li aria-hidden className="text-gray-400 dark:text-gray-600">
                /
              </li>
              <li
                className="text-gray-900 dark:text-gray-100"
                aria-current="page"
              >
                {molecule.name}
              </li>
            </ol>
          </nav>
        </div>
        <div className="mb-8">
          <MoleculeDisplay
            molecule={molecule}
            variant="header"
            canEdit={canEdit}
            isSignedIn={isSignedIn}
          />
        </div>
        <div className="space-y-6">
          <MoleculeNexafsTabs />
          {children}
        </div>
      </div>
    </MoleculeDetailProvider>
  );
}
