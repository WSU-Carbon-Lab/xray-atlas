"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import {
  Accordion,
  Button,
  Chip,
  Description,
  ErrorMessage,
  Label,
  TextField,
  InputGroup,
} from "@heroui/react";
import { cn } from "@heroui/styles";
import { trpc } from "~/trpc/client";
import { FacilityIcon } from "~/components/facilities/facility-icon";
import { showToast } from "~/components/ui/toast";
import {
  FACILITY_WEBSITE_URL_MAX_LENGTH,
  facilityFaviconPreviewUrl,
  facilityWebsiteHostname,
  facilityWebsiteUrlInputSchema,
  trimFacilityWebsiteUrl,
} from "~/lib/facility-website-url";

interface FacilityWebsiteAdminCardProps {
  facilityId: string;
  facilityName: string;
  websiteUrl: string | null;
  faviconUrl: string | null;
  onSaved: () => void;
}

function validateWebsiteDraft(value: string): string | null {
  if (value.trim() === "") return null;
  const result = facilityWebsiteUrlInputSchema.safeParse(value.trim());
  if (!result.success) {
    return result.error.issues[0]?.message ?? "Enter a valid http or https URL.";
  }
  return null;
}

/**
 * Administrator-only editor for a facility public homepage URL with favicon preview.
 */
