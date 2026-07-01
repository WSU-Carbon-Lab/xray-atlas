"use client";

import { Tabs } from "@heroui/react";
import Link from "next/link";
import { useCallback, useState, type ReactElement } from "react";
import type {
  GitHubRoadmapActivity,
  GitHubRoadmapItem,
} from "~/lib/github/roadmap-activity";
import {
  githubRepoDiscussionsUrl,
  githubRepoIssuesUrl,
  githubRepoPullsUrl,
} from "~/lib/github/roadmap-activity";

type GitHubTabKey = "discussions" | "issues" | "pulls";

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function GitHubLabelPill({
  label,
}: {
  label: { name: string; color: string };
}): ReactElement {
  const hex = label.color.trim();
  const background = hex.length === 6 ? `#${hex}33` : "var(--color-default)";
  return (
    <span
      className="border-border text-secondary rounded-full border px-2 py-0.5 text-[10px] font-medium"
      style={{ backgroundColor: background }}
    >
      {label.name}
    </span>
  );
}

function GitHubActivityList({
  items,
  emptyMessage,
  viewAllHref,
  viewAllLabel,
}: {
  items: GitHubRoadmapItem[];
  emptyMessage: string;
  viewAllHref: string;
  viewAllLabel: string;
}): ReactElement {
  if (items.length === 0) {
    return (
      <div className="space-y-3 py-6">
        <p className="text-muted text-sm">{emptyMessage}</p>
        <Link
          href={viewAllHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent text-sm font-medium hover:underline"
        >
          {viewAllLabel}
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-border divide-y">
      {items.map((item) => (
        <li key={item.url} className="py-3">
          <Link
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block space-y-1"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted text-xs tabular-nums">
                #{item.number}
              </span>
              <span className="text-foreground group-hover:text-accent text-sm font-medium transition-colors">
                {item.title}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {item.authorLogin ? (
                <span className="text-muted text-xs">@{item.authorLogin}</span>
              ) : null}
              <span className="text-muted text-xs">
                Updated {formatUpdatedAt(item.updatedAt)}
              </span>
              {item.labels.map((label) => (
                <GitHubLabelPill
                  key={`${item.number}-${label.name}`}
                  label={label}
                />
              ))}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Tabbed panel of recent GitHub discussions, issues, and open pull requests for the roadmap page.
 */
export function RoadmapGitHubPanel({
  activity,
}: {
  activity: GitHubRoadmapActivity;
}): ReactElement {
  const [selectedKey, setSelectedKey] = useState<GitHubTabKey>("issues");

  const handleSelectionChange = useCallback((key: React.Key) => {
    queueMicrotask(() => {
      if (key === "discussions" || key === "issues" || key === "pulls") {
        setSelectedKey(key);
      }
    });
  }, []);

  const discussionsEmpty = activity.discussionsUnavailable
    ? "Discussions are unavailable for this repository or could not be loaded. Open a thread on GitHub if discussions are enabled."
    : "No open discussions right now.";

  return (
    <section
      aria-labelledby="roadmap-github-heading"
      className="border-border bg-surface rounded-xl border p-5"
    >
      <div className="mb-4 space-y-1">
        <h2
          id="roadmap-github-heading"
          className="text-foreground text-2xl font-semibold"
        >
          Live from GitHub
        </h2>
        <p className="text-muted text-sm">
          Recent open discussions, issues, and pull requests. Refreshed about
          every ten minutes.
        </p>
      </div>

      <Tabs
        selectedKey={selectedKey}
        onSelectionChange={handleSelectionChange}
        variant="secondary"
        className="w-full"
      >
        <Tabs.ListContainer>
          <Tabs.List
            aria-label="GitHub activity"
            className="border-border bg-default inline-flex rounded-lg border p-1"
          >
            <Tabs.Tab
              id="discussions"
              className="rounded-md px-3 py-1.5 text-sm"
            >
              Discussions
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="issues" className="rounded-md px-3 py-1.5 text-sm">
              Issues
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="pulls" className="rounded-md px-3 py-1.5 text-sm">
              Pull requests
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel id="discussions" className="outline-none">
          <GitHubActivityList
            items={activity.discussions}
            emptyMessage={discussionsEmpty}
            viewAllHref={githubRepoDiscussionsUrl()}
            viewAllLabel="View all discussions on GitHub"
          />
        </Tabs.Panel>
        <Tabs.Panel id="issues" className="outline-none">
          <GitHubActivityList
            items={activity.issues}
            emptyMessage="No open issues right now."
            viewAllHref={githubRepoIssuesUrl()}
            viewAllLabel="View all issues on GitHub"
          />
        </Tabs.Panel>
        <Tabs.Panel id="pulls" className="outline-none">
          <GitHubActivityList
            items={activity.pullRequests}
            emptyMessage="No open pull requests right now."
            viewAllHref={githubRepoPullsUrl()}
            viewAllLabel="View all pull requests on GitHub"
          />
        </Tabs.Panel>
      </Tabs>

      <p className="text-muted mt-2 text-xs">
        Last fetched{" "}
        {new Date(activity.fetchedAt)
          .toISOString()
          .replace("T", " ")
          .slice(0, 16)}{" "}
        UTC
      </p>
    </section>
  );
}
