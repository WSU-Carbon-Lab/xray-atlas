import React from "react";
import Link from "next/link";
import RecentIssues from "../_components/recent-issues";
import { CodeBlock } from "~/app/_components/ui/code-block";

/**
 * Contribute page – surface previous docstring content directly in UX.
 * (Original long JSDoc moved into rendered page for discoverability.)
 */
export default function ContributePage() {
  return (
    <div className="prose prose-lg max-w-none">
      <h1 className="mb-2">How to Contribute to Xray Atlas</h1>
      <p className="lead">
        Thanks for your interest in improving Xray Atlas. This guide walks you
        through discovering work, proposing changes, forking, branching,
        committing, and opening effective Pull Requests (PRs).
      </p>

      <div className="not-prose mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-md border border-neutral-200 bg-white/60 p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <h3 className="mt-0 text-base font-semibold tracking-wide text-wsu-crimson">
            Quick Links
          </h3>
          <ul className="m-0 list-none space-y-2 p-0 text-sm">
            <li>
              <Link
                href="https://github.com/WSU-Carbon-Lab/xray-atlas"
                className="hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Repository (GitHub)
              </Link>
            </li>
            <li>
              <Link
                href="https://github.com/WSU-Carbon-Lab/xray-atlas/issues"
                className="hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Issues
              </Link>
            </li>
            <li>
              <Link
                href="https://github.com/WSU-Carbon-Lab/xray-atlas/issues/new/choose"
                className="hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Create New Issue
              </Link>
            </li>
            <li>
              <Link
                href="https://docs.github.com/en/get-started/quickstart/fork-a-repo"
                className="hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Forking Guide
              </Link>
            </li>
          </ul>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white/60 p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <h3 className="mt-0 text-base font-semibold tracking-wide text-wsu-crimson">
            Tech Stack
          </h3>
          <p className="m-0 text-sm">
            Front end:{" "}
            <Link
              href="https://nextjs.org/docs/app"
              className="text-wsu-crimson hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Next.js App Router
            </Link>
            . Backend: AWS API Gateway + S3 (REST). Package manager: pnpm (or
            npm).
          </p>
        </div>
      </div>

      <h2 className="mt-10">Engage With the Project</h2>
      <ol className="list-decimal pl-6">
        <li>
          <h3 className="mb-1">Find an Issue</h3>
          <p className="mt-0">
            Browse open issues for bugs, enhancements, or documentation tasks.
            Look for labels like good first issue or help wanted.
          </p>
          <div className="not-prose rounded-md border-l-4 border-wsu-crimson/70 bg-neutral-50 p-4 text-sm dark:bg-neutral-900">
            <p className="m-0 font-medium text-wsu-crimson">
              Recently Updated Issues
            </p>
            <RecentIssues />
          </div>
        </li>
        <li>
          <h3 className="mb-1">Discuss or Propose Work</h3>
          <p className="mt-0">
            If no existing issue covers what you want to do, open one before
            investing significant time. Clear intent reduces duplicate effort.
          </p>
          <Link
            href="https://github.com/WSU-Carbon-Lab/xray-atlas/issues/new/choose"
            className="text-wsu-crimson underline-offset-4 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open a New Issue
          </Link>
        </li>
        <li>
          <h3 className="mb-1">Fork the Repository</h3>
          <p className="mt-0">
            Use the Fork button on GitHub. Your fork (origin) is your sandbox;
            the canonical repository is upstream.
          </p>
        </li>
        <li>
          <h3 className="mb-1">Clone & Configure Remotes</h3>
          <p className="mt-0">HTTPS example:</p>
          <CodeBlock language="bash">
            {`# 1. Fork via GitHub UI (creates https://github.com/<you>/xray-atlas)
git clone https://github.com/<your-username>/xray-atlas.git
cd xray-atlas

# 2. Add upstream (canonical repo)
git remote add upstream https://github.com/WSU-Carbon-Lab/xray-atlas.git
git remote -v  # verify origin + upstream`}
          </CodeBlock>
          <details>
            <summary className="cursor-pointer text-sm font-medium text-wsu-crimson">
              Prefer SSH?
            </summary>
            <div className="mt-2">
              <CodeBlock language="bash">
                {`git clone git@github.com:<your-username>/xray-atlas.git
git remote add upstream git@github.com:WSU-Carbon-Lab/xray-atlas.git`}
              </CodeBlock>
            </div>
          </details>
        </li>
        <li>
          <h3 className="mb-1">Create a Feature Branch</h3>
          <CodeBlock language="bash">
            {`git checkout -b feat/improve-contribute-docs`}
          </CodeBlock>
        </li>
        <li>
          <h3 className="mb-1">Develop Locally</h3>
          <p className="mt-0">
            After cloning locally, install dependencies and start the dev server
            using npm. To do this you will need to have installed Node.js and
            npm on your machine. You can also use pnpm if you prefer, and can
            find those instructions in the pnpm documentation.
          </p>
          <CodeBlock language="bash">
            {`# Install dependencies
npm install   # or: pnpm install

# Start dev server
npm run dev   # or: pnpm dev

# Visit
http://localhost:3000`}
          </CodeBlock>
        </li>
        <li>
          <h3 className="mb-1">Commit with Clear Messages</h3>
          <p className="mt-0">
            Keep commits focused. Conventional style (optional) helps scanning:
          </p>
          <CodeBlock language="bash">
            {`git add .
git commit -m "feat(docs): expand contributing guide with fork workflow"`}
          </CodeBlock>
        </li>
        <li>
          <h3 className="mb-1">Push & Open a Pull Request</h3>
          <CodeBlock language="bash">
            {`git push -u origin feat/improve-contribute-docs`}
          </CodeBlock>
          <p className="mt-0">
            Before opening a PR in the upstream main repo, you should ensure
            that your branch is up to date with the latest changes from upstream
            main. Also ensure that your changes will compile and pass the ESLint
            checks. Run <code>npm run build</code> to verify that it is passing.
          </p>
          <CodeBlock language="bash">
            {`npm run build
# EXAMPLE OUTPUT:
> xray-atlas@0.1.0 build
> next build

   ▲ Next.js 15.5.0

   Creating an optimized production build ...
 ✓ Compiled successfully in 10.6s
 ✓ Linting and checking validity of types
 ✓ Collecting page data
 ✓ Generating static pages (11/11)
 ✓ Collecting build traces
 ✓ Finalizing page optimization
 ...
`}
          </CodeBlock>
        </li>
        <li>
          <h3 className="mb-1">Keep Your Fork Updated</h3>
          <CodeBlock language="bash">
            {`git checkout main
git fetch upstream
git rebase upstream/main
git push origin main --force-with-lease  # only if rebased`}
          </CodeBlock>
        </li>
      </ol>

      <h2 className="mt-12">Tips for Effective Contributions</h2>
      <ul>
        <li>Open an issue before large refactors.</li>
        <li>Prefer small, reviewable PRs over sweeping changes.</li>
        <li>Document new components or utilities briefly.</li>
        <li>Automate formatting (e.g., via a pre-commit hook) if available.</li>
      </ul>

      <div className="not-prose mt-8 rounded-md border-l-4 border-wsu-crimson/80 bg-neutral-50 p-4 text-sm dark:bg-neutral-900">
        <p className="m-0">
          Need help? Ask clarifying questions on the issue before starting.
          Clear expectations reduce rework.
        </p>
      </div>

      <h2 className="mt-12">Ready to Start?</h2>
      <p>
        Pick an issue, fork the repo, and begin. Your effort helps expand the
        ecosystem and improve data accessibility for everyone.
      </p>
      <p className="text-sm text-neutral-500">
        See also:{" "}
        <Link
          href="https://docs.github.com/en/get-started/quickstart/fork-a-repo"
          target="_blank"
          rel="noopener noreferrer"
          className="text-wsu-crimson hover:underline"
        >
          GitHub Forking Guide
        </Link>
      </p>
    </div>
  );
}