export function FacilityWebsiteAdminCard({
  facilityId,
  facilityName,
  websiteUrl,
  faviconUrl,
  onSaved,
}: FacilityWebsiteAdminCardProps) {
  const { data: session } = useSession();
  const canManage = Boolean(session?.user?.canManageUsers);
  const [draft, setDraft] = useState(websiteUrl ?? "");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const invalidateFacilityQueries = async () => {
    await utils.facilities.getBySlug.invalidate();
    await utils.facilities.getById.invalidate();
    await utils.facilities.list.invalidate();
    await utils.facilities.search.invalidate();
  };

  const updateMutation = trpc.facilities.updateWebsite.useMutation({
    onSuccess: async (updated) => {
      setDraft(updated.websiteurl ?? "");
      setFieldError(null);
      await invalidateFacilityQueries();
      onSaved();
      showToast(
        updated.websiteurl
          ? "Facility website saved."
          : "Facility website removed.",
        "success",
      );
    },
  });

  const refreshMutation = trpc.facilities.refreshFavicon.useMutation({
    onSuccess: async (updated) => {
      setDraft(updated.websiteurl ?? "");
      await invalidateFacilityQueries();
      onSaved();
      showToast("Facility favicon refreshed.", "success");
    },
  });

  useEffect(() => {
    setDraft(websiteUrl ?? "");
  }, [websiteUrl]);

  const validationError = fieldError ?? validateWebsiteDraft(draft);
  const draftTrimmed = draft.trim();
  const savedTrimmed = (websiteUrl ?? "").trim();
  const isDirty = draftTrimmed !== savedTrimmed;
  const isSaved =
    !isDirty &&
    draftTrimmed.length > 0 &&
    !updateMutation.isPending &&
    !refreshMutation.isPending;
  const parsedDraftUrl = useMemo(() => {
    if (validationError || draftTrimmed === "") return null;
    return trimFacilityWebsiteUrl(draftTrimmed);
  }, [draftTrimmed, validationError]);
  const previewHostname = parsedDraftUrl
    ? facilityWebsiteHostname(parsedDraftUrl)
    : null;
  const previewFaviconUrl = facilityFaviconPreviewUrl(
    draft,
    websiteUrl,
    faviconUrl,
  );
  const isPending = updateMutation.isPending || refreshMutation.isPending;

  if (!canManage) {
    return null;
  }

  return (
    <Accordion
      variant="surface"
      className="border-border bg-surface-1 overflow-hidden rounded-xl border shadow-sm"
    >
      <Accordion.Item id="facility-website-admin">
        <Accordion.Heading>
          <Accordion.Trigger className="text-foreground px-5 py-4 text-sm font-semibold sm:px-6">
            <span className="flex min-w-0 flex-1 items-center gap-3">
              <FacilityIcon
                name={facilityName}
                faviconUrl={previewFaviconUrl ?? faviconUrl}
                size="sm"
              />
              <span className="min-w-0 text-start">
                <span className="block text-base font-semibold">
                  Facility website
                </span>
                <span className="text-muted block truncate text-xs font-normal">
                  {savedTrimmed || "No public homepage configured"}
                </span>
              </span>
            </span>
            {isSaved ? (
              <Chip
                size="sm"
                variant="soft"
                color="success"
                className="me-2 shrink-0"
              >
                Saved
              </Chip>
            ) : null}
            <Accordion.Indicator />
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body className="border-border space-y-4 border-t px-5 py-5 sm:px-6">
            <Description className="text-muted text-sm">
              Public homepage for {facilityName}. Favicon is fetched server-side
              for browse icons and the facility header.
            </Description>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex shrink-0 flex-col items-center gap-2 sm:items-start">
                <FacilityIcon
                  name={facilityName}
                  faviconUrl={previewFaviconUrl}
                  size="lg"
                />
                <span className="text-muted text-center text-xs sm:text-start">
                  Favicon preview
                </span>
              </div>

              <div className="min-w-0 flex-1 space-y-3">
                <TextField
                  name="facilityWebsite"
                  value={draft}
                  onChange={(value) => {
                    setDraft(value);
                    setFieldError(null);
                  }}
                  isInvalid={Boolean(validationError && draftTrimmed !== "")}
                  fullWidth
                >
                  <Label className="text-foreground mb-1.5 block text-sm font-medium">
                    Website URL
                  </Label>
                  <InputGroup variant="secondary" fullWidth>
                    <InputGroup.Input
                      placeholder="https://www.example.gov/facility"
                      maxLength={FACILITY_WEBSITE_URL_MAX_LENGTH}
                      autoComplete="url"
                      inputMode="url"
                    />
                  </InputGroup>
                  <Description className="text-muted mt-1.5 text-xs">
                    Use https when available. Leave empty to remove the link and
                    favicon.
                  </Description>
                  {validationError && draftTrimmed !== "" ? (
                    <ErrorMessage className="text-sm font-medium">
                      {validationError}
                    </ErrorMessage>
                  ) : null}
                </TextField>

                {parsedDraftUrl && previewHostname ? (
                  <a
                    href={parsedDraftUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "border-border bg-default/60 text-foreground hover:border-accent/30 hover:bg-accent/10",
                      "inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    )}
                  >
                    <ArrowTopRightOnSquareIcon
                      className="text-muted h-4 w-4 shrink-0"
                      aria-hidden
                    />
                    <span className="truncate">{previewHostname}</span>
                  </a>
                ) : null}
              </div>
            </div>

            {updateMutation.error ? (
              <p className="text-danger text-sm" role="alert">
                {updateMutation.error.message}
              </p>
            ) : null}
            {refreshMutation.error ? (
              <p className="text-danger text-sm" role="alert">
                {refreshMutation.error.message}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="sm"
                isDisabled={
                  isPending ||
                  !isDirty ||
                  Boolean(validationError && draftTrimmed !== "")
                }
                onPress={() => {
                  const error = validateWebsiteDraft(draft);
                  if (error && draftTrimmed !== "") {
                    setFieldError(error);
                    return;
                  }
                  updateMutation.mutate({
                    facilityId,
                    websiteUrl: draftTrimmed,
                  });
                }}
              >
                {updateMutation.isPending ? "Saving..." : "Save website"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                isDisabled={isPending || draftTrimmed === "" || Boolean(validationError)}
                onPress={() => {
                  refreshMutation.mutate({ facilityId });
                }}
              >
                {refreshMutation.isPending ? "Refreshing..." : "Refresh favicon"}
              </Button>
            </div>
          </Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
