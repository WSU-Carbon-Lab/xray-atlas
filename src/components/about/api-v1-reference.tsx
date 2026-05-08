"use client";

import { ChevronDownIcon, LinkIcon } from "@heroicons/react/24/outline";
import { Accordion, Button } from "@heroui/react";
import { type ReactElement, useMemo } from "react";

type RouteDoc = {
  readonly path: string;
  readonly method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  readonly description: string;
  readonly query: readonly string[];
  readonly optional: readonly string[];
};

const moleculesRoutes: readonly RouteDoc[] = [
  {
    path: "/api/v1/molecules",
    method: "GET",
    description: "List molecules with search and pagination filters.",
    query: [
      "q",
      "hasCas",
      "synonymsCountMax",
      "synonymsLimit",
      "limit",
      "offset",
    ],
    optional: [
      "q",
      "hasCas",
      "synonymsCountMax",
      "synonymsLimit",
      "limit",
      "offset",
    ],
  },
  {
    path: "/api/v1/molecules/{moleculeId}/edges",
    method: "GET",
    description:
      "Summarize edge availability for a molecule, optionally scoped by DOI.",
    query: ["doi"],
    optional: ["doi"],
  },
  {
    path: "/api/v1/molecules/search",
    method: "GET",
    description:
      "Compatibility route that 307-redirects to legacy /api/molecules/search.",
    query: ["q", "query", "search", "s", "any passthrough query params"],
    optional: ["all query parameters are optional passthrough"],
  },
];

const datasetRoutes: readonly RouteDoc[] = [
  {
    path: "/api/v1/datasets",
    method: "GET",
    description:
      "List dataset summaries filterable by molecule, edge, and DOI.",
    query: ["moleculeId", "edgeId", "doi", "limit", "offset"],
    optional: ["moleculeId", "edgeId", "doi", "limit", "offset"],
  },
  {
    path: "/api/v1/datasets/discover",
    method: "GET",
    description:
      "DOI-first dataset discovery with optional molecule or edge narrowing.",
    query: ["doi", "moleculeId", "edgeId"],
    optional: ["moleculeId", "edgeId"],
  },
  {
    path: "/api/v1/datasets/export",
    method: "GET",
    description: "Export analysis-ready table output in JSON or CSV.",
    query: ["moleculeId", "edgeId", "doi", "format", "limit"],
    optional: ["moleculeId", "edgeId", "doi", "format", "limit"],
  },
];

function MethodBadge({ method }: { method: RouteDoc["method"] }) {
  return (
    <span className="bg-accent/15 text-accent rounded px-2 py-0.5 text-xs font-semibold tracking-wide">
      {method}
    </span>
  );
}

function CopyRouteButton({ path }: { path: string }) {
  const routeUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return path;
    }
    return `${window.location.origin}${path}`;
  }, [path]);

  return (
    <Button
      size="sm"
      variant="outline"
      onPress={async () => {
        try {
          await navigator.clipboard.writeText(routeUrl);
        } catch {
          await navigator.clipboard.writeText(path);
        }
      }}
    >
      <LinkIcon className="h-4 w-4" />
      Copy URL
    </Button>
  );
}

function RouteCard({ route }: { route: RouteDoc }) {
  return (
    <div className="border-border bg-default/40 space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <MethodBadge method={route.method} />
        <code className="text-sm">{route.path}</code>
      </div>
      <p className="text-muted text-sm">{route.description}</p>
      <p className="text-muted text-sm">
        <span className="text-foreground font-medium">Authentication:</span>{" "}
        none required.
      </p>
      <p className="text-muted text-sm">
        <span className="text-foreground font-medium">Query keys:</span>{" "}
        {route.query.map((q) => `\`${q}\``).join(", ")}
      </p>
      <p className="text-muted text-sm">
        <span className="text-foreground font-medium">Optional:</span>{" "}
        {route.optional.map((q) => `\`${q}\``).join(", ")}
      </p>
      <CopyRouteButton
        path={route.path.replace("{moleculeId}", "YOUR_MOLECULE_ID")}
      />
    </div>
  );
}

interface RouteGroup {
  readonly id: string;
  readonly label: string;
  readonly routes: readonly RouteDoc[];
}

const routeGroups: readonly RouteGroup[] = [
  { id: "molecules-routes", label: "Molecules", routes: moleculesRoutes },
  { id: "datasets-routes", label: "Datasets", routes: datasetRoutes },
];

function RouteGroupTrigger({
  label,
  count,
}: {
  label: string;
  count: number;
}): ReactElement {
  return (
    <Accordion.Trigger className="hover:bg-default/40 flex w-full items-center gap-3 rounded-md px-1 py-1 text-left text-sm font-semibold transition-colors">
      <span className="min-w-0 flex-1">{label}</span>
      <span className="border-border bg-default/40 text-muted shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium">
        {count} {count === 1 ? "route" : "routes"}
      </span>
      <Accordion.Indicator>
        <ChevronDownIcon
          className="text-muted size-4 shrink-0 transition-transform"
          aria-hidden
        />
      </Accordion.Indicator>
    </Accordion.Trigger>
  );
}

export function ApiV1Reference() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <h1 className="text-foreground text-4xl font-bold">v1</h1>
      <section className="border-border bg-surface rounded-lg border p-4">
        <h2
          id="overview"
          className="text-foreground mb-2 text-lg font-semibold"
        >
          Route groups
        </h2>
        <p className="text-muted text-sm">
          This page groups public routes by domain and documents available HTTP
          methods, accepted request parameters, and direct API links. Expand a
          group below to see individual routes.
        </p>
      </section>
      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="routes" className="text-foreground mb-3 text-lg font-semibold">
          API reference
        </h2>
        <Accordion allowsMultipleExpanded variant="surface">
          {routeGroups.map((group) => (
            <Accordion.Item key={group.id} id={group.id}>
              <Accordion.Heading>
                <RouteGroupTrigger
                  label={group.label}
                  count={group.routes.length}
                />
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body className="space-y-3">
                  {group.routes.map((route) => (
                    <RouteCard key={route.path} route={route} />
                  ))}
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
