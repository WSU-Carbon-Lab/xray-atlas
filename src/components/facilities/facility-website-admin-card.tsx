"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Button,
  Card,
  Description,
  ErrorMessage,
  Label,
  TextField,
  InputGroup,
} from "@heroui/react";
import { trpc } from "~/trpc/client";
import { FacilityIcon } from "~/components/facilities/facility-icon";
import {
  FACILITY_WEBSITE_URL_MAX_LENGTH,
  facilityWebsiteUrlInputSchema,
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

  const updateMutation = trpc.facilities.updateWebsite.useMutation({
    onSuccess: async (updated) => {
      setDraft(updated.websiteurl ?? "");
      setFieldError(null);
      await utils.facilities.getBySlug.invalidate();
      await utils.facilities.getById.invalidate();
      await utils.facilities.list.invalidate();
      await utils.facilities.search.invalidate();
      onSaved();
    },
  });

  useEffect(() => {
    setDraft(websiteUrl ?? "");
  }, [websiteUrl]);

  if (!canManage) {
    return null;
  }

  const validationError = fieldError ?? validateWebsiteDraft(draft);

  return (
    <Card className="border-border bg-surface-1 overflow-hidden rounded-xl border shadow-sm">
      <Card.Header className="border-border border-b px-5 py-4 sm:px-6">
        <Card.Title className="text-foreground text-base font-semibold">
          Facility website
        </Card.Title>
        <Card.Description className="text-muted text-sm">
          Public homepage for {facilityName}. Favicon is fetched server-side for
          browse icons.
        </Card.Description>
      </Card.Header>
      <Card.Content className="space-y-4 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-4">
          <FacilityIcon
            name={facilityName}
            faviconUrl={faviconUrl}
            className="h-12 w-12"
            iconClassName="h-7 w-7"
          />
          <div className="min-w-0 flex-1">
            <TextField
              name="facilityWebsite"
              value={draft}
              onChange={(value) => {
                setDraft(value);
                setFieldError(null);
              }}
              isInvalid={Boolean(validationError && draft.trim() !== "")}
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
              {validationError && draft.trim() !== "" ? (
                <ErrorMessage className="text-sm font-medium">
                  {validationError}
                </ErrorMessage>
              ) : null}
            </TextField>
          </div>
        </div>
        {updateMutation.error ? (
          <p className="text-danger text-sm" role="alert">
            {updateMutation.error.message}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="sm"
            isDisabled={
              updateMutation.isPending ||
              (draft.trim() === (websiteUrl ?? "").trim() &&
                !updateMutation.isPending) ||
              Boolean(validationError && draft.trim() !== "")
            }
            onPress={() => {
              const error = validateWebsiteDraft(draft);
              if (error && draft.trim() !== "") {
                setFieldError(error);
                return;
              }
              updateMutation.mutate({
                facilityId,
                websiteUrl: draft.trim(),
              });
            }}
          >
            {updateMutation.isPending ? "Saving..." : "Save website"}
          </Button>
        </div>
      </Card.Content>
    </Card>
  );
}
