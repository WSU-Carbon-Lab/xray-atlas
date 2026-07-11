/**
 * Formats Zenodo citation audit JSON for CI summaries and PR comments.
 */

import type { ZenodoDatasetValidationIssue } from "~/server/zenodo/validate-zenodo-dataset-metadata";

export interface ZenodoCitationAuditEntry {
  experimentId: string;
  atlasDatasetId: string | null;
  doi: string | null;
  zenodoDepositionId: number | null;
  issues: ZenodoDatasetValidationIssue[];
  plannedAction: "metadata_sync" | "none";
  expectedTitle: string | null;
  remoteTitle: string | null;
}

export interface ZenodoCitationAuditReport {
  generatedAt: string;
  mode: "audit" | "apply" | "refresh";
  totalPublished: number;
  requiredUpdateCount: number;
  requiredUpdates: ZenodoCitationAuditEntry[];
  passed: ZenodoCitationAuditEntry[];
}

/**
 * Builds a markdown summary for PR comments from an audit report.
 *
 * @param report - Structured audit output from `zenodo:audit`.
 * @returns Markdown body suitable for `gh pr comment`.
 */
export function formatZenodoCitationAuditMarkdown(
  report: ZenodoCitationAuditReport,
): string {
  const lines: string[] = [
    "## Zenodo citation audit",
    "",
    `Generated: \`${report.generatedAt}\``,
    "",
    `- Published deposits checked: **${report.totalPublished}**`,
    `- Updates required: **${report.requiredUpdateCount}**`,
    "",
  ];

  if (report.requiredUpdateCount === 0) {
    lines.push("All published Zenodo deposits match Atlas citation contracts.");
    lines.push("");
    lines.push(
      "To re-run apply later: Actions → **Zenodo citation** → Run workflow → **apply**.",
    );
    return lines.join("\n");
  }

  lines.push("### Required updates");
  lines.push("");
  lines.push("| Atlas id | DOI | Issues | Planned action |");
  lines.push("| --- | --- | --- | --- |");
  for (const entry of report.requiredUpdates) {
    const atlas = entry.atlasDatasetId ?? "—";
    const doi = entry.doi ?? "—";
    const issueText = entry.issues
      .map((issue) => `\`${issue.code}\`: ${issue.message}`)
      .join("<br>");
    lines.push(
      `| \`${atlas}\` | \`${doi}\` | ${issueText} | \`${entry.plannedAction}\` |`,
    );
  }
  lines.push("");
  lines.push(
    "Apply these updates from this PR branch: Actions → **Zenodo citation** → Run workflow → choose **apply** (requires `ZENODO_ACCESS_TOKEN` and the `zenodo-apply` environment).",
  );
  return lines.join("\n");
}
