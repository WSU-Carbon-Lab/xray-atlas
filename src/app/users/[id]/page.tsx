"use client";

import { use, useState } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "~/trpc/client";
import { PageSkeleton } from "~/app/components/LoadingState";
import { NotFoundState, ErrorState } from "~/app/components/ErrorState";
import { MoleculeDisplay } from "~/app/components/MoleculeDisplay";
import { ORCIDIcon } from "~/app/components/icons";
import Link from "next/link";
import Image from "next/image";
import { Button, Input, Label, Tooltip } from "@heroui/react";

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: userId } = use(params);
  const { data: session, status } = useSession();
  const {
    data: user,
    isLoading,
    isError,
    error,
  } = trpc.users.getById.useQuery(
    { id: userId },
    {
      retry: false,
    },
  );
  const updateORCID = trpc.users.updateORCID.useMutation();
  const removeORCID = trpc.users.removeORCID.useMutation();
  const utils = trpc.useUtils();

  const [orcidInput, setOrcidInput] = useState("");
  const [isEditingOrcid, setIsEditingOrcid] = useState(false);
  const [orcidError, setOrcidError] = useState<string | null>(null);

  const isOwnProfile =
    !!session?.user?.id && !!user && session.user.id === user.id;

  const handleSaveORCID = async () => {
    setOrcidError(null);
    try {
      await updateORCID.mutateAsync({ orcid: orcidInput });
      await utils.users.getById.invalidate({ id: userId });
      setIsEditingOrcid(false);
      setOrcidInput("");
    } catch (err) {
      setOrcidError(
        err instanceof Error
          ? err.message
          : "Failed to update ORCID. Please check the format and try again.",
      );
    }
  };

  const handleRemoveORCID = async () => {
    setOrcidError(null);
    try {
      await removeORCID.mutateAsync();
      await utils.users.getById.invalidate({ id: userId });
      setIsEditingOrcid(false);
      setOrcidInput("");
    } catch (err) {
      setOrcidError(
        err instanceof Error
          ? err.message
          : "Failed to remove ORCID. Please try again.",
      );
    }
  };

  const handleCancelOrcid = () => {
    setIsEditingOrcid(false);
    setOrcidInput("");
    setOrcidError(null);
  };

  if (isLoading || status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageSkeleton />
      </div>
    );
  }

  if (isError) {
    if (
      error?.data?.code === "NOT_FOUND" ||
      error?.message === "User not found"
    ) {
      return (
        <div className="container mx-auto px-4 py-8">
          <NotFoundState
            title="User Not Found"
            message="The user you're looking for doesn't exist."
          />
        </div>
      );
    }
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState
          title="Failed to load user"
          message={
            error?.message || "An error occurred while loading the user."
          }
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <NotFoundState />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-text-secondary transition-colors hover:text-accent"
        >
          Back to Home
        </Link>
      </div>

      <div className="rounded-xl border border-border-default bg-surface-1 p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {user.image ? (
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full">
              <Image
                src={user.image}
                alt={user.name ?? "User"}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-accent text-2xl font-bold text-white">
              {user.name?.charAt(0).toUpperCase() ?? "U"}
            </div>
          )}

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="mb-2 text-3xl font-bold text-text-primary">
              {user.name}
            </h1>
            {user.email && (
              <p className="mb-2 text-text-secondary">{user.email}</p>
            )}
            {user.orcid && !isEditingOrcid && (
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <a
                  href={`https://orcid.org/${user.orcid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-accent"
                  aria-label={`View ORCID record - ${user.orcid}`}
                >
                  <ORCIDIcon className="h-5 w-5 shrink-0" authenticated />
                  <span className="tabular-nums">{user.orcid}</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {isOwnProfile && (
          <div className="mt-8 border-t border-border-default pt-8">
            <h2 className="mb-1 text-xl font-semibold text-text-primary">
              ORCID iD
            </h2>
            <p className="mb-4 text-sm text-text-secondary">
              Link your ORCID iD to your account for better research
              attribution.
            </p>

            {user.orcid && !isEditingOrcid ? (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border-default bg-surface-2 p-4">
                <div className="flex items-center gap-3">
                  <ORCIDIcon className="h-6 w-6 shrink-0" authenticated />
                  <div>
                    <a
                      href={`https://orcid.org/${user.orcid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-accent transition-colors hover:text-accent-dark"
                      aria-label={`View ORCID record - ${user.orcid}`}
                    >
                      <span className="tabular-nums">{user.orcid}</span>
                    </a>
                    <p className="text-xs text-text-tertiary">
                      Authenticated ORCID iD
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onPress={() => {
                      setIsEditingOrcid(true);
                      setOrcidInput(user.orcid ?? "");
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onPress={handleRemoveORCID}
                    isPending={removeORCID.isPending}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Tooltip delay={0}>
                  <Tooltip.Trigger>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="profile-orcid">
                        ORCID iD{" "}
                        <span className="text-error" aria-hidden>
                          *
                        </span>
                      </Label>
                      <Input
                        id="profile-orcid"
                        aria-label="ORCID iD"
                        placeholder="0000-0000-0000-0000"
                        value={orcidInput}
                        onChange={(e) => {
                          setOrcidInput(e.target.value);
                          setOrcidError(null);
                        }}
                        className="tabular-nums"
                        variant="secondary"
                        fullWidth
                        aria-invalid={!!orcidError}
                        aria-errormessage={
                          orcidError ? "profile-orcid-error" : undefined
                        }
                      />
                      <p className="text-tiny text-text-tertiary">
                        Your ORCID iD helps connect your research contributions.
                      </p>
                      {orcidError && (
                        <p
                          id="profile-orcid-error"
                          className="text-sm text-error"
                          role="alert"
                        >
                          {orcidError}
                        </p>
                      )}
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p>
                      Enter your ORCID iD in the format XXXX-XXXX-XXXX-XXXX or
                      the full URL (https://orcid.org/XXXX-XXXX-XXXX-XXXX).
                    </p>
                  </Tooltip.Content>
                </Tooltip>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    onPress={handleSaveORCID}
                    isPending={updateORCID.isPending}
                  >
                    {user.orcid ? "Update" : "Add"} ORCID
                  </Button>
                  {isEditingOrcid && (
                    <Button variant="ghost" onPress={handleCancelOrcid}>
                      Cancel
                    </Button>
                  )}
                </div>
                <p className="text-xs text-text-tertiary">
                  Don&apos;t have an ORCID iD?{" "}
                  <a
                    href="https://orcid.org/register"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline transition-colors hover:text-accent-dark"
                  >
                    Create one for free
                  </a>
                </p>
              </div>
            )}
          </div>
        )}

        {!isOwnProfile && user.orcid && (
          <div className="mt-8 border-t border-border-default pt-8">
            <h2 className="mb-4 text-xl font-semibold text-text-primary">
              ORCID iD
            </h2>
            <a
              href={`https://orcid.org/${user.orcid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-accent"
              aria-label={`View ORCID record - ${user.orcid}`}
            >
              <ORCIDIcon className="h-5 w-5 shrink-0" authenticated />
              <span className="tabular-nums">{user.orcid}</span>
            </a>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-6 text-2xl font-semibold text-text-primary">
          Molecules Created
        </h2>
        <UserMoleculesList userId={user.id} />
      </div>
    </div>
  );
}

function UserMoleculesList({ userId }: { userId: string }) {
  const { data, isLoading } =
    trpc.molecules.getByCreator.useInfiniteQuery(
      {
        creatorId: userId,
        limit: 12,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
    );

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border-default bg-surface-1 p-6">
        <div className="text-center text-sm text-text-secondary">
          Loading molecules…
        </div>
      </div>
    );
  }

  const molecules = data?.pages.flatMap((page) => page.molecules) ?? [];

  if (molecules.length === 0) {
    return (
      <div className="rounded-xl border border-border-default bg-surface-1 p-6">
        <p className="text-sm text-text-secondary">
          This user has not created any molecules yet.
        </p>
      </div>
    );
  }

  const displayMolecules = molecules.map((molecule) => {
    const synonyms = molecule.moleculesynonyms.map((s) => s.synonym);
    const primarySynonym = molecule.moleculesynonyms.find(
      (s) => s.order === 0,
    );
    const displayName =
      primarySynonym?.synonym ?? synonyms[0] ?? molecule.iupacname;

    return {
      name: displayName,
      commonName: synonyms.length > 0 ? synonyms : undefined,
      chemical_formula: molecule.chemicalformula,
      SMILES: molecule.smiles,
      InChI: molecule.inchi,
      pubChemCid: molecule.pubchemcid,
      casNumber: molecule.casnumber,
      imageUrl: molecule.imageurl ?? undefined,
      id: molecule.id,
    };
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {displayMolecules.map((molecule) => (
        <div key={molecule.id}>
          <MoleculeDisplay molecule={molecule} />
        </div>
      ))}
    </div>
  );
}
