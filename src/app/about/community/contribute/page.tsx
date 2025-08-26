import React from "react";
import Link from "next/link";
import RecentIssues from "../_components/recent-issues";

export default function ContributePage() {
  return (
    <div className="prose prose-lg max-w-none">
      <h1>How to Contribute to Xray Atlas</h1>
      <p>
        We welcome and appreciate all contributions from the community. Whether
        you're fixing a bug, adding a new feature, or improving documentation,
        your help is valuable. Here’s a guide on how to get started.
      </p>

      <h2>Getting Started</h2>
      <p>
        Xray Atlas is an open-source project hosted on GitHub. The website front
        end is built with the{" "}
        <Link
          href="https://nextjs.org/docs/app"
          className="text-wsu-crimson hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Next.js App Router framework
        </Link>
        . The backend is powered by a REST API built with AWS API Gateway
        serving data from a S3 Bucket. To get started, you will need to first
        install the latest version of Node.js and Git on your local machine.
      </p>

      <h2>Contribution Workflow</h2>
      <ol className="list-decimal pl-6">
        <li>
          <h3>Find an Issue to Work On</h3>
          <p>
            The best place to start is our GitHub Issues page. You can look for
            bugs, feature requests, or documentation updates. We often label
            issues that are great for new contributors.
          </p>
          <RecentIssues />
        </li>
        <li>
          <h3>Create a New Issue</h3>
          <p>
            If you've found a new bug or have an idea for a new feature, please
            create a new issue. This allows the community to discuss the
            proposed changes.
          </p>
          <Link
            href="https://github.com/WSU-Carbon-Lab/xray-atlas/issues/new/choose"
            className="text-wsu-crimson hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Create a New Issue
          </Link>
        </li>
        <li>
          <h3>Fork the Repository</h3>
          <p>
            Once you're ready to start coding, create your own fork of the Xray
            Atlas repository. This gives you a personal copy to work with.
          </p>
        </li>
        <li>
          <h3>Make Your Changes</h3>
          <p>
            Create a new branch in your forked repository for your changes. This
            keeps your work organized and separate from the main branch.
          </p>
        </li>
        <li>
          <h3>Submit a Pull Request (PR)</h3>
          <p>
            When your changes are complete, submit a pull request from your
            branch to the main Xray Atlas repository. The maintainers will
            review your PR, provide feedback, and merge it once it's ready.
          </p>
        </li>
      </ol>
    </div>
  );
}
