"use client";

import Link from "next/link";
import { Button, Card } from "@heroui/react";
import { Key } from "lucide-react";

export interface PasskeyEnrollmentPromptProps {
  profileHref: string;
  title?: string;
  description?: string;
  requiresAal3Hardware?: boolean;
  onRegister?: () => void | Promise<void>;
  isRegistering?: boolean;
}

/**
 * Blocks contribute or admin write UI until the user enrolls a passkey.
 * Prefer in-browser registration via `onRegister`; profile remains a secondary path.
 */
export function PasskeyEnrollmentPrompt({
  profileHref,
  title = "Passkey required",
  description,
  requiresAal3Hardware = false,
  onRegister,
  isRegistering = false,
}: PasskeyEnrollmentPromptProps) {
  const defaultDescription = requiresAal3Hardware
    ? "Your role requires a hardware security key passkey. Register one with your browser or from your profile, then sign in with it for administrator access."
    : "Register a passkey with your browser before filling in contribution forms. Browse and read-only access remain available with ORCID sign-in.";

  return (
    <Card className="border-border-default bg-surface-2 border p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="bg-accent/10 text-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
          <Key className="h-5 w-5" aria-hidden />
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <div>
            <h2 className="text-text-primary text-lg font-semibold">{title}</h2>
            <p className="text-text-secondary mt-1 text-sm">
              {description ?? defaultDescription}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onRegister ? (
              <Button
                variant="primary"
                onPress={() => void onRegister()}
                isPending={isRegistering}
              >
                Register passkey
              </Button>
            ) : null}
            <Link href={profileHref} className="w-fit">
              <Button variant={onRegister ? "secondary" : "primary"}>
                {onRegister ? "Open profile" : "Open profile to register passkey"}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
