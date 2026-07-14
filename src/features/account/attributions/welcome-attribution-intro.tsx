"use client";

import { Card, Separator } from "@heroui/react";
import { site } from "~/app/brand";
import {
  AttributionPreferencesForm,
  type AttributionDisplayPreferenceKey,
} from "~/features/account/attributions/attribution-preferences-panel";
import { OrcidAccountConfirmationCard } from "~/features/account/attributions/orcid-account-confirmation-card";
import {
  attributionDisplayModeLabel,
  attributionResearcherAvatarProps,
  autoAcceptModeLabel,
  effectiveAttributionDisplayPreferences,
  resolveAttributionPublicDisplay,
  type AttributionDisplayMode,
  type AutoAcceptMode,
  type UserAttributionPreferencesView,
} from "~/lib/dataset-attribution-claim";

export interface WelcomeAttributionIntroProps {
  /**
   * Session attribution preferences and profile preview used to render the
   * identity block and visibility controls.
   */
  prefs: UserAttributionPreferencesView;
  /** True while a preferences mutation is in flight. */
  prefsPending: boolean;
  /** Persists auto-accept mode from the welcome identity card. */
  onAutoAcceptChange: (mode: AutoAcceptMode) => void;
  /** Persists a per-state display mode from the welcome identity card. */
  onDisplayModeChange: (
    key: AttributionDisplayPreferenceKey,
    mode: AttributionDisplayMode,
  ) => void;
  /**
   * Called after ORCID display name confirm/save so preference previews
   * refresh against the updated profile.
   */
  onAccountConfirmed?: (name: string | null) => void;
}

/**
 * First-login welcome hero plus a single identity/setup card: unified account
 * and pending appearance (avatar, ORCID, display-name confirm), then attribution
 * visibility preferences. Used on `/account/attributions/pending?welcome=1`.
 */
export function WelcomeAttributionIntro({
  prefs,
  prefsPending,
  onAutoAcceptChange,
  onDisplayModeChange,
  onAccountConfirmed,
}: WelcomeAttributionIntroProps) {
  const profile = prefs.profilePreview;
  const roleSlugs = prefs.pendingDisplayManagedByRole
    ? (["administrator"] as const)
    : ([] as const);
  const effectiveDisplay = effectiveAttributionDisplayPreferences(
    prefs.displayPreferences,
    roleSlugs,
  );
  const pendingResolved = resolveAttributionPublicDisplay({
    orcid: profile.orcid,
    claimStatus: "pending",
    storedDisplayName: profile.name,
    storedImageUrl: profile.image,
    targetPreferences: {
      autoAcceptMode: prefs.autoAcceptMode,
      displayPreferences: prefs.displayPreferences,
    },
    targetRoleSlugs: roleSlugs,
  });
  const avatarProps = attributionResearcherAvatarProps({
    orcid: profile.orcid,
    resolved: pendingResolved,
  });
  const pendingModeLabel = attributionDisplayModeLabel(effectiveDisplay.pending);
  const autoAcceptLabel = autoAcceptModeLabel(prefs.autoAcceptMode);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-foreground text-2xl font-semibold">
          Welcome to {site.name}
        </h1>
        <p className="text-muted max-w-2xl text-sm">
          Your ORCID already appears on NEXAFS datasets in {site.name}. Confirm
          your display name, choose how your credit appears before and after you
          accept, then review pending attributions. Nothing is claimed until you
          accept an item or turn on auto-accept below.
        </p>
      </div>

      <Card
        className="border-border bg-surface border"
        aria-labelledby="welcome-identity-setup-heading"
      >
        <Card.Header className="flex flex-col gap-1 px-4 pt-4 pb-0">
          <h2
            id="welcome-identity-setup-heading"
            className="text-foreground text-lg font-medium"
          >
            Here is how you appear to others
          </h2>
          <p className="text-muted text-sm">
            On browse and contribute surfaces, pending attributions use this
            preview until you accept credit for that dataset. Confirm your ORCID
            account details and visibility preferences in the same place; the
            preview updates when those settings change.
          </p>
        </Card.Header>
        <Card.Content className="flex flex-col gap-6 px-4 py-4">
          <OrcidAccountConfirmationCard
            orcid={profile.orcid}
            initialName={profile.name}
            imageUrl={profile.image}
            appearance={{
              displayLabel: pendingResolved.displayLabel,
              isOrcidOnlyDisplay: avatarProps.isOrcidOnlyDisplay,
              avatar: {
                displayName: avatarProps.displayName,
                imageUrl: avatarProps.imageUrl,
                isAtlasProfile: avatarProps.isAtlasProfile,
                placeholder: avatarProps.placeholder,
              },
            }}
            pendingModeLabel={pendingModeLabel}
            pendingDisplayManagedByRole={prefs.pendingDisplayManagedByRole}
            autoAcceptLabel={autoAcceptLabel}
            onConfirmed={onAccountConfirmed}
          />

          <Separator />

          <section
            aria-labelledby="welcome-attribution-visibility-heading"
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1">
              <h3
                id="welcome-attribution-visibility-heading"
                className="text-foreground text-base font-medium"
              >
                Attribution visibility preferences
              </h3>
              <p className="text-muted text-sm">
                Choose how your credit appears for pending, accepted, and
                unclaimed attributions, and whether future attributions are
                accepted automatically. Changes save immediately and update the
                appearance preview above.
              </p>
            </div>
            <AttributionPreferencesForm
              prefs={prefs}
              prefsPending={prefsPending}
              onAutoAcceptChange={onAutoAcceptChange}
              onDisplayModeChange={onDisplayModeChange}
            />
          </section>

          <p className="text-muted text-sm">
            Accept or decline each pending dataset below, or finish later from
            your account menu. Continue returns you to where you started.
          </p>
        </Card.Content>
      </Card>
    </div>
  );
}
