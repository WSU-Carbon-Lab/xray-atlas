"use client";

import { use, useState } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "~/trpc/client";
import { PageSkeleton } from "@/components/feedback/loading-state";
import { NotFoundState, ErrorState } from "@/components/feedback/error-state";
import { MoleculeDisplay } from "@/components/molecules/molecule-display";
import { ORCIDIcon, GitHubIcon, HuggingFaceIcon } from "@/components/icons";
import { Avatar } from "~/app/components/CustomUserButton";
import Link from "next/link";
import { Button, Card } from "@heroui/react";
import { Key, Plus, Trash2, X } from "lucide-react";

function base64urlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  if (pad) base64 += "=".repeat(4 - pad);
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

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
  const unlinkAccount = trpc.users.unlinkAccount.useMutation();
  const deletePasskey = trpc.users.deletePasskey.useMutation();
  const utils = trpc.useUtils();

  const [orcidInput, setOrcidInput] = useState("");
  const [isEditingOrcid, setIsEditingOrcid] = useState(false);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [showConnectAccountModal, setShowConnectAccountModal] = useState(false);

  const isOwnProfile =
    !!session?.user?.id && !!user && session.user.id === user.id;

  const { data: linkedAccounts } = trpc.users.getLinkedAccounts.useQuery(
    undefined,
    {
      enabled: isOwnProfile,
    },
  );

  const { data: passkeys } = trpc.users.getPasskeys.useQuery(
    undefined,
    {
      enabled: isOwnProfile,
    },
  );

  const handleRemoveORCID = async () => {
    try {
      await removeORCID.mutateAsync();
      await utils.users.getById.invalidate({ id: userId });
      setIsEditingOrcid(false);
      setOrcidInput("");
    } catch (err) {
      console.error("Failed to remove ORCID:", err);
    }
  };

  const handleRegisterPasskey = async () => {
    setIsRegisteringPasskey(true);
    try {
      const registerResponse = await fetch("/api/passkeys/register", {
        method: "POST",
      });

      if (!registerResponse.ok) {
        throw new Error("Failed to generate registration options");
      }

      const options = (await registerResponse.json()) as {
        challenge: string;
        user: { id: string; name: string; displayName: string };
        excludeCredentials?: Array<{
          id: string | { type: "Buffer"; data: number[] };
          type: "public-key";
        }>;
        rp: { name: string; id: string };
        pubKeyCredParams: Array<{ type: "public-key"; alg: number }>;
        authenticatorSelection?: unknown;
        timeout?: number;
        attestation?: "none" | "indirect" | "direct";
      };

      const credentialIdToBufferSource = (id: string | { type: "Buffer"; data: number[] }): BufferSource =>
        (typeof id === "string" ? base64urlDecode(id) : new Uint8Array(id.data)) as BufferSource;

      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        challenge: base64urlDecode(options.challenge) as BufferSource,
        rp: options.rp,
        user: {
          id: base64urlDecode(options.user.id) as BufferSource,
          name: options.user.name,
          displayName: options.user.displayName,
        },
        pubKeyCredParams: options.pubKeyCredParams.map((param) => ({
          type: "public-key" as const,
          alg: param.alg,
        })),
        excludeCredentials: options.excludeCredentials?.map((cred) => ({
          id: credentialIdToBufferSource(cred.id),
          type: "public-key",
        })),
        timeout: options.timeout,
        attestation: options.attestation ?? "none",
        authenticatorSelection: options.authenticatorSelection as AuthenticatorSelectionCriteria | undefined,
      };

      const credential = (await navigator.credentials.create({
        publicKey: publicKeyOptions,
      })) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error("Failed to create credential");
      }

      const attestationResponse = credential.response as AuthenticatorAttestationResponse;
      const credentialId = Array.from(new Uint8Array(credential.rawId))
        .map((b) => String.fromCharCode(b))
        .join("");
      const clientDataJSON = Array.from(new Uint8Array(attestationResponse.clientDataJSON))
        .map((b) => String.fromCharCode(b))
        .join("");
      const attestationObject = Array.from(new Uint8Array(attestationResponse.attestationObject))
        .map((b) => String.fromCharCode(b))
        .join("");

      const transports = attestationResponse.getTransports();

      const verifyResponse = await fetch("/api/passkeys/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credential: {
            id: credential.id,
            rawId: btoa(credentialId),
            response: {
              clientDataJSON: btoa(clientDataJSON),
              attestationObject: btoa(attestationObject),
              transports,
            },
            type: credential.type,
          },
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error("Failed to verify passkey");
      }

      await utils.users.getPasskeys.invalidate();
    } catch (error) {
      console.error("Failed to register passkey:", error);
      alert(error instanceof Error ? error.message : "Failed to register passkey");
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  const handleDeletePasskey = async (passkeyId: string) => {
    if (!confirm("Are you sure you want to delete this passkey?")) {
      return;
    }
    try {
      await deletePasskey.mutateAsync({ passkeyId });
      await utils.users.getPasskeys.invalidate();
    } catch (error) {
      console.error("Failed to delete passkey:", error);
      alert(error instanceof Error ? error.message : "Failed to delete passkey");
    }
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
            <Avatar user={user} size="lg" />
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
          <>
            <div className="mt-8 border-t border-border-default pt-8">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <div>
                  <h2 className="mb-1 text-xl font-semibold text-text-primary">
                    ORCID iD
                  </h2>
                  <p className="mb-4 text-sm text-text-secondary">
                    Link your ORCID iD to your account for better research
                    attribution.
                  </p>

                  {user.orcid ? (
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
                    <div className="flex items-center gap-3 rounded-lg border border-border-default bg-surface-2 p-4">
                      <ORCIDIcon className="h-6 w-6 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-text-tertiary">
                          Authenticate ORCID iD
                        </p>
                        <p className="text-xs text-text-tertiary">
                          Link your ORCID account to verify your identity
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        onPress={() => {
                          window.location.href = `/api/auth/link-account?provider=orcid`;
                        }}
                      >
                        Authenticate
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="mb-1 text-xl font-semibold text-text-primary">
                    Connected Accounts
                  </h2>
                  <p className="mb-4 text-sm text-text-secondary">
                    Link additional accounts to your profile.
                  </p>

                  <div className="space-y-3">
                    {linkedAccounts?.some((acc) => acc.provider === "github") && (
                      <Card variant="default" className="border border-border-default">
                        <Card.Content className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <GitHubIcon className="h-6 w-6 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-text-primary">
                                GitHub
                              </p>
                              <p className="text-xs text-text-tertiary">Connected</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onPress={async () => {
                              const githubAccount = linkedAccounts.find(
                                (acc) => acc.provider === "github",
                              );
                              if (githubAccount) {
                                await unlinkAccount.mutateAsync({
                                  accountId: githubAccount.id,
                                });
                                await utils.users.getLinkedAccounts.invalidate();
                              }
                            }}
                            isPending={unlinkAccount.isPending}
                          >
                            <X className="h-4 w-4" />
                            <span>Disconnect</span>
                          </Button>
                        </Card.Content>
                      </Card>
                    )}

                    {linkedAccounts?.some((acc) => acc.provider === "huggingface") && (
                      <Card variant="default" className="border border-border-default">
                        <Card.Content className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <HuggingFaceIcon className="h-6 w-6 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-text-primary">
                                Hugging Face
                              </p>
                              <p className="text-xs text-text-tertiary">Connected</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onPress={async () => {
                              const hfAccount = linkedAccounts.find(
                                (acc) => acc.provider === "huggingface",
                              );
                              if (hfAccount) {
                                await unlinkAccount.mutateAsync({
                                  accountId: hfAccount.id,
                                });
                                await utils.users.getLinkedAccounts.invalidate();
                              }
                            }}
                            isPending={unlinkAccount.isPending}
                          >
                            <X className="h-4 w-4" />
                            <span>Disconnect</span>
                          </Button>
                        </Card.Content>
                      </Card>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-4"
                    onPress={() => setShowConnectAccountModal(true)}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Connect account</span>
                  </Button>

                  {showConnectAccountModal && (
                    <div
                      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                      onClick={(e) => {
                        if (e.target === e.currentTarget) {
                          setShowConnectAccountModal(false);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setShowConnectAccountModal(false);
                        }
                      }}
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="connect-account-title"
                    >
                      <Card className="w-full max-w-md border border-border-default bg-surface-1 p-6">
                        <Card.Header className="mb-4">
                          <Card.Title
                            id="connect-account-title"
                            className="text-xl font-semibold text-text-primary"
                          >
                            Connect Account
                          </Card.Title>
                          <Card.Description className="text-sm text-text-secondary">
                            Choose an account to connect
                          </Card.Description>
                        </Card.Header>
                        <Card.Content className="space-y-3">
                          {!linkedAccounts?.some((acc) => acc.provider === "github") && (
                            <Button
                              className="w-full justify-start"
                              variant="ghost"
                              onPress={() => {
                                window.location.href = `/api/auth/link-account?provider=github`;
                              }}
                            >
                              <GitHubIcon className="h-5 w-5 shrink-0" />
                              <span>Connect GitHub</span>
                            </Button>
                          )}
                          {!linkedAccounts?.some((acc) => acc.provider === "huggingface") && (
                            <Button
                              className="w-full justify-start"
                              variant="ghost"
                              onPress={() => {
                                window.location.href = `/api/auth/link-account?provider=huggingface`;
                              }}
                            >
                              <HuggingFaceIcon className="h-5 w-5 shrink-0" />
                              <span>Connect Hugging Face</span>
                            </Button>
                          )}
                          {linkedAccounts?.some((acc) => acc.provider === "github") &&
                            linkedAccounts?.some((acc) => acc.provider === "huggingface") && (
                              <p className="text-sm text-text-tertiary">
                                All available accounts are connected.
                              </p>
                            )}
                        </Card.Content>
                        <Card.Footer>
                          <Button
                            className="w-full"
                            variant="ghost"
                            onPress={() => setShowConnectAccountModal(false)}
                          >
                            Cancel
                          </Button>
                        </Card.Footer>
                      </Card>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-border-default pt-8">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="mb-1 text-xl font-semibold text-text-primary">
                    Security
                  </h2>
                  <p className="text-sm text-text-secondary">
                    Manage your passwordless authentication methods
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onPress={handleRegisterPasskey}
                  isPending={isRegisteringPasskey}
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Passkey</span>
                </Button>
              </div>

              {passkeys && passkeys.length > 0 ? (
                <div className="space-y-2">
                  {passkeys.map((passkey) => (
                    <Card
                      key={passkey.id}
                      variant="default"
                      className="border border-border-default"
                    >
                      <Card.Content className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <Key className="h-5 w-5 shrink-0 text-text-secondary" />
                          <div>
                            <p className="text-sm font-medium text-text-primary">
                              {passkey.deviceType === "cross-platform"
                                ? "Cross-platform Passkey"
                                : "Single Device Passkey"}
                            </p>
                            <p className="text-xs text-text-tertiary">
                              {passkey.transports.length > 0
                                ? `Transports: ${passkey.transports.join(", ")}`
                                : "No transport info"}
                              {passkey.backedUp ? " · Backed up" : ""}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-error hover:text-error-dark"
                          onPress={() => handleDeletePasskey(passkey.id)}
                          isPending={deletePasskey.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                        </Button>
                      </Card.Content>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card variant="default" className="border border-border-default">
                  <Card.Content className="p-4 text-center">
                    <p className="text-sm text-text-tertiary">
                      No passkeys registered. Create one to enable passwordless sign-in.
                    </p>
                  </Card.Content>
                </Card>
              )}
            </div>
          </>
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
