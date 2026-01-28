"use client";

import { useEffect, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "~/trpc/client";
import { PageSkeleton } from "~/app/components/LoadingState";
import { Button, Tooltip, Alert } from "@heroui/react";
import Link from "next/link";
import { Settings, Palette, Bell, User, ArrowRight, Sun, Moon, Monitor, Link as LinkIcon, X, Key, Plus } from "lucide-react";
import { type Theme } from "~/app/components/theme/constants";
import { ORCIDIcon, GitHubIcon } from "~/app/components/icons";

function SettingsContent() {
  const { data: session, status } = useSession();
  const { data: user, isLoading: isLoadingUser } = trpc.users.getCurrent.useQuery(
    undefined,
    {
      enabled: !!session?.user,
    },
  );
  const { data: linkedAccounts, refetch: refetchAccounts } = trpc.users.getLinkedAccounts.useQuery(
    undefined,
    {
      enabled: !!session?.user,
    },
  );
  const { data: passkeys, refetch: refetchPasskeys } = trpc.users.getPasskeys.useQuery(
    undefined,
    {
      enabled: !!session?.user,
    },
  );
  const unlinkAccountMutation = trpc.users.unlinkAccount.useMutation({
    onSuccess: () => {
      void refetchAccounts();
    },
  });
  const deletePasskeyMutation = trpc.users.deletePasskey.useMutation({
    onSuccess: () => {
      void refetchPasskeys();
    },
  });
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (searchParams.get("linked") === "true") {
      setLinkSuccess(true);
      void refetchAccounts();
      setTimeout(() => {
        setLinkSuccess(false);
        void router.replace("/settings");
      }, 5000);
    }
    if (searchParams.get("error")) {
      setLinkError(searchParams.get("error") ?? "Failed to link account");
      setTimeout(() => {
        setLinkError(null);
        void router.replace("/settings");
      }, 5000);
    }
  }, [searchParams, router, refetchAccounts]);

  if (status === "loading" || isLoadingUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageSkeleton />
      </div>
    );
  }

  if (!session?.user || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-xl border border-border-default bg-surface-1 p-8">
          <h1 className="mb-4 text-2xl font-bold text-text-primary">
            Access Denied
          </h1>
          <p className="text-text-secondary">
            Please sign in to access application settings.
          </p>
        </div>
      </div>
    );
  }

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const currentTheme = mounted ? (theme ?? "system") : "system";
  const displayTheme = mounted ? resolvedTheme ?? "light" : "light";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-text-secondary transition-colors hover:text-accent"
        >
          ← Back to Home
        </Link>
      </div>

      <div className="rounded-xl border border-border-default bg-surface-1 p-8">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <Settings className="h-8 w-8 text-accent" />
            <h1 className="text-3xl font-bold text-text-primary">
              Application Settings
            </h1>
          </div>
          <p className="text-text-secondary">
            Manage your application preferences and display options
          </p>
        </div>

        <div className="space-y-8">
          <div className="border-t border-border-default pt-8">
            <div className="mb-4 flex items-center gap-3">
              <Palette className="h-5 w-5 text-text-secondary" />
              <h2 className="text-xl font-semibold text-text-primary">
                Appearance
              </h2>
            </div>
            <Tooltip delay={0}>
              <Tooltip.Trigger>
                <p className="mb-4 text-sm text-text-secondary">
                  Choose how the application appears. System will match your device settings.
                </p>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <p>
                  Theme preferences are saved locally in your browser and will persist across sessions.
                </p>
              </Tooltip.Content>
            </Tooltip>

            <div className="flex flex-wrap gap-3">
              <Tooltip delay={0}>
                <Tooltip.Trigger>
                  <Button
                    variant={currentTheme === "light" ? "primary" : "outline"}
                    onPress={() => handleThemeChange("light")}
                    className="min-w-[120px]"
                  >
                    <Sun className="h-4 w-4" />
                    <span>Light</span>
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <p>Use light theme</p>
                </Tooltip.Content>
              </Tooltip>

              <Tooltip delay={0}>
                <Tooltip.Trigger>
                  <Button
                    variant={currentTheme === "dark" ? "primary" : "outline"}
                    onPress={() => handleThemeChange("dark")}
                    className="min-w-[120px]"
                  >
                    <Moon className="h-4 w-4" />
                    <span>Dark</span>
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <p>Use dark theme</p>
                </Tooltip.Content>
              </Tooltip>

              <Tooltip delay={0}>
                <Tooltip.Trigger>
                  <Button
                    variant={currentTheme === "system" ? "primary" : "outline"}
                    onPress={() => handleThemeChange("system")}
                    className="min-w-[120px]"
                  >
                    <Monitor className="h-4 w-4" />
                    <span>System</span>
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <p>Match your device theme</p>
                </Tooltip.Content>
              </Tooltip>
            </div>

            {mounted && currentTheme === "system" && (
              <p className="mt-3 text-sm text-text-tertiary">
                Currently using {displayTheme === "dark" ? "dark" : "light"} theme based on your system settings
              </p>
            )}
          </div>

          <div className="border-t border-border-default pt-8">
            <div className="mb-4 flex items-center gap-3">
              <User className="h-5 w-5 text-text-secondary" />
              <h2 className="text-xl font-semibold text-text-primary">
                Account Settings
              </h2>
            </div>
            <p className="mb-4 text-sm text-text-secondary">
              Manage your account information and profile settings
            </p>
            <Button
              variant="outline"
              onPress={() => router.push(`/users/${user.id}`)}
            >
              <User className="h-4 w-4" />
              <span>View Profile Settings</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="border-t border-border-default pt-8">
            <div className="mb-4 flex items-center gap-3">
              <LinkIcon className="h-5 w-5 text-text-secondary" />
              <h2 className="text-xl font-semibold text-text-primary">
                Linked Accounts
              </h2>
            </div>
            <Tooltip delay={0}>
              <Tooltip.Trigger>
                <p className="mb-4 text-sm text-text-secondary">
                  Link multiple accounts to sign in with different providers. You can link ORCID and GitHub accounts to your profile.
                </p>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <p>
                  Linking accounts allows you to sign in using any of your connected providers. If an account already exists, it will be linked to your current profile.
                </p>
              </Tooltip.Content>
            </Tooltip>

            {linkSuccess && (
              <Alert className="mb-4" color="success">
                Account linked successfully
              </Alert>
            )}

            {linkError && (
              <Alert className="mb-4" color="danger">
                {linkError}
              </Alert>
            )}

            <div className="space-y-3">
              {linkedAccounts?.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-lg border border-border-default bg-surface-2 p-4"
                >
                  <div className="flex items-center gap-3">
                    {account.provider === "orcid" ? (
                      <ORCIDIcon className="h-5 w-5" authenticated />
                    ) : account.provider === "github" ? (
                      <GitHubIcon className="h-5 w-5" />
                    ) : null}
                    <div>
                      <p className="font-medium text-text-primary capitalize">
                        {account.provider}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {account.providerAccountId}
                      </p>
                    </div>
                  </div>
                  {linkedAccounts.length > 1 && (
                    <Tooltip delay={0}>
                      <Tooltip.Trigger>
                        <Button
                          variant="ghost"
                          size="sm"
                          isDisabled={unlinkAccountMutation.isPending}
                          onPress={() => {
                            if (confirm("Are you sure you want to unlink this account? You will no longer be able to sign in with it.")) {
                              unlinkAccountMutation.mutate({ accountId: account.id });
                            }
                          }}
                        >
                          <X className="h-4 w-4" />
                          <span>Unlink</span>
                        </Button>
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        <p>Remove this account link</p>
                      </Tooltip.Content>
                    </Tooltip>
                  )}
                </div>
              ))}

              <div className="flex flex-wrap gap-3">
                {(!linkedAccounts?.some((a) => a.provider === "orcid") || !linkedAccounts) && (
                  <Tooltip delay={0}>
                    <Tooltip.Trigger>
                      <Button
                        variant="outline"
                        onPress={() => {
                          window.location.href = `/api/auth/link-account?provider=orcid`;
                        }}
                      >
                        <LinkIcon className="h-4 w-4" />
                        <ORCIDIcon className="h-4 w-4" authenticated />
                        <span>Link ORCID</span>
                      </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <p>Link your ORCID account to sign in with it</p>
                    </Tooltip.Content>
                  </Tooltip>
                )}

                {(!linkedAccounts?.some((a) => a.provider === "github") || !linkedAccounts) && (
                  <Tooltip delay={0}>
                    <Tooltip.Trigger>
                      <Button
                        variant="outline"
                        onPress={() => {
                          window.location.href = `/api/auth/link-account?provider=github`;
                        }}
                      >
                        <LinkIcon className="h-4 w-4" />
                        <GitHubIcon className="h-4 w-4" />
                        <span>Link GitHub</span>
                      </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <p>Link your GitHub account to sign in with it</p>
                    </Tooltip.Content>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border-default pt-8">
            <div className="mb-4 flex items-center gap-3">
              <Key className="h-5 w-5 text-text-secondary" />
              <h2 className="text-xl font-semibold text-text-primary">
                Passkeys
              </h2>
            </div>
            <Tooltip delay={0}>
              <Tooltip.Trigger>
                <p className="mb-4 text-sm text-text-secondary">
                  Manage your passkeys for passwordless authentication. Passkeys use your device's biometric authentication or a security key.
                </p>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <p>
                  Passkeys provide secure, passwordless sign-in using biometric authentication or security keys. You can register multiple passkeys for different devices.
                </p>
              </Tooltip.Content>
            </Tooltip>

            <div className="space-y-3">
              {passkeys?.map((passkey) => (
                <div
                  key={passkey.id}
                  className="flex items-center justify-between rounded-lg border border-border-default bg-surface-2 p-4"
                >
                  <div className="flex items-center gap-3">
                    <Key className="h-5 w-5 text-text-secondary" />
                    <div>
                      <p className="font-medium text-text-primary capitalize">
                        {passkey.deviceType === "singleDevice" ? "Device Passkey" : "Cross-Platform Passkey"}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {passkey.backedUp ? "Synced" : "Device-only"} • {passkey.transports.length > 0 ? passkey.transports.join(", ") : "No transports"}
                      </p>
                    </div>
                  </div>
                  {(passkeys.length > 1 || (linkedAccounts?.length ?? 0) > 0) && (
                    <Tooltip delay={0}>
                      <Tooltip.Trigger>
                        <Button
                          variant="ghost"
                          size="sm"
                          isDisabled={deletePasskeyMutation.isPending}
                          onPress={() => {
                            if (confirm("Are you sure you want to delete this passkey? You will no longer be able to sign in with it.")) {
                              deletePasskeyMutation.mutate({ passkeyId: passkey.id });
                            }
                          }}
                        >
                          <X className="h-4 w-4" />
                          <span>Delete</span>
                        </Button>
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        <p>Remove this passkey</p>
                      </Tooltip.Content>
                    </Tooltip>
                  )}
                </div>
              ))}

              <Tooltip delay={0}>
                <Tooltip.Trigger>
                  <Button
                    variant="outline"
                    isDisabled={isRegisteringPasskey}
                    onPress={async () => {
                      try {
                        setIsRegisteringPasskey(true);
                        const registerResponse = await fetch("/api/passkeys/register", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                        });

                        if (!registerResponse.ok) {
                          const error = await registerResponse.json();
                          throw new Error(error.error ?? "Failed to start registration");
                        }

                        const options = await registerResponse.json();

                        if (!window.PublicKeyCredential) {
                          throw new Error("WebAuthn is not supported in this browser");
                        }

                        const credential = await navigator.credentials.create({
                          publicKey: options,
                        }) as PublicKeyCredential | null;

                        if (!credential) {
                          throw new Error("Failed to create passkey");
                        }

                        const attestationResponse = credential.response as AuthenticatorAttestationResponse;

                        const rawIdArray = new Uint8Array(credential.rawId);
                        const attestationObjectArray = new Uint8Array(attestationResponse.attestationObject);
                        const clientDataJSONArray = new Uint8Array(attestationResponse.clientDataJSON);

                        const verifyResponse = await fetch("/api/passkeys/verify", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            credential: {
                              id: credential.id,
                              rawId: Array.from(rawIdArray),
                              response: {
                                attestationObject: Array.from(attestationObjectArray),
                                clientDataJSON: Array.from(clientDataJSONArray),
                                transports: attestationResponse.getTransports?.() ?? undefined,
                              },
                              type: credential.type,
                            },
                          }),
                        });

                        if (!verifyResponse.ok) {
                          const error = await verifyResponse.json();
                          throw new Error(error.error ?? "Failed to verify passkey");
                        }

                        void refetchPasskeys();
                        setIsRegisteringPasskey(false);
                      } catch (error) {
                        setIsRegisteringPasskey(false);
                        const errorMessage = error instanceof Error ? error.message : "Failed to register passkey";
                        alert(errorMessage);
                      }
                    }}
                  >
                    {isRegisteringPasskey ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        <span>Registering...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>Add Passkey</span>
                      </>
                    )}
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <p>Register a new passkey for this device</p>
                </Tooltip.Content>
              </Tooltip>
            </div>
          </div>

          <div className="border-t border-border-default pt-8">
            <div className="mb-4 flex items-center gap-3">
              <Bell className="h-5 w-5 text-text-secondary" />
              <h2 className="text-xl font-semibold text-text-primary">
                Notification Preferences
              </h2>
            </div>
            <Tooltip delay={0}>
              <Tooltip.Trigger>
                <p className="text-sm text-text-secondary">
                  Notification preferences will be available here.
                </p>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <p>
                  Configure email notifications, browser notifications, and other alerts.
                </p>
              </Tooltip.Content>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <PageSkeleton />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
