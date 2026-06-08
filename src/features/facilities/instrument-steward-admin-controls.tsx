"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Button, Input, Label, SearchField } from "@heroui/react";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";
import { normalizeOrcidUserInput } from "~/lib/orcid";
import type { InstrumentStewardPublic } from "~/lib/instrument-steward";
import { instrumentStewardProfileHref } from "~/lib/instrument-steward";
import Link from "next/link";

type InstrumentStewardAdminControlsProps = {
  instrumentId: string;
  instrumentName: string;
  steward: InstrumentStewardPublic | null | undefined;
  onStewardChanged: () => void;
};

/**
 * Admin-only inline controls for assigning or clearing a beamline scientist steward on a facility instrument card.
 */
export function InstrumentStewardAdminControls({
  instrumentId,
  instrumentName,
  steward,
  onStewardChanged,
}: InstrumentStewardAdminControlsProps) {
  const { data: session } = useSession();
  const canManageUsers = Boolean(session?.user?.canManageUsers);
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQ, setSearchQ] = useState<string | undefined>(undefined);
  const [orcidDraft, setOrcidDraft] = useState("");

  const utils = trpc.useUtils();
  const listUsers = trpc.admin.listUsers.useQuery(
    { skip: 0, take: 8, q: searchQ },
    { enabled: canManageUsers && Boolean(searchQ), staleTime: 30_000 },
  );

  const setSteward = trpc.instruments.setSteward.useMutation({
    onSuccess: async () => {
      showToast(`Assigned steward for ${instrumentName}.`, "success");
      setOrcidDraft("");
      setSearchDraft("");
      setSearchQ(undefined);
      await utils.instruments.listStewardsForFacility.invalidate();
      onStewardChanged();
    },
    onError: (error) => showToast(error.message, "error"),
  });

  const clearSteward = trpc.instruments.clearSteward.useMutation({
    onSuccess: async () => {
      showToast(`Cleared steward for ${instrumentName}.`, "success");
      await utils.instruments.listStewardsForFacility.invalidate();
      onStewardChanged();
    },
    onError: (error) => showToast(error.message, "error"),
  });

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const trimmed = searchDraft.trim();
      setSearchQ(trimmed.length > 0 ? trimmed : undefined);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [searchDraft]);

  const searchResults = useMemo(() => listUsers.data?.rows ?? [], [listUsers.data]);

  if (!canManageUsers) {
    return null;
  }

  const assignOrcid = (raw: string) => {
    const normalized = normalizeOrcidUserInput(raw);
    if (!normalized) {
      showToast("Enter a valid ORCID iD.", "error");
      return;
    }
    setSteward.mutate({
      instrumentId,
      userId: normalized,
    });
  };

  return (
    <div
      className="border-border bg-surface/40 mt-2 rounded-lg border border-dashed px-3 py-3"
      aria-label={`Assign beamline scientist for ${instrumentName}`}
    >
      <p className="text-foreground text-xs font-semibold tracking-wide uppercase">
        Admin: beamline scientist
      </p>

      {steward ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Assigned:</span>
          <Link
            href={instrumentStewardProfileHref(steward.userId)}
            className="text-accent hover:text-accent-dark font-medium underline-offset-2 hover:underline"
          >
            {steward.name?.trim() || steward.userId}
          </Link>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => clearSteward.mutate({ instrumentId })}
            isDisabled={clearSteward.isPending}
          >
            Clear
          </Button>
        </div>
      ) : (
        <p className="text-muted mt-2 text-sm">No steward assigned.</p>
      )}

      <div className="mt-3 grid gap-3">
        <SearchField
          aria-label={`Search Atlas users to assign steward for ${instrumentName}`}
          value={searchDraft}
          onChange={setSearchDraft}
        >
          <Label className="text-muted text-xs">Search users by name or ORCID</Label>
          <SearchField.Group>
            <SearchField.Input placeholder="Name or ORCID" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>

        {searchQ ? (
          <ul className="space-y-1" aria-label="User search results">
            {listUsers.isLoading ? (
              <li className="text-muted text-sm">Searching...</li>
            ) : null}
            {!listUsers.isLoading && searchResults.length === 0 ? (
              <li className="text-muted text-sm">No matching users.</li>
            ) : null}
            {searchResults.map((user) => (
              <li key={user.id}>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-auto min-h-8 w-full justify-start px-2 py-1.5 text-left"
                  onPress={() => assignOrcid(user.id)}
                  isDisabled={setSteward.isPending}
                >
                  <span className="text-foreground text-sm font-medium">
                    {user.name?.trim() || user.id}
                  </span>
                  <span className="text-muted ms-2 text-xs">{user.id}</span>
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[14rem] flex-1">
            <Label htmlFor={`steward-orcid-${instrumentId}`} className="text-muted text-xs">
              Assign by ORCID
            </Label>
            <Input
              id={`steward-orcid-${instrumentId}`}
              value={orcidDraft}
              onChange={(event) => setOrcidDraft(event.target.value)}
              placeholder="0000-0001-2345-6789"
            />
          </div>
          <Button
            size="sm"
            variant="primary"
            onPress={() => assignOrcid(orcidDraft)}
            isDisabled={setSteward.isPending}
          >
            Assign
          </Button>
        </div>
      </div>
    </div>
  );
}
