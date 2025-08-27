import { ExternalLink } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/app/_components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "~/app/_components/ui/carousel";

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
      "https://api.github.com/repos/WSU-Carbon-Lab/xray-atlas/issues?sort=created&direction=desc&per_page=6&state=open",
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
            Here are the most recent issues. Feel free to pick one up! Use the arrows to navigate through them.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {issues.map((issue) => (
                <CarouselItem key={issue.id} className="pl-2 md:pl-4 md:basis-1/3">
                  <div className="h-full">
                    <Card className="h-full">
                      <CardContent className="p-4">
                        <Link
                          href={issue.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group block h-full"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold group-hover:underline text-sm leading-tight">
                              {issue.title}
                            </h4>
                            <ExternalLink className="ml-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">
                            #{issue.number} opened on{" "}
                            {new Date(issue.created_at).toLocaleDateString()} by{" "}
                            <span className="font-medium text-foreground">
                              {issue.user.login}
                            </span>
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {issue.labels.slice(0, 3).map((label) => (
                              <span
                                key={label.name}
                                className="rounded-full px-2 py-0.5 text-xs font-semibold"
                                style={{
                                  backgroundColor: `#${label.color}`,
                                  color: "white",
                                }}
                              >
                                {label.name}
                              </span>
                            ))}
                            {issue.labels.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{issue.labels.length - 3} more
                              </span>
                            )}
                          </div>
                        </Link>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </CardContent>
      </Card>
    </div>
  );
}
