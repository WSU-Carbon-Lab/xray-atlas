"use client";

/**
 * Shared Keep / Absorb review chrome for contribute similarity confirm and
 * persist-merge of two Atlas experiments. Column order is Keep (surviving /
 * catalog) then Absorb (incoming upload or deleted experiment).
 */

import type { ReactNode } from "react";
import {
  Checkbox,
  Chip,
  Description,
  Label,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { CheckIcon } from "~/components/icons";
import { ContributorAvatarGroup } from "~/components/attribution/contributor-avatar-group";
import { LoadingSkeleton } from "~/components/feedback/loading-state";
import { NexafsDatasetMetricsRail } from "~/components/nexafs/nexafs-dataset-metrics-rail";
import { SpectrumPlot } from "~/components/plots/spectrum-plot";
import type { SpectrumPlotProps } from "~/components/plots/types";
import {
  normalizeProfileImageUrl,
  type UserWithOrcid,
} from "~/components/ui/avatar";
import { contributorRoleLabelsForDisplay } from "~/lib/contributor-avatar-display";
import { attributionResearcherAvatarProps } from "~/lib/dataset-attribution-claim";
import {
  datasetAttributionsForAvatarDisplay,
  researcherAttributionBadgeStatus,
  type DatasetAttributionEntry,
} from "~/lib/nexafs-attribution";
import type { GeometryPairingRow } from "~/lib/nexafs/dataset-similarity-compare";
import type { SimilarityGeometrySelection } from "~/lib/nexafs/dataset-similarity-compare";
import type { NexafsBrowseDatasetMetricsCardModel } from "~/lib/nexafs-dataset-metric-display-model";
import type { SimilarityConfirmQualityCheck } from "~/lib/nexafs/similarity-confirm-quality";
import type {
  SimilarityMergeConflictRow,
  SimilarityMergeResolution,
} from "~/lib/nexafs/similarity-merge-conflicts";
import { cn } from "@heroui/styles";

/** Plot traces: surviving Keep, incoming Absorb, or overlay. */
export type SimilarityPlotSource = "keep" | "absorb" | "overlay";

/** Conflicts-only vs every field including read-only identity. */
export type SimilarityReviewViewMode = "conflicts" | "full";

/** Bulk field resolution. Internal `existing` is Keep; `upload` is Absorb. */
export type SimilarityBulkAction = "keep" | "absorb" | "smart";

/**
 * Maps Keep/Absorb bulk UI keys onto conflict-row resolutions.
 *
 * @param action - Prefer keep, prefer absorb, or smart merge.
 * @returns `existing` for keep, `upload` for absorb; `null` for smart (caller applies smart merge).
 */
export function bulkActionToResolution(
  action: SimilarityBulkAction,
): SimilarityMergeResolution | null {
  switch (action) {
    case "keep":
      return "existing";
    case "absorb":
      return "upload";
    case "smart":
      return null;
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

/**
 * Builds researcher avatars for a Keep or Absorb attribution column.
 *
 * @param rows - Dataset attribution entries.
 * @returns Avatar-group users in display order.
 */
export function attributionsToAvatarUsers(
  rows: readonly DatasetAttributionEntry[],
): UserWithOrcid[] {
  return datasetAttributionsForAvatarDisplay([...rows]).map((display) => {
    const orcid = display.orcid.trim();
    const avatarProps = attributionResearcherAvatarProps({
      orcid,
      resolved: {
        displayLabel: display.displayName,
        displayName: display.isOrcidOnlyDisplay ? null : display.displayName,
        imageUrl: display.image,
        showProfileImage: Boolean(display.image?.trim()),
        isOrcidOnlyLabel: display.isOrcidOnlyDisplay,
        avatarPlaceholder: display.avatarPlaceholder,
      },
    });
    return {
      id: display.isClaimed ? display.profileUserId.trim() || orcid : orcid,
      orcid,
      name: avatarProps.displayName,
      image: normalizeProfileImageUrl(avatarProps.imageUrl),
      isAtlasProfile: avatarProps.isAtlasProfile,
      avatarPlaceholder: avatarProps.placeholder,
      attributionBadgeStatus: researcherAttributionBadgeStatus({
        isClaimed: display.isClaimed,
        hasContributionAgreement: display.hasContributionAgreement,
      }),
      hoverRoleLabel: contributorRoleLabelsForDisplay(display.roles),
      tooltipSubtitle: contributorRoleLabelsForDisplay(display.roles),
      avatarStackKey: display.stackKey,
    };
  });
}

/**
 * Short researcher list for conflict-row text.
 *
 * @param rows - Attribution entries.
 * @returns Comma-separated names or a count; em dash when empty.
 */
export function attributionsDisplayLabel(
  rows: readonly DatasetAttributionEntry[],
): string {
  if (rows.length === 0) {
    return "—";
  }
  const names = datasetAttributionsForAvatarDisplay([...rows])
    .map((row) => row.displayName.trim())
    .filter((name) => name.length > 0);
  if (names.length === 0) {
    return `${rows.length} researcher${rows.length === 1 ? "" : "s"}`;
  }
  if (names.length <= 3) {
    return names.join(", ");
  }
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

/**
 * Card group with uppercase title used by similarity review sections.
 *
 * @param title - Section heading.
 * @param children - Divided body rows.
 */
export function SimilarityMetaGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-border bg-surface-secondary overflow-hidden rounded-xl border">
      <header className="text-muted px-3 py-2 text-xs font-semibold tracking-wide uppercase">
        {title}
      </header>
      <div className="border-border bg-surface divide-border divide-y border-t">
        {children}
      </div>
    </section>
  );
}

/**
 * Keep / Absorb column headers for conflict tables.
 */
export function SimilarityColumnHeader() {
  return (
    <div className="text-muted grid grid-cols-[7rem_1fr_1fr] gap-2 px-3 py-1.5 text-xs font-semibold tracking-wide uppercase">
      <span>Field</span>
      <span>Keep</span>
      <span>Absorb</span>
    </div>
  );
}

function SelectableCell({
  selected,
  onSelect,
  children,
  disabled,
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex min-w-0 w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
        selected ? "bg-accent/15 ring-accent/40 ring-1" : "hover:bg-default/70",
        disabled && "cursor-default opacity-80 hover:bg-transparent",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
          selected
            ? "border-accent bg-accent text-accent-foreground"
            : "border-border bg-transparent",
        )}
        aria-hidden
      >
        {selected ? <CheckIcon className="size-2.5" /> : null}
      </span>
      <span className="min-w-0 flex-1 break-words">{children}</span>
    </button>
  );
}

