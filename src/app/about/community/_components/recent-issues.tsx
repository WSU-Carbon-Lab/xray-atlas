import { ExternalLink } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/app/_components/ui/card";

interface Issue {
  id: number;
  html_url: string;
  title: string;
  number: number;
  user: {
    login: string;
    html_url: string;
  };
  created_at: string;
  labels: {
    name: string;
    color: string;
  }[];
}

async function getRecentIssues(): Promise<Issue[]> {
  try {
    const res = await fetch(
      "https://api.github.com/repos/WSU-Carbon-Lab/xray-atlas/issues?sort=created&direction=desc&per_page=3&state=open",
      {
        next: { revalidate: 3600 }, // Revalidate every hour
      },
    );

    if (!res.ok) {
      console.error("Failed to fetch GitHub issues:", res.statusText);
      return [];
    }

    return res.json() as Promise<Issue[]>;
  } catch (error) {
    console.error("Error fetching or parsing GitHub issues:", error);
    return [];
  }
}

export default async function RecentIssues() {
  const issues = await getRecentIssues();

  if (issues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Issues</CardTitle>
          <CardDescription className="text-lg">
            No recent issues found. Check back later!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="not-prose">
      <Card>
        <CardHeader>
          <CardTitle>Latest Open Issues</CardTitle>
          <CardDescription className="text-lg">
            Here are the three most recent issues. Feel free to pick one up!
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          <ul className="grid grid-cols-3 gap-4">
            {issues.map((issue) => (
              <li
                key={issue.id}
                className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <Link
                  href={issue.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold group-hover:underline">
                      {issue.title}
                    </h4>
                    <ExternalLink className="ml-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    #{issue.number} opened on{" "}
                    {new Date(issue.created_at).toLocaleDateString()} by{" "}
                    <span className="font-medium text-foreground">
                      {issue.user.login}
                    </span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {issue.labels.map((label) => (
                      <span
                        key={label.name}
                        className="rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{
                          backgroundColor: `#${label.color}`,
                          color: "white", // A simple approach for text color
                        }}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
