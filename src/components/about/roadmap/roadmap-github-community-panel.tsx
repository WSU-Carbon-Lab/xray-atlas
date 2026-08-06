"use client";

/**
 * Unified roadmap community panel: changelog, bugs, discussions, and open PRs.
 */

import { Tabs } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactElement } from "react";
import type {
  GitHubChangelogActivity,
  GitHubChangelogContributor,
  GitHubChangelogEntry,
} from "~/lib/github/changelog-activity";
import { githubRepoMergedPullsUrl } from "~/lib/github/changelog-activity";
import type {
  GitHubRoadmapActivity,
  GitHubRoadmapItem,
} from "~/lib/github/roadmap-activity";
import {
  githubRepoDiscussionsUrl,
  githubRepoIssuesUrl,
  githubRepoPullsUrl,
} from "~/lib/github/roadmap-activity";

const COMMUNITY_TAB_KEYS = [
  "changelog",
  "bugs",
  "discussions",
  "pulls",
] as const;

type CommunityTabKey = (typeof COMMUNITY_TAB_KEYS)[number];

function isCommunityTabKey(key: string): key is CommunityTabKey {
  return (COMMUNITY_TAB_KEYS as readonly string[]).includes(key);
}

function tabKeyFromHash(hash: string): CommunityTabKey {
  const normalized = hash.replace(/^#/, "").toLowerCase();
  if (normalized === "issues") {
    return "bugs";
  }
  if (isCommunityTabKey(normalized)) {
    return normalized;
  }
  return "changelog";
}

function formatDate(iso: string): string {
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

function ContributorAvatars({
  contributors,
}: {
  contributors: readonly GitHubChangelogContributor[];
}): ReactElement {
  if (contributors.length === 0) {
    return (
      <span className="text-muted text-xs">No human contributors listed</span>
    );
  }

  return (
    <ul className="flex flex-wrap items-center gap-2">
      {contributors.map((contributor) => (
        <li key={contributor.login}>
          <Link
            href={contributor.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-accent inline-flex items-center gap-1.5 text-xs transition-colors"
          >
            <Image
              src={contributor.avatarUrl}
              alt=""
              width={20}
              height={20}
              className="border-border h-5 w-5 rounded-full border"
              unoptimized
            />
            <span>@{contributor.login}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function EmptyActivityState({
  message,
  viewAllHref,
  viewAllLabel,
}: {
  message: string;
  viewAllHref: string;
  viewAllLabel: string;
}): ReactElement {
  return (
    <div className="space-y-3 py-6">
      <p className="text-muted text-sm">{message}</p>
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

function ActivityList({
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
      <EmptyActivityState
        message={emptyMessage}
        viewAllHref={viewAllHref}
        viewAllLabel={viewAllLabel}
      />
    );
  }

  return (
    <div className="space-y-3">
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
                  <span className="text-muted text-xs">
                    @{item.authorLogin}
                  </span>
                ) : null}
                <span className="text-muted text-xs">
                  Updated {formatDate(item.updatedAt)}
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

function ChangelogList({
  changelog,
}: {
  changelog: GitHubChangelogActivity;
}): ReactElement {
  const viewAllHref = githubRepoMergedPullsUrl();

  if (changelog.unavailable) {
    return (
      <EmptyActivityState
        message="Changelog could not be loaded from GitHub right now."
        viewAllHref={viewAllHref}
        viewAllLabel="View merged pull requests on GitHub"
      />
    );
  }

  if (changelog.entries.length === 0) {
    return (
      <EmptyActivityState
        message="No merged pull requests to show yet."
        viewAllHref={viewAllHref}
        viewAllLabel="View merged pull requests on GitHub"
      />
    );
  }

  return (
    <div className="space-y-3">
      <ul className="divide-border divide-y">
        {changelog.entries.map((entry: GitHubChangelogEntry) => (
          <li key={entry.url} className="py-3">
            <div className="space-y-2">
              <Link
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex flex-wrap items-center gap-2"
              >
                <span className="text-muted text-xs tabular-nums">
                  #{entry.number}
                </span>
                <span className="text-foreground group-hover:text-accent text-sm font-medium transition-colors">
                  {entry.title}
                </span>
              </Link>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-muted text-xs">
                  Merged {formatDate(entry.mergedAt)}
                </span>
                <ContributorAvatars contributors={entry.contributors} />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <Link
        href={viewAllHref}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent text-sm font-medium hover:underline"
      >
        View all merged pull requests on GitHub
      </Link>
    </div>
  );
}

function latestFetchedAt(
  activity: GitHubRoadmapActivity,
  changelog: GitHubChangelogActivity,
): string {
  const activityMs = Date.parse(activity.fetchedAt);
  const changelogMs = Date.parse(changelog.fetchedAt);
  const latest =
    Number.isFinite(activityMs) && Number.isFinite(changelogMs)
      ? Math.max(activityMs, changelogMs)
      : Number.isFinite(changelogMs)
        ? changelogMs
        : activityMs;
  if (!Number.isFinite(latest)) {
    return changelog.fetchedAt;
  }
  return new Date(latest).toISOString();
}

/**
 * Community activity panel for the roadmap page: merged changelog plus open
 * bugs, discussions, and pull requests in one tabbed surface.
 */
export function RoadmapGitHubCommunityPanel({
  activity,
  changelog,
}: {
  activity: GitHubRoadmapActivity;
  changelog: GitHubChangelogActivity;
}): ReactElement {
  const [selectedKey, setSelectedKey] = useState<CommunityTabKey>("changelog");

  useEffect(() => {
    const applyHash = (): void => {
      setSelectedKey(tabKeyFromHash(window.location.hash));
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => {
      window.removeEventListener("hashchange", applyHash);
    };
  }, []);

  const handleSelectionChange = useCallback((key: React.Key) => {
    const next = String(key);
    if (!isCommunityTabKey(next)) {
      return;
    }
    queueMicrotask(() => {
      setSelectedKey(next);
      const nextHash = `#${next}`;
      if (window.location.hash !== nextHash) {
        window.history.replaceState(null, "", nextHash);
      }
    });
  }, []);

  const discussionsEmpty = activity.discussionsUnavailable
    ? "Discussions are unavailable for this repository or could not be loaded. Open a thread on GitHub if discussions are enabled."
    : "No open discussions right now.";

  const fetchedAt = latestFetchedAt(activity, changelog);

  return (
    <section
      id="changelog"
      aria-label="GitHub community activity"
      className="border-border bg-surface scroll-mt-24 rounded-xl border p-5"
    >
      <p className="text-muted mb-5 text-sm">
        Changelog of merges to main, open bugs, discussions, and pull requests.
        Refreshed about every ten minutes.
      </p>

      <Tabs
        selectedKey={selectedKey}
        onSelectionChange={handleSelectionChange}
        variant="secondary"
        className="w-full"
      >
        <Tabs.ListContainer>
          <Tabs.List
            aria-label="GitHub community activity"
            className="border-border bg-default inline-flex max-w-full rounded-lg border p-1"
          >
            <Tabs.Tab id="changelog" className="rounded-md px-3 py-1.5 text-sm">
              Changelog
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="bugs" className="rounded-md px-3 py-1.5 text-sm">
              Bugs
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab
              id="discussions"
              className="rounded-md px-3 py-1.5 text-sm"
            >
              Discussions
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="pulls" className="rounded-md px-3 py-1.5 text-sm">
              Pull requests
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel id="changelog" className="outline-none">
          <ChangelogList changelog={changelog} />
        </Tabs.Panel>
        <Tabs.Panel id="bugs" className="outline-none">
          <ActivityList
            items={activity.issues}
            emptyMessage="No open bugs or issues right now."
            viewAllHref={githubRepoIssuesUrl()}
            viewAllLabel="View all issues on GitHub"
          />
        </Tabs.Panel>
        <Tabs.Panel id="discussions" className="outline-none">
          <ActivityList
            items={activity.discussions}
            emptyMessage={discussionsEmpty}
            viewAllHref={githubRepoDiscussionsUrl()}
            viewAllLabel="View all discussions on GitHub"
          />
        </Tabs.Panel>
        <Tabs.Panel id="pulls" className="outline-none">
          <ActivityList
            items={activity.pullRequests}
            emptyMessage="No open pull requests right now."
            viewAllHref={githubRepoPullsUrl()}
            viewAllLabel="View all pull requests on GitHub"
          />
        </Tabs.Panel>
      </Tabs>

      <p className="text-muted mt-3 text-xs">
        Last fetched{" "}
        {new Date(fetchedAt).toISOString().replace("T", " ").slice(0, 16)} UTC
      </p>
    </section>
  );
}
