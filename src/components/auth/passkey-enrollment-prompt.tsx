"use client";

import Link from "next/link";
import { Button, Card } from "@heroui/react";
import { Key } from "lucide-react";

export interface PasskeyEnrollmentPromptProps {
  profileHref: string;
  title?: string;
  description?: string;
  requiresAal3Hardware?: boolean;
}

/**
 * Blocks contribute or admin write UI until the user enrolls a passkey from their profile.
 */
export function PasskeyEnrollmentPrompt({
  profileHref,
  title = "Passkey required",
  description,
  requiresAal3Hardware = false,
}: PasskeyEnrollmentPromptProps) {
  const defaultDescription = requiresAal3Hardware
    ? "Your role requires a hardware security key passkey. Register one from your profile, then sign in with it for administrator access."
    : "Register a passkey from your profile before submitting data. Browse and read-only access remain available with ORCID sign-in.";

  return (
    <Card className="border border-border-default bg-surface-2 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="bg-accent/10 text-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
          <Key className="h-5 w-5" aria-hidden />
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
            <p className="mt-1 text-sm text-text-secondary">
              {description ?? defaultDescription}
            </p>
          </div>
          <Link href={profileHref} className="w-fit">
            <Button variant="primary">Open profile to register passkey</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
