import type { Metadata } from "next";
import { site } from "~/app/brand";

export const metadata: Metadata = {
  title: "API OpenAPI contract",
  description: `OpenAPI contract and governance workflow for ${site.name} API routes.`,
  alternates: {
    canonical: "/wiki/api/openapi",
  },
};

export default function ApiOpenApiPage() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <h1 className="text-foreground text-4xl font-bold">OpenAPI</h1>
      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="openapi-contract" className="text-foreground mb-2 text-lg font-semibold">
          Source of truth
        </h2>
        <p className="text-muted text-sm leading-relaxed">
          The contract is served from <code>GET /api/v1/openapi</code>. Use{" "}
          <code>?format=yaml</code> for YAML output and default JSON for tooling integration.
        </p>
      </section>
      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="workflow" className="text-foreground mb-2 text-lg font-semibold">
          Recommended process aligned with OpenAPI guidance
        </h2>
        <ol className="text-muted ml-6 list-decimal space-y-2 text-sm">
          <li>Define or update path, parameters, and response schemas in OpenAPI first.</li>
          <li>Review naming consistency, status codes, and error responses before coding.</li>
          <li>Implement or adjust route handlers to match operation contracts exactly.</li>
          <li>Validate examples and ensure they are executable for client onboarding.</li>
          <li>Update route pages under <code>/wiki/api/*</code> after implementation changes.</li>
        </ol>
      </section>
      <section className="border-border bg-surface rounded-lg border p-4">
        <h2 id="public-access" className="text-foreground mb-2 text-lg font-semibold">
          Non-authenticated access policy
        </h2>
        <p className="text-muted text-sm leading-relaxed">
          The researcher routes documented in this API section are intentionally public read
          endpoints. Any future authenticated routes should be documented separately with explicit
          token/session requirements and authorization semantics.
        </p>
      </section>
    </div>
  );
}
