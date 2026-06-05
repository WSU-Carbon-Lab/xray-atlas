"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";
import { cn } from "@heroui/styles";
import { Trash2 } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";
import { SimpleDialog } from "~/components/ui/dialog";
import type { AppRouter } from "~/server/api/root";
import { showToast } from "~/components/ui/toast";
import { ALS_5322_INSTRUMENT_LABEL } from "~/lib/dashboard-processing-session";
import { trpc } from "~/trpc/client";

type DashboardRecentSessionRowProps = {
  session: inferRouterOutputs<AppRouter>["dashboardSessions"]["list"][number];
};

/**
 * One resumable processing session row with a confirmed delete action.
 */
export function DashboardRecentSessionRow({
  session,
}: DashboardRecentSessionRowProps) {
  const utils = trpc.useUtils();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const deleteMutation = trpc.dashboardSessions.delete.useMutation({
    onMutate: async () => {
      await utils.dashboardSessions.list.cancel();
      const previous = utils.dashboardSessions.list.getData();
      utils.dashboardSessions.list.setData(undefined, (current) =>
        current?.filter((row) => row.id !== session.id),
      );
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        utils.dashboardSessions.list.setData(undefined, context.previous);
      }
      showToast(error.message, "error");
    },
    onSuccess: () => {
      showToast("Session deleted", "success");
      setConfirmOpen(false);
    },
    onSettled: async () => {
      await utils.dashboardSessions.list.invalidate();
    },
  });

  const sessionLabel =
    session.stepMetadata.workspace?.folderRootName ??
    session.title ??
    "Untitled session";

  return (
    <>
      <div className="border-border hover:bg-default/40 flex items-center gap-3 rounded-md border px-4 py-3 transition-colors">
        <Link
          href={`/dashboard/instruments/als-5322?session=${session.id}`}
          className="min-w-0 flex-1"
        >
          <p className="text-foreground truncate text-sm font-medium">
            {sessionLabel}
          </p>
          <p className="text-muted text-xs">
            {session.stepMetadata.workspace?.beamtimeName ??
              ALS_5322_INSTRUMENT_LABEL}
          </p>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <time
            className="text-muted text-xs tabular-nums"
            dateTime={new Date(session.updatedAt).toISOString()}
          >
            {new Date(session.updatedAt).toLocaleString()}
          </time>
          <div
            className="shrink-0"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label="Delete processing session"
              isDisabled={deleteMutation.isPending}
              className={cn(
                "text-(--text-secondary) hover:text-danger hover:bg-danger/10",
                "min-h-8 min-w-8 border border-(--border-default)",
              )}
              onPress={() => setConfirmOpen(true)}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </div>

      <SimpleDialog
        isOpen={confirmOpen}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setConfirmOpen(false);
          }
        }}
        title="Delete processing session?"
      >
        <div className="space-y-4 text-left">
          <p className="text-muted text-sm leading-relaxed">
            Remove{" "}
            <span className="text-foreground font-medium">{sessionLabel}</span>{" "}
            from your recent work list. Local browser cache for this session is
            not recovered after deletion.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onPress={() => setConfirmOpen(false)}
              isDisabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onPress={() => deleteMutation.mutate({ sessionId: session.id })}
              isDisabled={deleteMutation.isPending}
            >
              Delete session
            </Button>
          </div>
        </div>
      </SimpleDialog>
    </>
  );
}
