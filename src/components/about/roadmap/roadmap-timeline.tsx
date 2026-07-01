import { Chip } from "@heroui/react";
import { cn } from "@heroui/styles";
import {
  ArrowPathRoundedSquareIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import type { ReactElement } from "react";
import {
  postPublicationStages,
  prePublicationStages,
  roadmapHorizon,
  type RoadmapStage,
  type RoadmapStatus,
} from "~/lib/roadmap/roadmap-data";

const statusStyles: Record<
  RoadmapStatus,
  { dot: string; chipClass: string; dashed?: boolean }
> = {
  shipped: {
    dot: "bg-success",
    chipClass:
      "border-success/30 bg-success/10 text-success dark:border-success/40 dark:bg-success/15",
  },
  "in-progress": {
    dot: "bg-accent",
    chipClass:
      "border-accent/30 bg-accent/10 text-accent dark:border-accent/40 dark:bg-accent/15",
  },
  planned: {
    dot: "border border-border-strong bg-surface",
    chipClass: "border-border-strong text-secondary",
  },
  exploring: {
    dot: "bg-warning",
    chipClass:
      "border-warning/30 bg-warning/10 text-warning dark:border-warning/40 dark:bg-warning/15",
  },
  "open-question": {
    dot: "border border-dashed border-border-strong bg-surface",
    chipClass: "border-dashed border-border-strong text-muted",
    dashed: true,
  },
};

function RoadmapStatusChip({ stage }: { stage: RoadmapStage }): ReactElement {
  const style = statusStyles[stage.status];
  return (
    <Chip
      size="sm"
      variant="secondary"
      className={cn(
        "h-6 rounded-full px-2 text-xs font-medium",
        style.chipClass,
      )}
    >
      {stage.statusLabel}
    </Chip>
  );
}

function RoadmapStageBody({ stage }: { stage: RoadmapStage }): ReactElement {
  const muted = stage.status === "open-question";
  const textClass = muted ? "text-muted" : "text-secondary";

  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 [&::-webkit-details-marker]:hidden">
        <span
          className={cn(
            "text-lg font-semibold",
            muted ? "text-muted" : "text-foreground",
          )}
        >
          {stage.title}
        </span>
        <RoadmapStatusChip stage={stage} />
        <ChevronDownIcon
          className="text-muted ml-auto h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <p className={cn("mt-2 text-sm leading-relaxed", textClass)}>
        {stage.summary}
      </p>
      <p className={cn("mt-3 text-sm leading-relaxed", textClass)}>
        {stage.detail}
      </p>
      {stage.relatedLinks && stage.relatedLinks.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {stage.relatedLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="border-border bg-default text-foreground hover:text-accent rounded-full border px-3 py-1 text-xs font-medium transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </details>
  );
}

function RoadmapStageRow({
  stage,
  isLast,
}: {
  stage: RoadmapStage;
  isLast: boolean;
}): ReactElement {
  const style = statusStyles[stage.status];
  const isFork = stage.variant === "fork";

  return (
    <div className="flex gap-4">
      <div className="flex w-5 shrink-0 flex-col items-center">
        {isFork ? (
          <ArrowPathRoundedSquareIcon
            className="text-muted mt-1 h-4 w-4 shrink-0"
            aria-hidden
          />
        ) : (
          <span className={cn("mt-1.5 h-2.5 w-2.5 rounded-full", style.dot)} />
        )}
        {!isLast ? <span className="bg-border mt-1 w-px flex-1" /> : null}
      </div>
      <div className={cn("flex-1", isLast ? "" : "pb-10")}>
        {isFork || stage.status === "open-question" ? (
          <div
            className={cn(
              "border-border bg-surface/60 rounded-xl border p-4 opacity-90",
              isFork ? "border-dashed" : "",
            )}
          >
            {isFork ? (
              <p className="text-accent mb-2 text-xs font-semibold tracking-wide uppercase">
                Resolve before publication
              </p>
            ) : null}
            <RoadmapStageBody stage={stage} />
          </div>
        ) : (
          <RoadmapStageBody stage={stage} />
        )}
      </div>
    </div>
  );
}

function RoadmapHorizonBand(): ReactElement {
  return (
    <div
      className="border-accent/40 bg-accent/5 relative my-2 rounded-xl border px-5 py-6"
      aria-label={`Publication horizon: ${roadmapHorizon.title}`}
    >
      <div className="space-y-4">
        <div>
          <p className="text-accent text-xs font-semibold tracking-wide uppercase">
            {roadmapHorizon.monthLabel}
          </p>
          <h2 className="text-foreground mt-1 text-xl font-semibold">
            {roadmapHorizon.title}
          </h2>
        </div>
        <div className="border-accent/20 grid gap-4 border-t pt-4 sm:grid-cols-2 sm:gap-6">
          <div>
            <p className="text-accent mb-1.5 text-xs font-semibold tracking-wide uppercase">
              Before
            </p>
            <p className="text-secondary text-sm leading-snug">
              {roadmapHorizon.preCaption}
            </p>
          </div>
          <div>
            <p className="text-accent mb-1.5 text-xs font-semibold tracking-wide uppercase">
              After
            </p>
            <p className="text-secondary text-sm leading-snug">
              {roadmapHorizon.postCaption}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the publication-aware vertical roadmap: pre-publication work, horizon marker,
 * post-publication integrations, and institutional fork cards.
 */
export function RoadmapTimeline(): ReactElement {
  return (
    <section aria-labelledby="roadmap-timeline-heading" className="space-y-2">
      <h2
        id="roadmap-timeline-heading"
        className="text-foreground mb-6 text-2xl font-semibold"
      >
        Platform timeline
      </h2>

      <div>
        <p className="text-muted mb-4 text-sm font-medium tracking-wide uppercase">
          Before publication
        </p>
        {prePublicationStages.map((stage) => (
          <RoadmapStageRow key={stage.id} stage={stage} isLast={false} />
        ))}
      </div>

      <div className="py-2 pl-9">
        <RoadmapHorizonBand />
      </div>

      <div>
        <p className="text-muted mb-4 text-sm font-medium tracking-wide uppercase">
          After publication
        </p>
        {postPublicationStages.map((stage, index) => (
          <RoadmapStageRow
            key={stage.id}
            stage={stage}
            isLast={index === postPublicationStages.length - 1}
          />
        ))}
      </div>
    </section>
  );
}