/**
 * Read-only Keep | Absorb comparison row (agreed fields and identity).
 *
 * @param label - Field name.
 * @param keep - Surviving / catalog value.
 * @param absorb - Incoming / deleted-side value.
 * @param differs - Highlights the row when values disagree but are not choosable.
 */
export function SimilarityReadOnlyRow({
  label,
  keep,
  absorb,
  differs,
}: {
  label: string;
  keep: ReactNode;
  absorb: ReactNode;
  differs?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[7rem_1fr_1fr] gap-2 px-3 py-2 text-sm",
        differs && "bg-warning/10",
      )}
    >
      <div className="text-muted font-medium">{label}</div>
      <div className="text-foreground min-w-0 break-words">{keep}</div>
      <div className="text-foreground min-w-0 break-words">{absorb}</div>
    </div>
  );
}

/**
 * Conflict row with a separate Keep checkmark and Absorb checkmark.
 *
 * @param row - Merge conflict model (`existing` = Keep, `upload` = Absorb).
 * @param onResolve - Records the chosen side.
 * @param keepExtra - Optional Keep-column content (avatars).
 * @param absorbExtra - Optional Absorb-column content.
 */
export function SimilarityConflictRow({
  row,
  onResolve,
  keepExtra,
  absorbExtra,
}: {
  row: SimilarityMergeConflictRow;
  onResolve: (resolution: SimilarityMergeResolution) => void;
  keepExtra?: ReactNode;
  absorbExtra?: ReactNode;
}) {
  if (row.status === "agreed") {
    return (
      <SimilarityReadOnlyRow
        label={row.label}
        keep={keepExtra ?? row.existingDisplay}
        absorb={absorbExtra ?? row.uploadDisplay}
      />
    );
  }

  const selected = row.resolution;
  return (
    <div className="bg-warning/5 grid grid-cols-[7rem_1fr_1fr] gap-2 px-3 py-2 text-sm">
      <div className="text-muted flex flex-col gap-1 font-medium">
        <span>{row.label}</span>
        <span className="text-warning text-[10px] font-semibold tracking-wide uppercase">
          Conflict
        </span>
        {row.allowsBoth ? (
          <button
            type="button"
            onClick={() => onResolve("both")}
            className={cn(
              "text-accent w-fit text-left text-xs underline",
              selected === "both" && "font-semibold",
            )}
          >
            Use both
          </button>
        ) : null}
      </div>
      <SelectableCell
        selected={selected === "existing"}
        onSelect={() => onResolve("existing")}
      >
        {keepExtra ?? row.existingDisplay}
      </SelectableCell>
      <SelectableCell
        selected={selected === "upload"}
        onSelect={() => onResolve("upload")}
      >
        {absorbExtra ?? row.uploadDisplay}
      </SelectableCell>
    </div>
  );
}

