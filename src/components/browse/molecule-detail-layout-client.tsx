"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { MoleculeDisplay } from "@/components/molecules/molecule-display";
import { BrowseHeader } from "./browse-header";
import { MoleculeNexafsTabs } from "./molecule-nexafs-tabs";
import {
  MoleculeDetailProvider,
  useMoleculeDetail,
} from "./molecule-detail-context";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import { Label } from "@heroui/react";
import {
  ArrowsUpDownIcon,
  HeartIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import type { MoleculeView } from "~/types/molecule";

type Molecule = MoleculeView;

type SessionUserWithOrcid = { orcid?: string | null };

function MoleculeDetailScaffold({ children }: { children: React.ReactNode }) {
  const { query, setQuery, setSortBy } = useMoleculeDetail();

  return (
    <div className="space-y-6">
      <MoleculeNexafsTabs />
      <BrowseHeader
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search NEXAFS spectra…"
      >
        <Dropdown>
          <DropdownTrigger>
            <button
              type="button"
              className="focus-visible:ring-accent flex h-12 min-h-12 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              aria-label="Sort NEXAFS spectra"
            >
              <ArrowsUpDownIcon className="h-5 w-5 shrink-0 stroke-[1.5]" />
              <span className="text-sm font-medium">Sort</span>
            </button>
          </DropdownTrigger>
          <DropdownMenu
            aria-label="Sort NEXAFS spectra"
            className="rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <DropdownItem
              key="name"
              textValue="Name"
              onPress={() => setSortBy("name")}
            >
              <span className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold">A</span>
                <Label>Name (A-Z)</Label>
              </span>
            </DropdownItem>
            <DropdownItem
              key="favorites"
              textValue="Favorites"
              onPress={() => setSortBy("favorites")}
            >
              <span className="flex items-center gap-2">
                <HeartIcon className="h-4 w-4 shrink-0" />
                <Label>Most Favorited</Label>
              </span>
            </DropdownItem>
            <DropdownItem
              key="views"
              textValue="Views"
              onPress={() => setSortBy("views")}
            >
              <span className="flex items-center gap-2">
                <EyeIcon className="h-4 w-4 shrink-0" />
                <Label>Most Viewed</Label>
              </span>
            </DropdownItem>
            <DropdownItem
              key="created"
              textValue="Newest"
              onPress={() => setSortBy("created")}
            >
              <span className="flex items-center gap-2">
                <span className="text-xs">New</span>
                <Label>Newest First</Label>
              </span>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </BrowseHeader>
      {children}
    </div>
  );
}

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
          <Link
            href="/"
            className="hover:text-accent dark:hover:text-accent-light text-sm text-gray-600 dark:text-gray-400"
          >
            Back to Home
          </Link>
        </div>
        <div className="mb-8">
          <MoleculeDisplay
            molecule={molecule}
            variant="header"
            canEdit={canEdit}
            isSignedIn={isSignedIn}
          />
        </div>
        <MoleculeDetailScaffold>{children}</MoleculeDetailScaffold>
      </div>
    </MoleculeDetailProvider>
  );
}
