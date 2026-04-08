import Link from "next/link";
import { buttonVariants, cn } from "@heroui/styles";

/**
 * Landing surface for in-app preview and experimental tooling. Add sandbox-only
 * routes or widgets here as they are implemented.
 */
export default function SandboxPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Sandbox
        </h1>
        <p className="text-muted mt-2 text-sm">
          Use this area to try UI and workflows before they ship to the main app.
          Nothing here is guaranteed to be stable.
        </p>
      </div>
      <div className="border-border bg-surface rounded-lg border p-6">
        <p className="text-muted text-sm">
          No sandbox modules are mounted yet. Link new tools from this page as
          you add them.
        </p>
        <div className="mt-4">
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