/**
 * Polarization overlap row: Keep vs Absorb spectrum for one θ/φ, or a copy note.
 *
 * @param row - Geometry pairing from the compare model.
 * @param source - Chosen spectrum for matched overlaps (`keep` default).
 * @param onSourceChange - Updates the Keep/Absorb pick for this angle.
 * @param copyAbsorbOntoKeep - When false, absorb-only angles are unique rather than copied.
 */
export function SimilarityGeometryRow({
  row,
  source,
  onSourceChange,
  copyAbsorbOntoKeep = true,
}: {
  row: GeometryPairingRow;
  source: "keep" | "absorb";
  onSourceChange: (next: "keep" | "absorb") => void;
  copyAbsorbOntoKeep?: boolean;
}) {
  if (row.kind !== "matched") {
    const note =
      row.kind === "upload_only"
        ? copyAbsorbOntoKeep
          ? "Absorb only — copied onto Keep"
          : "Unique to Absorb"
        : "Keep only";
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
        <span className="text-foreground font-medium">{row.label}</span>
        <Chip size="sm" variant="soft">
          {note}
        </Chip>
      </div>
    );
  }

  return (
    <div className="bg-warning/5 grid grid-cols-[7rem_1fr_1fr] gap-2 px-3 py-2 text-sm">
      <div className="text-muted flex flex-col gap-1 font-medium">
        <span>{row.label}</span>
        <span className="text-warning text-[10px] font-semibold tracking-wide uppercase">
          Overlap
        </span>
      </div>
      <SelectableCell
        selected={source === "keep"}
        onSelect={() => onSourceChange("keep")}
      >
        Keep spectrum
      </SelectableCell>
      <SelectableCell
        selected={source === "absorb"}
        onSelect={() => onSourceChange("absorb")}
      >
        Absorb spectrum
      </SelectableCell>
    </div>
  );
}

/**
 * Prefer keep / Prefer absorb / Smart merge control.
 *
 * @param bulkAction - Currently highlighted bulk key, or null.
 * @param onBulk - Applies the bulk resolution.
 */
export function SimilarityBulkResolutionGroup({
  bulkAction,
  onBulk,
}: {
  bulkAction: SimilarityBulkAction | null;
  onBulk: (action: SimilarityBulkAction) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-foreground text-sm font-medium">
        Resolve disagreements
      </Label>
      <ToggleButtonGroup
        aria-label="Bulk Keep or Absorb resolution"
        selectionMode="single"
        selectedKeys={bulkAction ? new Set([bulkAction]) : new Set()}
        onSelectionChange={(keys) => {
          const next = keys.values().next().value;
          if (next === "keep" || next === "absorb" || next === "smart") {
            onBulk(next);
          }
        }}
        className="flex flex-wrap gap-1"
      >
        <ToggleButton id="keep" size="sm" className="rounded-lg px-3">
          Prefer keep
        </ToggleButton>
        <ToggleButton id="absorb" size="sm" className="rounded-lg px-3">
          Prefer absorb
        </ToggleButton>
        <ToggleButton id="smart" size="sm" className="rounded-lg px-3">
          Smart merge
        </ToggleButton>
      </ToggleButtonGroup>
    </div>
  );
}

/**
 * Conflicts vs full-review toggle.
 *
 * @param reviewMode - Active view.
 * @param unresolvedCount - Open conflict count shown on the Conflicts tab.
 * @param onReviewModeChange - Switches view.
 */
