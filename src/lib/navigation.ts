import type * as Icons from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  description?: string;
  icon: keyof typeof Icons;
  subItems?: NavItem[];
}

export const aboutNavItems: NavItem[] = [
  {
    title: "Overview",
    href: "/about",
    icon: "House",
    description:
      "Learn about the mission and vision of the Xray Atlas project.",
  },
  {
    title: "How-to Guide",
    href: "/about/how-to-guide",
    icon: "Book",
    description:
      "A guide on how to use the features of the Xray Atlas effectively.",
    subItems: [
      {
        title: "Search",
        href: "/about/how-to-guide#search",
        icon: "Search",
      },
      {
        title: "Molecule Registry",
        href: "/about/how-to-guide#molecular-card",
        icon: "LayoutGrid",
      },
      {
        title: "NEXAFS Metadata",
        href: "/about/how-to-guide#nexafs-metadata",
        icon: "Database",
      },
      {
        title: "NEXAFS Plot",
        href: "/about/how-to-guide#experimental-data",
        icon: "ChartLine",
      },
    ],
  },
  {
    title: "Schema",
    href: "/about/schema",
    icon: "FileText",
    description: "The data schema used in the Xray Atlas.",
  },
  {
    title: "Community",
    href: "/about/community",
    icon: "Users",
    description: "Contribute to the project and connect with collaborators.",
    subItems: [
      {
        title: "Contribute",
        href: "/about/community/contribute",
        icon: "GitMerge",
      },
    ],
  },
  {
    title: "API Reference",
    href: "/about/api",
    icon: "Code",
    description: "The API reference for the Xray Atlas.",
  },
];
