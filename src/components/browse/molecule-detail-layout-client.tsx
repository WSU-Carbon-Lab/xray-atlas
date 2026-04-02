"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { MoleculeDisplay } from "@/components/molecules/molecule-display";
import { MoleculeNexafsTabs } from "./molecule-nexafs-tabs";
import { MoleculeDetailProvider } from "./molecule-detail-context";
import type { MoleculeView } from "~/types/molecule";

type Molecule = MoleculeView;

type SessionUserWithOrcid = { orcid?: string | null };

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
  const isSignedIn = !!session?.user;
  const hasOrcid = !!(session?.user as SessionUserWithOrcid)?.orcid;
  const canEdit = isSignedIn && hasOrcid;

  return (
    <MoleculeDetailProvider
      molecule={molecule}
      moleculeId={moleculeId}
      isSignedIn={isSignedIn}
      canEdit={canEdit}
    >
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