export function SimilarityReviewModeGroup({
  reviewMode,
  unresolvedCount,
  onReviewModeChange,
}: {
  reviewMode: SimilarityReviewViewMode;
  unresolvedCount: number;
  onReviewModeChange: (mode: SimilarityReviewViewMode) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-foreground text-sm font-medium">Review</Label>
      <ToggleButtonGroup
        aria-label="Review mode"
        selectionMode="single"
        selectedKeys={new Set([reviewMode])}
        onSelectionChange={(keys) => {
          const next = keys.values().next().value;
          if (next === "conflicts" || next === "full") {
            onReviewModeChange(next);
          }
        }}
        className="flex flex-wrap gap-1"
      >
        <ToggleButton id="conflicts" size="sm" className="rounded-lg px-3">
          Conflicts
          {unresolvedCount > 0 ? ` (${unresolvedCount})` : ""}
        </ToggleButton>
        <ToggleButton id="full" size="sm" className="rounded-lg px-3">
          Full review
        </ToggleButton>
      </ToggleButtonGroup>
    </div>
  );
}

/**
 * Keep / Absorb / Overlay plot source plus matched-angle filter.
 *
 * @param plotSource - Which traces are visible.
 * @param onPlotSourceChange - Updates plot source.
 * @param geometrySelection - `all` or one matched geometry key.
 * @param onGeometrySelectionChange - Updates the angle filter.
 * @param matchedPairings - Overlapping θ/φ rows.
 * @param description - Residual / channel helper copy.
 * @param loading - Shows a skeleton instead of the plot.
 * @param plotProps - SpectrumPlot props when loaded.
 * @param emptyMessage - Shown when no points load.
 */
