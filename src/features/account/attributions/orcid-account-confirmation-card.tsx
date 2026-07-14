"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import {
  ResearcherAvatar,
  type ResearcherAvatarPlaceholder,
} from "~/components/ui/avatar";
import { showToast } from "~/components/ui/toast";
import { trpc } from "~/trpc/client";

export interface OrcidAccountAppearancePreview {
  /** Label shown for pending attribution appearance (name or ORCID-only). */
  displayLabel: string;
  /** True when pending mode hides the Atlas name and shows ORCID only. */
  isOrcidOnlyDisplay: boolean;
  /** Avatar props aligned with attribution public-display resolution. */
  avatar: {
    displayName: string;
    imageUrl: string | null;
    isAtlasProfile: boolean;
    placeholder: ResearcherAvatarPlaceholder;
  };
}

export interface OrcidAccountConfirmationCardProps {
  orcid: string;
  initialName: string | null;
  imageUrl: string | null;
  /**
   * Pending attribution appearance used beside the display-name editor so the
   * welcome identity surface shows one preview instead of a separate strip.
   */
  appearance: OrcidAccountAppearancePreview;
  /** Human-readable pending display mode label (e.g. "Name and avatar"). */
  pendingModeLabel: string;
  /** True when role policy fixes pending display (administrator/maintainer). */
  pendingDisplayManagedByRole: boolean;
  /** Human-readable auto-accept mode label for the status line. */
  autoAcceptLabel: string;
  /**
   * Called after a successful confirm/save so parent surfaces can refresh
   * attribution preference previews that depend on display name.
   */
  onConfirmed?: (name: string | null) => void;
}

/**
 * Unified first-login identity block: pending attribution appearance (avatar,
 * name/ORCID, status line) plus an inline display-name confirm control at the
 * name position. Intended as a section inside the welcome card (no outer Card
 * chrome). Confirms or edits `user.name` without changing ORCID identity.
 */
export function OrcidAccountConfirmationCard({
  orcid,
  initialName,
  imageUrl,
  appearance,
  pendingModeLabel,
  pendingDisplayManagedByRole,
  autoAcceptLabel,
  onConfirmed,
}: OrcidAccountConfirmationCardProps) {
  const utils = trpc.useUtils();
  const [nameDraft, setNameDraft] = useState(initialName ?? "");
  const [confirmed, setConfirmed] = useState(false);
  const updateNameMutation = trpc.users.updateDisplayName.useMutation();

  useEffect(() => {
    setNameDraft(initialName ?? "");
    setConfirmed(false);
  }, [initialName, orcid]);

  const handleConfirm = async () => {
    const trimmed = nameDraft.trim();
    try {
      const updated = await updateNameMutation.mutateAsync({ name: trimmed });
      await Promise.all([
        utils.users.getCurrent.invalidate(),
        utils.datasetAttributions.getPreferences.invalidate(),
      ]);
      setConfirmed(true);
      onConfirmed?.(updated.name);
      showToast("Account information saved", "success");
    } catch {
      showToast("Could not save account information", "error", 0);
    }
  };

  const busy = updateNameMutation.isPending;
  const trimmedDraft = nameDraft.trim();
  const trimmedInitial = initialName?.trim() ?? "";
  const accountPreviewName =
    trimmedDraft.length > 0
      ? trimmedDraft
      : trimmedInitial.length > 0
        ? trimmedInitial
        : "Researcher";
  const orcidHref = `https://orcid.org/${orcid}`;
  const liveAvatarDisplayName = appearance.isOrcidOnlyDisplay
    ? appearance.avatar.displayName
    : (trimmedDraft.length > 0
        ? trimmedDraft
        : appearance.avatar.displayName);
  const liveDisplayLabel = appearance.isOrcidOnlyDisplay
    ? appearance.displayLabel
    : accountPreviewName;

  return (
    <section
      aria-labelledby="orcid-account-confirmation-heading"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <h3
          id="orcid-account-confirmation-heading"
          className="text-foreground text-base font-medium"
        >
          Account and pending appearance
        </h3>
        <p className="text-muted text-sm">
          Confirm the display name Atlas will use on attributions and your
          public profile. Edit the name inline, then confirm. The preview shows
          how pending credit appears until you accept a dataset. Your ORCID iD
          is your account identity and cannot be changed here.
        </p>
      </div>

      <div
        className="bg-surface-2/40 flex min-w-0 flex-col gap-4 rounded-lg px-3 py-3 sm:flex-row sm:items-start sm:gap-4"
        aria-label={`Pending attribution appearance: ${liveDisplayLabel}`}
      >
        <ResearcherAvatar
          displayName={liveAvatarDisplayName}
          imageUrl={appearance.avatar.imageUrl ?? imageUrl}
          identitySeed={orcid}
          isAtlasProfile={appearance.avatar.isAtlasProfile}
          placeholder={appearance.avatar.placeholder}
          size="lg"
          className="size-14 shrink-0"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="min-w-0">
            {appearance.isOrcidOnlyDisplay ? (
              <p className="text-muted mb-1 text-xs font-medium tracking-wide uppercase">
                ORCID only (pending)
              </p>
            ) : null}

            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <TextField
                className="w-full min-w-0 flex-1"
                isDisabled={busy}
                value={nameDraft}
                onChange={setNameDraft}
              >
                <Label className="sr-only">Display name</Label>
                <Input
                  variant="secondary"
                  placeholder="Name from ORCID"
                  className="text-foreground placeholder:text-muted w-full min-w-0 truncate border-0 bg-transparent p-0 text-base font-semibold shadow-none"
                />
              </TextField>
              <Button
                size="sm"
                variant="primary"
                className="shrink-0 self-stretch sm:self-auto"
                onPress={() => void handleConfirm()}
                isDisabled={busy}
              >
                {busy ? "Saving…" : confirmed ? "Update name" : "Confirm name"}
              </Button>
            </div>

            <a
              href={orcidHref}
              target="_blank"
              rel="noopener noreferrer"
              className={
                appearance.isOrcidOnlyDisplay
                  ? "text-foreground hover:text-foreground/80 mt-0.5 inline-block font-mono text-sm tabular-nums transition-colors"
                  : "text-muted hover:text-foreground mt-0.5 inline-block font-mono text-sm tabular-nums transition-colors"
              }
            >
              {orcid}
            </a>

            <p className="text-muted mt-1 text-xs">
              Pending display: {pendingModeLabel}
              {pendingDisplayManagedByRole ? " (fixed by your role)" : null}
              {" · "}
              Auto-accept {autoAcceptLabel.toLowerCase()}
            </p>
          </div>

          <p className="text-muted text-xs">
            {confirmed
              ? "Name confirmed for this session. Pending appearance updates when visibility preferences use your name."
              : "Review the ORCID-proposed name, edit if needed, then confirm."}
          </p>
        </div>
      </div>
    </section>
  );
}
