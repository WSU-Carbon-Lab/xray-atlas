"use client";

import { use, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "~/trpc/client";
import { PageSkeleton } from "@/components/feedback/loading-state";
import { NotFoundState, ErrorState } from "@/components/feedback/error-state";
import { MoleculeDisplayCompact } from "@/components/molecules/molecule-display";
import { ORCIDIcon, GitHubIcon, HuggingFaceIcon } from "@/components/icons";
import { CustomAvatar } from "@/components/ui/avatar";
import { SimpleDialog } from "@/components/ui/dialog";
import Link from "next/link";
import {
  Accordion,
  Avatar,
  Button,
  Card,
  ListBox,
  Tooltip,
} from "@heroui/react";
import {
  AlertTriangle,
  ArrowLeftRight,
  ChevronDown,
  Key,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { ToastContainer, useToast } from "@/components/ui/toast";

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error && error.message
    ? error.message
    : fallbackMessage;
}

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
  const removeORCID = trpc.users.removeORCID.useMutation();
  const unlinkAccount = trpc.users.unlinkAccount.useMutation();
  const deletePasskey = trpc.users.deletePasskey.useMutation();
  const utils = trpc.useUtils();
  const { toasts, removeToast, showToast } = useToast();

  const [_orcidInput, setOrcidInput] = useState("");
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

  const { data: passkeys } = trpc.users.getPasskeys.useQuery(undefined, {
    enabled: isOwnProfile,
  });

  const handleRemoveORCID = async () => {
    try {
      await removeORCID.mutateAsync();
      await utils.users.getById.invalidate({ id: userId });
      setIsEditingOrcid(false);
      setOrcidInput("");
    } catch (err) {
      console.error("Failed to remove ORCID:", err);
      showToast(getErrorMessage(err, "Failed to remove ORCID iD"), "error", 0);
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

      const credentialIdToBufferSource = (
        id: string | { type: "Buffer"; data: number[] },
      ): BufferSource =>
        (typeof id === "string"
          ? base64urlDecode(id)
          : new Uint8Array(id.data)) as BufferSource;

      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        challenge: Uint8Array.from(atob(options.challenge), (c) =>
          c.charCodeAt(0),
        ),
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
        authenticatorSelection: options.authenticatorSelection as
          | AuthenticatorSelectionCriteria
          | undefined,
      };

      const credential = (await navigator.credentials.create({
        publicKey: publicKeyOptions,
      })) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error("Failed to create credential");
      }

      const attestationResponse =
        credential.response as AuthenticatorAttestationResponse;
      const credentialId = Array.from(new Uint8Array(credential.rawId))
        .map((b) => String.fromCharCode(b))
        .join("");
      const clientDataJSON = Array.from(
        new Uint8Array(attestationResponse.clientDataJSON),
      )
        .map((b) => String.fromCharCode(b))
        .join("");
      const attestationObject = Array.from(
        new Uint8Array(attestationResponse.attestationObject),
      )
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
      showToast(
        getErrorMessage(error, "Failed to register passkey"),
        "error",
        0,
      );
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
      showToast(getErrorMessage(error, "Failed to delete passkey"), "error", 0);
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
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="mb-6">
        <Link
          href="/"
          className="text-text-secondary hover:text-accent text-sm transition-colors"
        >
          Back to Home
        </Link>
      </div>

      <div className="border-border-default bg-surface-1 rounded-xl border p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <CustomAvatar user={user} size="lg" />

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="text-text-primary mb-2 text-3xl font-bold">
              {user.name}
            </h1>
            {isOwnProfile && user.email && (
              <p className="text-text-secondary mb-2">{user.email}</p>
            )}
            {user.orcid && !isEditingOrcid && (
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <a
                  href={`https://orcid.org/${user.orcid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary hover:text-accent inline-flex items-center gap-2 text-sm transition-colors"
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
            <div className="border-border-default mt-8 border-t pt-8">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <div>
                  <h2 className="text-text-primary mb-1 text-xl font-semibold">
                    ORCID iD
                  </h2>
                  <p className="text-text-secondary mb-4 text-sm">
                    Link your ORCID iD to your account for better research
                    attribution.
                  </p>

                  {user.orcid ? (
                    <div className="border-border-default bg-surface-2 flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <ORCIDIcon className="h-6 w-6 shrink-0" authenticated />
                        <div>
                          <a
                            href={`https://orcid.org/${user.orcid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:text-accent-dark inline-flex items-center gap-2 text-sm font-medium transition-colors"
                            aria-label={`View ORCID record - ${user.orcid}`}
                          >
                            <span className="tabular-nums">{user.orcid}</span>
                          </a>
                          <p className="text-text-tertiary text-xs">
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
                    <div className="border-border-default bg-surface-2 flex items-center gap-3 rounded-lg border p-4">
                      <ORCIDIcon className="h-6 w-6 shrink-0" />
                      <div className="flex-1">
                        <p className="text-text-tertiary text-sm font-medium">
                          Authenticate ORCID iD
                        </p>
                        <p className="text-text-tertiary text-xs">
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
                  <h2 className="text-text-primary mb-1 text-xl font-semibold">
                    Connected Accounts
                  </h2>
                  <p className="text-text-secondary mb-4 text-sm">
                    Link additional accounts to your profile.
                  </p>

                  <div className="space-y-3">
                    {linkedAccounts?.some(
                      (acc) => acc.provider === "github",
                    ) && (
                      <Card
                        variant="default"
                        className="border-border-default border"
                      >
                        <Card.Content className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <GitHubIcon className="h-6 w-6 shrink-0" />
                            <div>
                              <p className="text-text-primary text-sm font-medium">
                                GitHub
                              </p>
                              <p className="text-text-tertiary text-xs">
                                Connected
                              </p>
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

                    {linkedAccounts?.some(
                      (acc) => acc.provider === "huggingface",
                    ) && (
                      <Card
                        variant="default"
                        className="border-border-default border"
                      >
                        <Card.Content className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <HuggingFaceIcon className="h-6 w-6 shrink-0" />
                            <div>
                              <p className="text-text-primary text-sm font-medium">
                                Hugging Face
                              </p>
                              <p className="text-text-tertiary text-xs">
                                Connected
                              </p>
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
                      <Card className="border-border-default bg-surface-1 w-full max-w-md border p-6">
                        <Card.Header className="mb-4">
                          <Card.Title
                            id="connect-account-title"
                            className="text-text-primary text-xl font-semibold"
                          >
                            Connect Account
                          </Card.Title>
                          <Card.Description className="text-text-secondary text-sm">
                            Choose an account to connect
                          </Card.Description>
                        </Card.Header>
                        <Card.Content className="space-y-3">
                          {!linkedAccounts?.some(
                            (acc) => acc.provider === "github",
                          ) && (
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
                          {!linkedAccounts?.some(
                            (acc) => acc.provider === "huggingface",
                          ) && (
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
                          {linkedAccounts?.some(
                            (acc) => acc.provider === "github",
                          ) &&
                            linkedAccounts?.some(
                              (acc) => acc.provider === "huggingface",
                            ) && (
                              <p className="text-text-tertiary text-sm">
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

            <div className="border-border-default mt-8 border-t pt-8">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-text-primary mb-1 text-xl font-semibold">
                    Security
                  </h2>
                  <p className="text-text-secondary text-sm">
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
                      className="border-border-default border"
                    >
                      <Card.Content className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <Key className="text-text-secondary h-5 w-5 shrink-0" />
                          <div>
                            <p className="text-text-primary text-sm font-medium">
                              {passkey.deviceType === "cross-platform"
                                ? "Cross-platform Passkey"
                                : "Single Device Passkey"}
                            </p>
                            <p className="text-text-tertiary text-xs">
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
                <Card
                  variant="default"
                  className="border-border-default border"
                >
                  <Card.Content className="p-4 text-center">
                    <p className="text-text-tertiary text-sm">
                      No passkeys registered. Create one to enable passwordless
                      sign-in.
                    </p>
                  </Card.Content>
                </Card>
              )}
            </div>
          </>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-text-primary mb-6 text-2xl font-semibold">
          Molecules Created
        </h2>
        <UserMoleculesList userId={user.id} />
      </div>
    </div>
  );
}

function UserMoleculesList({ userId }: { userId: string }) {
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const { toasts, removeToast, showToast } = useToast();
  const transferOwnership = trpc.molecules.transferOwnership.useMutation();
  const removeMolecule = trpc.molecules.remove.useMutation();
  const getDeleteDataPointImpact =
    trpc.molecules.getDeleteDataPointImpact.useMutation();
  const { data, isLoading } = trpc.molecules.getByCreator.useInfiniteQuery(
    {
      creatorId: userId,
      limit: 12,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );
  const isOwnProfile = session?.user?.id === userId;
  const molecules = data?.pages.flatMap((page) => page.molecules) ?? [];
  const { data: coreMaintainers } = trpc.users.getCoreMaintainers.useQuery(
    undefined,
    { enabled: isOwnProfile },
  );

  const [isDangerZoneOpen, setIsDangerZoneOpen] = useState(false);
  const [deleteDialogMoleculeId, setDeleteDialogMoleculeId] = useState<
    string | null
  >(null);
  const [deleteDataPointsRemoved, setDeleteDataPointsRemoved] = useState<
    number | null
  >(null);
  const deleteImpactRequestIdRef = useRef<string | null>(null);
  const [transferDialogMoleculeId, setTransferDialogMoleculeId] = useState<
    string | null
  >(null);
  const [transferRecipientUserId, setTransferRecipientUserId] = useState<
    string | null
  >(null);

  const pendingDeleteMolecule =
    deleteDialogMoleculeId !== null
      ? (molecules.find((m) => m.id === deleteDialogMoleculeId) ?? null)
      : null;

  const pendingTransferMolecule =
    transferDialogMoleculeId !== null
      ? (molecules.find((m) => m.id === transferDialogMoleculeId) ?? null)
      : null;

  const openDelete = (moleculeId: string) => {
    deleteImpactRequestIdRef.current = moleculeId;
    setDeleteDataPointsRemoved(null);
    setDeleteDialogMoleculeId(moleculeId);
    void getDeleteDataPointImpact
      .mutateAsync({ moleculeId })
      .then((res) => {
        if (deleteImpactRequestIdRef.current === moleculeId) {
          setDeleteDataPointsRemoved(res.dataPointsRemoved);
        }
      })
      .catch((error) => {
        showToast(
          getErrorMessage(error, "Failed to calculate delete impact"),
          "error",
          0,
        );
        if (deleteImpactRequestIdRef.current === moleculeId) {
          setDeleteDataPointsRemoved(-1);
        }
      });
  };

  const closeDelete = () => {
    setDeleteDialogMoleculeId(null);
    setDeleteDataPointsRemoved(null);
  };

  const openTransfer = (moleculeId: string) => {
    setTransferDialogMoleculeId(moleculeId);
    setTransferRecipientUserId(null);
  };

  const closeTransfer = () => {
    setTransferDialogMoleculeId(null);
    setTransferRecipientUserId(null);
  };

  if (isLoading) {
    return (
      <div className="border-border-default bg-surface-1 rounded-xl border p-6">
        <div className="text-text-secondary text-center text-sm">
          Loading molecules…
        </div>
      </div>
    );
  }

  if (molecules.length === 0) {
    return (
      <div className="border-border-default bg-surface-1 rounded-xl border p-6">
        <p className="text-text-secondary text-sm">
          This user has not created any molecules yet.
        </p>
      </div>
    );
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialogMoleculeId) return;
    try {
      await removeMolecule.mutateAsync({ moleculeId: deleteDialogMoleculeId });
      await utils.molecules.getByCreator.invalidate({
        creatorId: userId,
        limit: 12,
      });
      closeDelete();
    } catch (error) {
      showToast(
        getErrorMessage(error, "Failed to remove molecule from database"),
        "error",
        0,
      );
    }
  };

  const handleTransferConfirm = async () => {
    if (!transferDialogMoleculeId || !transferRecipientUserId) return;
    try {
      await transferOwnership.mutateAsync({
        moleculeId: transferDialogMoleculeId,
        newCreatorId: transferRecipientUserId,
      });
      await utils.molecules.getByCreator.invalidate({
        creatorId: userId,
        limit: 12,
      });
      closeTransfer();
    } catch (error) {
      showToast(
        getErrorMessage(error, "Failed to transfer molecule ownership"),
        "error",
        0,
      );
    }
  };

  const recipientOptions = (() => {
    if (!pendingTransferMolecule) return [];
    const contributors =
      pendingTransferMolecule.contributors?.map((c) => c.user) ?? [];
    const core = coreMaintainers ?? [];

    const byId = new Map<
      string,
      {
        id: string;
        name: string | null;
        image: string | null;
        kind: "core" | "contributor";
      }
    >();

    for (const u of core) {
      byId.set(u.id, {
        id: u.id,
        name: u.name,
        image: u.image,
        kind: "core",
      });
    }

    for (const u of contributors) {
      if (!byId.has(u.id)) {
        byId.set(u.id, {
          id: u.id,
          name: u.name,
          image: u.image,
          kind: "contributor",
        });
      }
    }

    return Array.from(byId.values());
  })();

  const recipientAvatar = (user: {
    name: string | null;
    image: string | null;
  }) => {
    const initials =
      user.name
        ?.split(" ")
        .map((n) => n[0])
        .filter(Boolean)
        .join("")
        .toUpperCase() ?? "U";

    const fallback = initials.length > 2 ? initials.slice(0, 2) : initials;

    return (
      <Avatar size="sm" className="shrink-0">
        {user.image ? (
          <Avatar.Image
            alt={user.name ?? "User"}
            src={user.image}
            className="rounded-full"
          />
        ) : null}
        <Avatar.Fallback className="text-xs">{fallback}</Avatar.Fallback>
      </Avatar>
    );
  };

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {isOwnProfile && (
        <Accordion
          variant="surface"
          className="border-border-default w-full rounded-lg border"
          aria-label="Danger zone"
        >
          <Accordion.Item key="danger-zone" id="danger-zone">
            <Accordion.Heading>
              <Accordion.Trigger
                onPress={() => setIsDangerZoneOpen((v) => !v)}
                className="flex w-full items-center gap-2 px-4 py-3 text-left"
              >
                <AlertTriangle className="text-error h-4 w-4 shrink-0" />
                <span className="text-text-primary text-sm font-semibold">
                  Danger Zone
                </span>
                <span className="text-text-tertiary text-xs">
                  Delete / transfer ownership
                </span>
                <Accordion.Indicator className="text-muted ml-auto shrink-0 [&>svg]:size-4">
                  <ChevronDown className="h-4 w-4" />
                </Accordion.Indicator>
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="text-text-secondary px-4 pt-0 pb-4 text-sm">
                Expand to reveal destructive actions. Deleting removes the
                molecule and all related records. Transferring ownership keeps
                the molecule.
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      )}

      <div className="w-full space-y-3">
        {molecules.map((molecule) => (
          <div
            key={molecule.id}
            className="flex items-stretch gap-3 [&>div]:[contain-intrinsic-size:0_120px]"
          >
            {isOwnProfile && isDangerZoneOpen ? (
              <div className="self-stretch">
                <div className="border-border-default bg-surface-2 flex h-full w-[44px] flex-col overflow-hidden rounded-lg border">
                  <Tooltip delay={0}>
                    <Tooltip.Trigger>
                      <span
                        tabIndex={
                          removeMolecule.isPending &&
                          deleteDialogMoleculeId === molecule.id
                            ? 0
                            : undefined
                        }
                        className="inline-flex h-11 w-11 flex-none"
                      >
                        <Button
                          isIconOnly
                          aria-label={`Danger action: permanently delete molecule ${molecule.name}`}
                          onPress={() => openDelete(molecule.id)}
                          size="sm"
                          variant="danger"
                          className="h-11 max-h-11 min-h-11 w-11 max-w-11 min-w-11 flex-none rounded-none rounded-t-lg px-0"
                          isDisabled={
                            removeMolecule.isPending &&
                            deleteDialogMoleculeId === molecule.id
                          }
                        >
                          <Trash2 className="text-error h-4 w-4" />
                        </Button>
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content placement="right top">
                      {removeMolecule.isPending &&
                      deleteDialogMoleculeId === molecule.id
                        ? "Destructive delete is in progress"
                        : `Danger: delete ${molecule.name}`}
                    </Tooltip.Content>
                  </Tooltip>
                  <div className="border-border-default h-px w-full border-t" />
                  <Tooltip delay={0}>
                    <Tooltip.Trigger>
                      <span
                        tabIndex={
                          transferOwnership.isPending &&
                          transferDialogMoleculeId === molecule.id
                            ? 0
                            : undefined
                        }
                        className="inline-flex h-11 w-11 flex-none"
                      >
                        <Button
                          isIconOnly
                          aria-label={`Danger action: transfer ownership of molecule ${molecule.name}`}
                          onPress={() => openTransfer(molecule.id)}
                          size="sm"
                          variant="ghost"
                          className="text-warning h-11 max-h-11 min-h-11 w-11 max-w-11 min-w-11 flex-none rounded-none rounded-b-lg px-0"
                          isDisabled={
                            transferOwnership.isPending &&
                            transferDialogMoleculeId === molecule.id
                          }
                        >
                          <ArrowLeftRight className="h-4 w-4" />
                        </Button>
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content placement="right top">
                      {transferOwnership.isPending &&
                      transferDialogMoleculeId === molecule.id
                        ? "Ownership transfer is in progress"
                        : `Caution: transfer ${molecule.name}`}
                    </Tooltip.Content>
                  </Tooltip>
                </div>
              </div>
            ) : null}

            <div className="min-w-0 flex-1">
              <MoleculeDisplayCompact
                molecule={molecule}
                enableRealtime={false}
              />
            </div>
          </div>
        ))}
      </div>

      <SimpleDialog
        isOpen={deleteDialogMoleculeId !== null}
        onClose={closeDelete}
        title="Delete molecule permanently?"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-amber-300/60 bg-amber-100/40 p-3 dark:border-amber-500/40 dark:bg-amber-900/20">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-2">
              <p className="text-text-secondary text-sm">
                You are about to permanently delete{" "}
                <span className="text-text-primary font-semibold">
                  {pendingDeleteMolecule?.name ?? "this molecule"}
                </span>{" "}
                from the database. This action cannot be undone.
              </p>
              <p className="text-text-secondary text-sm">
                This will remove{" "}
                <span className="text-text-primary font-semibold tabular-nums">
                  {deleteDataPointsRemoved === null
                    ? "calculating..."
                    : deleteDataPointsRemoved < 0
                      ? "unknown"
                      : deleteDataPointsRemoved.toLocaleString()}
                </span>{" "}
                data points.
              </p>
              <p className="text-text-secondary text-sm">
                Safer alternative: transfer ownership to a core maintainer
                instead.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onPress={closeDelete}>
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </Button>
            <Button
              variant="secondary"
              onPress={() => {
                const id = deleteDialogMoleculeId;
                closeDelete();
                if (id) openTransfer(id);
              }}
              isDisabled={!deleteDialogMoleculeId}
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span>Transfer instead</span>
            </Button>
            <Button
              variant="danger"
              onPress={handleDeleteConfirm}
              isPending={removeMolecule.isPending}
              isDisabled={!deleteDialogMoleculeId}
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Molecule</span>
            </Button>
          </div>
        </div>
      </SimpleDialog>

      <SimpleDialog
        isOpen={transferDialogMoleculeId !== null}
        onClose={closeTransfer}
        title="Transfer molecule ownership"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-text-secondary text-sm">
              Transfer the owner of{" "}
              <span className="text-text-primary font-semibold">
                {pendingTransferMolecule?.name ?? "this molecule"}
              </span>
              . This will not delete the molecule.
            </p>
          </div>

          <div>
            <p className="text-text-primary mb-2 text-sm font-medium">
              Choose a new owner
            </p>
            <ListBox
              aria-label="Choose new owner"
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={
                transferRecipientUserId
                  ? new Set([transferRecipientUserId])
                  : new Set()
              }
              onSelectionChange={(keys) => {
                const first = Array.from(keys)[0];
                setTransferRecipientUserId(first ? String(first) : null);
              }}
            >
              {recipientOptions.length === 0 ? (
                <ListBox.Item key="none" textValue="No recipients available">
                  <span className="text-text-tertiary text-sm">
                    No recipients available
                  </span>
                </ListBox.Item>
              ) : (
                recipientOptions.map((u) => (
                  <ListBox.Item key={u.id} textValue={u.name ?? u.id}>
                    <div className="flex items-center gap-3">
                      {recipientAvatar({ name: u.name, image: u.image })}
                      <div className="min-w-0">
                        <div className="text-text-primary truncate text-sm font-medium">
                          {u.name ?? "User"}
                        </div>
                        <div className="text-text-tertiary truncate text-xs">
                          {u.kind === "core"
                            ? "Core maintainer"
                            : "Contributor"}
                        </div>
                      </div>
                    </div>
                  </ListBox.Item>
                ))
              )}
            </ListBox>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onPress={closeTransfer}>
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </Button>
            <Button
              variant="primary"
              onPress={handleTransferConfirm}
              isDisabled={
                !transferRecipientUserId || recipientOptions.length === 0
              }
              isPending={transferOwnership.isPending}
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span>Transfer ownership</span>
            </Button>
          </div>
        </div>
      </SimpleDialog>
    </div>
  );
}