export function SimilaritySpectrumSection({
  plotSource,
  onPlotSourceChange,
  geometrySelection,
  onGeometrySelectionChange,
  matchedPairings,
  description,
  loading,
  plotProps,
  emptyMessage,
}: {
  plotSource: SimilarityPlotSource;
  onPlotSourceChange: (next: SimilarityPlotSource) => void;
  geometrySelection: SimilarityGeometrySelection;
  onGeometrySelectionChange: (next: SimilarityGeometrySelection) => void;
  matchedPairings: readonly GeometryPairingRow[];
  description: string;
  loading: boolean;
  plotProps: SpectrumPlotProps | null;
  emptyMessage: string;
}) {
  return (
    <SimilarityMetaGroup title="Spectrum">
      <div className="flex flex-col gap-3 px-3 py-3">
        <div className="flex flex-col gap-2">
          <Label className="text-foreground text-sm font-medium">
            Show spectrum
          </Label>
          <ToggleButtonGroup
            aria-label="Plot source"
            selectionMode="single"
            selectedKeys={new Set([plotSource])}
            onSelectionChange={(keys) => {
              const next = keys.values().next().value;
              if (next === "keep" || next === "absorb" || next === "overlay") {
                onPlotSourceChange(next);
              }
            }}
            className="flex flex-wrap gap-1"
          >
            <ToggleButton id="keep" size="sm" className="rounded-lg px-3">
              Keep
            </ToggleButton>
            <ToggleButton id="absorb" size="sm" className="rounded-lg px-3">
              Absorb
            </ToggleButton>
            <ToggleButton id="overlay" size="sm" className="rounded-lg px-3">
              Overlay
            </ToggleButton>
          </ToggleButtonGroup>
        </div>

        {matchedPairings.length > 0 ? (
          <div className="flex flex-col gap-2">
            <Label className="text-foreground text-sm font-medium">Angle</Label>
            <ToggleButtonGroup
              aria-label="Geometry pair selection"
              selectionMode="single"
              selectedKeys={new Set([geometrySelection])}
              onSelectionChange={(keys) => {
                const next = keys.values().next().value;
                if (typeof next === "string" && next.length > 0) {
                  onGeometrySelectionChange(
                    next as SimilarityGeometrySelection,
                  );
                }
              }}
              className="flex flex-wrap gap-1"
            >
              <ToggleButton id="all" size="sm" className="rounded-lg px-3">
                All angles
              </ToggleButton>
              {matchedPairings.map((pairing) => (
                <ToggleButton
                  key={pairing.key}
                  id={pairing.key}
                  size="sm"
                  className="rounded-lg px-3"
                >
                  {pairing.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </div>
        ) : null}

        <Description className="text-muted text-xs">{description}</Description>

        {loading ? (
          <LoadingSkeleton className="h-80 w-full rounded-xl" />
        ) : plotProps && plotProps.points.length > 0 ? (
          <SpectrumPlot {...plotProps} />
        ) : (
          <div className="border-border text-muted rounded-xl border border-dashed p-6 text-sm">
            {emptyMessage}
          </div>
        )}
      </div>
    </SimilarityMetaGroup>
  );
}

/**
 * Quality / acknowledgement checklist with optional metrics rail.
 *
 * @param checks - Checklist rows.
 * @param ackedChecks - Ids marked reviewed.
 * @param onToggleAck - Updates ack state.
 * @param metrics - Optional headline metrics.
 */
export function SimilarityQualityChecklist({
  checks,
  ackedChecks,
  onToggleAck,
  metrics,
}: {
  checks: readonly SimilarityConfirmQualityCheck[];
  ackedChecks: ReadonlySet<string>;
  onToggleAck: (id: string, next: boolean) => void;
  metrics?: NexafsBrowseDatasetMetricsCardModel | null;
}) {
  return (
    <SimilarityMetaGroup title="Quality checklist">
      <div className="flex flex-col gap-3 px-3 py-3">
        {metrics && !metrics.missing ? (
          <NexafsDatasetMetricsRail metrics={metrics} />
        ) : null}
        <ul className="flex list-none flex-col gap-2 p-0">
          {checks.map((check) => (
            <li
              key={check.id}
              className={cn(
                "border-border rounded-lg border px-3 py-2 text-sm",
                check.severity === "blocker" && "border-danger/40 bg-danger/5",
                check.severity === "warn" && "border-warning/40 bg-warning/5",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-foreground font-medium">{check.title}</p>
                  <p className="text-muted text-xs leading-snug">
                    {check.detail}
                  </p>
                </div>
                {check.requiresAck ? (
                  <Checkbox
                    isSelected={ackedChecks.has(check.id)}
                    onChange={(next) => onToggleAck(check.id, next)}
                    className="items-start gap-1.5"
                  >
                    <Checkbox.Control className="mt-0.5 size-3.5">
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Checkbox.Content>
                      <span className="text-xs">Reviewed</span>
                    </Checkbox.Content>
                  </Checkbox>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </SimilarityMetaGroup>
  );
}

/**
 * Two stacked choice cards for the review footer (cancel vs continue).
 *
 * @param secondaryTitle - Left / cancel action title.
 * @param secondaryDetail - Left / cancel explanation.
 * @param onSecondary - Cancel handler.
 * @param primaryTitle - Continue action title.
 * @param primaryDetail - Continue explanation (including why disabled).
 * @param onPrimary - Continue handler.
 * @param primaryDisabled - Blocks the continue card.
 * @param primaryPending - Optional busy label on the continue card.
 * @param primaryDanger - Danger styling for persist-merge delete.
 */
export function SimilarityReviewFooter({
  secondaryTitle,
  secondaryDetail,
  onSecondary,
  primaryTitle,
  primaryDetail,
  onPrimary,
  primaryDisabled,
  primaryPending,
  primaryDanger,
}: {
  secondaryTitle: string;
  secondaryDetail: string;
  onSecondary: () => void;
  primaryTitle: string;
  primaryDetail: string;
  onPrimary: () => void;
  primaryDisabled: boolean;
  primaryPending?: boolean;
  primaryDanger?: boolean;
}) {
  return (
    <div className="border-border flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-stretch sm:justify-between">
      <button
        type="button"
        onClick={onSecondary}
        className="border-border bg-surface hover:bg-surface-secondary focus-visible:ring-accent flex flex-1 flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2"
      >
        <span className="text-foreground text-sm font-semibold">
          {secondaryTitle}
        </span>
        <span className="text-muted text-xs leading-snug">
          {secondaryDetail}
        </span>
      </button>
      <button
        type="button"
        onClick={onPrimary}
        disabled={primaryDisabled || primaryPending}
        className={cn(
          "focus-visible:ring-accent flex flex-1 flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
          primaryDanger
            ? "border-danger/40 bg-danger/15 hover:bg-danger/25"
            : "border-accent/40 bg-accent/15 hover:bg-accent/25",
        )}
      >
        <span className="text-foreground text-sm font-semibold">
          {primaryPending ? "Working…" : primaryTitle}
        </span>
        <span className="text-muted text-xs leading-snug">{primaryDetail}</span>
      </button>
    </div>
  );
}

/**
 * Attribution column body: ORCID list plus avatar stack.
 *
 * @param display - Text label.
 * @param users - Avatar users.
 */
export function SimilarityAttributionCell({
  display,
  users,
}: {
  display: string;
  users: readonly UserWithOrcid[];
}) {
  return (
    <div className="pointer-events-none flex flex-col gap-2">
      <span>{display}</span>
      {users.length > 0 ? (
        <ContributorAvatarGroup
          users={[...users]}
          size="sm"
          max={4}
          expandOnHover={false}
        />
      ) : null}
    </div>
  );
}
