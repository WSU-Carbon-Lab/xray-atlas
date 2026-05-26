"use client";

import type { ReactNode } from "react";
import { Button, Tooltip } from "@heroui/react";
import { cn } from "@heroui/styles";
import { ArrowLeftRight, Trash2 } from "lucide-react";

export type ProfileDangerZoneRailProps = {
  subjectLabel: string;
  onDelete?: () => void;
  onTransfer?: () => void;
  deleteDisabled?: boolean;
  transferDisabled?: boolean;
  showDelete?: boolean;
  showTransfer?: boolean;
  /** Additional manage actions rendered below delete/transfer (e.g. leave collector). */
  extraActions?: ReactNode;
};

/**
 * Vertical manage rail for profile contribution rows; mirrors molecule profile danger UX.
 */
export function ProfileDangerZoneRail({
  subjectLabel,
  onDelete,
  onTransfer,
  deleteDisabled = false,
  transferDisabled = false,
  showDelete = true,
  showTransfer = true,
  extraActions,
}: ProfileDangerZoneRailProps) {
  const hasExtraActions = extraActions != null;
  const showDeleteAction = showDelete && onDelete != null;
  const showTransferAction = showTransfer && onTransfer != null;
  const transferIsLast = showTransferAction && !hasExtraActions;
  const deleteIsLast =
    showDeleteAction && !showTransferAction && !hasExtraActions;
  const deleteIsFirst = showDeleteAction;

  return (
    <div className="border-border bg-surface flex h-full w-11 flex-col overflow-hidden rounded-lg border">
      {showDeleteAction ? (
        <Tooltip delay={0}>
          <Tooltip.Trigger>
            <span className="inline-flex h-11 w-11 flex-none">
              <Button
                isIconOnly
                aria-label={`Delete ${subjectLabel}`}
                onPress={onDelete}
                size="sm"
                variant="danger"
                className={cn(
                  "h-11 w-11 rounded-none",
                  deleteIsFirst && "rounded-t-lg",
                  deleteIsLast && "rounded-b-lg",
                )}
                isDisabled={deleteDisabled}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content placement="right top">
            Delete {subjectLabel}
          </Tooltip.Content>
        </Tooltip>
      ) : null}
      {showTransferAction ? (
        <>
          {showDeleteAction ? (
            <div className="border-border h-px w-full border-t" />
          ) : null}
          <Tooltip delay={0}>
            <Tooltip.Trigger>
              <span className="inline-flex h-11 w-11 flex-none">
                <Button
                  isIconOnly
                  aria-label={`Transfer ownership of ${subjectLabel}`}
                  onPress={onTransfer}
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "text-warning h-11 w-11 rounded-none",
                    !showDeleteAction && "rounded-t-lg",
                    transferIsLast && "rounded-b-lg",
                  )}
                  isDisabled={transferDisabled}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content placement="right top">
              Transfer {subjectLabel}
            </Tooltip.Content>
          </Tooltip>
        </>
      ) : null}
      {extraActions}
    </div>
  );
}
