import Link from "next/link";
import { buttonVariants, cn } from "@heroui/styles";

/**
 * Sandbox index: links to experimental tools on dedicated sub-routes.
 */
export default function SandboxPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Sandbox
        </h1>
        <p className="text-muted mt-2 max-w-2xl text-sm">
          Try in-progress UI and workflows in one place. Access is limited to
          development sessions and accounts with Labs or user administration
          capability in production. Nothing here is guaranteed to be stable.
        </p>
      </div>

      <section
        className="border-border bg-surface rounded-lg border p-6"
        aria-labelledby="sandbox-tools-heading"
      >
        <h2
          id="sandbox-tools-heading"
          className="text-foreground text-sm font-medium"
        >
          Tools
        </h2>
        <ul className="text-muted mt-3 list-disc space-y-2 pl-5 text-sm">
          <li>
            <Link
              href="/sandbox/color-selector"
              className="text-accent hover:underline"
            >
              Hex color selector
            </Link>
          </li>
          <li>
            <Link
              href="/sandbox/molecule-structure"
              className="text-accent hover:underline"
            >
              Molecule structure lab
            </Link>
          </li>
        </ul>
        <div className="mt-6">
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            Back to home
          </Link>
        </div>
      </section>
    </div>
  );
}
