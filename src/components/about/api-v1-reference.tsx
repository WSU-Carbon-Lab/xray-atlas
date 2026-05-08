"use client";

import { LinkIcon } from "@heroicons/react/24/outline";
import { Accordion, Button } from "@heroui/react";
import { useMemo } from "react";

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
    query: ["q", "hasCas", "synonymsCountMax", "synonymsLimit", "limit", "offset"],
    optional: ["q", "hasCas", "synonymsCountMax", "synonymsLimit", "limit", "offset"],
  },
  {
    path: "/api/v1/molecules/{moleculeId}/edges",
    method: "GET",
    description: "Summarize edge availability for a molecule, optionally scoped by DOI.",
    query: ["doi"],
    optional: ["doi"],
  },
  {
    path: "/api/v1/molecules/search",
    method: "GET",
    description: "Compatibility route that 307-redirects to legacy /api/molecules/search.",
    query: ["q", "query", "search", "s", "any passthrough query params"],
    optional: ["all query parameters are optional passthrough"],
  },
];

const datasetRoutes: readonly RouteDoc[] = [
  {
    path: "/api/v1/datasets",
    method: "GET",
    description: "List dataset summaries filterable by molecule, edge, and DOI.",
    query: ["moleculeId", "edgeId", "doi", "limit", "offset"],
    optional: ["moleculeId", "edgeId", "doi", "limit", "offset"],
  },
  {
    path: "/api/v1/datasets/discover",
    method: "GET",
    description: "DOI-first dataset discovery with optional molecule or edge narrowing.",
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
    <span className="rounded bg-accent/15 px-2 py-0.5 text-xs font-semibold tracking-wide text-accent">
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
        <span className="text-foreground font-medium">Authentication:</span> none required.
      </p>
      <p className="text-muted text-sm">
        <span className="text-foreground font-medium">Query keys:</span>{" "}
        {route.query.map((q) => `\`${q}\``).join(", ")}
      </p>
      <p className="text-muted text-sm">
        <span className="text-foreground font-medium">Optional:</span>{" "}
        {route.optional.map((q) => `\`${q}\``).join(", ")}
      </p>
      <CopyRouteButton path={route.path.replace("{moleculeId}", "YOUR_MOLECULE_ID")} />
    </div>
  );
}

export function ApiV1Reference() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <h1 className="text-foreground text-4xl font-bold">v1</h1>
      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="overview" className="text-foreground mb-2 text-lg font-semibold">
          Route groups
        </h2>
        <p className="text-muted text-sm">
          This page groups public routes by domain and documents available HTTP methods, accepted
          request parameters, and direct API links.
        </p>
      </section>
      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="routes" className="text-foreground mb-3 text-lg font-semibold">
          API reference
        </h2>
        <Accordion allowsMultipleExpanded variant="surface">
          <Accordion.Item id="molecules-routes">
            <Accordion.Heading>
              <Accordion.Trigger className="font-medium">Molecules</Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="space-y-3">
                {moleculesRoutes.map((route) => (
                  <RouteCard key={route.path} route={route} />
                ))}
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item id="datasets-routes">
            <Accordion.Heading>
              <Accordion.Trigger className="font-medium">Datasets</Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="space-y-3">
                {datasetRoutes.map((route) => (
                  <RouteCard key={route.path} route={route} />
                ))}
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </section>
    </div>
  );
}
