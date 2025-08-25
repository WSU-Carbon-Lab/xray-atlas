import "~/styles/globals.css";
import { type Metadata, type Viewport } from "next";
import Link from "next/link";
import React from "react";
import Image from "next/image";
import github from "public/github-mark.svg";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "~/app/_components/ui/navigation-menu";
import { cn } from "~/lib/utils";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#C8102E", // WSU crimson
};

export const metadata: Metadata = {
  title: {
    template: "%s | Xray Atlas",
    default: "Xray Atlas",
  },
  description:
    "Comprehensive database for X-ray spectroscopy data collected by the WSU Collins Lab",
  icons: [{ rel: "icon", url: "https://repo.wsu.edu/favicon/icon.svg" }],

  // Open Graph metadata (for Facebook, LinkedIn, etc.)
  openGraph: {
    type: "website",
    title: "Xray Atlas | WSU Collins Research Group",
    description:
      "Comprehensive database for X-ray spectroscopy data collected by the WSU Collins Lab",
    siteName: "Xray Atlas",
    images: [
      {
        url: "https://wpcdn.web.wsu.edu/wp-labs/uploads/sites/945/2017/11/Scattxrayering-Rendering.jpg", // Replace with your actual image URL
        width: 1200,
        height: 630,
        alt: "Xray Atlas Preview Image",
      },
    ],
  },

  // Twitter metadata
  twitter: {
    card: "summary_large_image",
    title: "Xray Atlas | WSU Collins Research Group",
    description:
      "Comprehensive database for X-ray spectroscopy data collected by the WSU Collins Lab",
    images: [
      "https://wpcdn.web.wsu.edu/wp-labs/uploads/sites/945/2017/11/Scattering-Rendering.jpg",
    ], // Replace with your actual image URL=
  },

  // Additional metadata
  applicationName: "Xray Atlas",
  keywords: [
    "X-ray spectroscopy",
    "NEXAFS",
    "material research",
    "WSU",
    "Brian Collins",
    "Database",
    "Advanced Light Source",
  ],
  authors: [
    { name: "WSU Collins Research Group", url: "https://labs.wsu.edu/carbon/" },
  ],
  robots: "index, follow",
  // viewport and themeColor properties have been moved to viewport export
};

const aboutComponents: { title: string; href: string; description: string }[] =
  [
    {
      title: "Overview",
      href: "/about",
      description:
        "Learn about the mission and vision of the Xray Atlas project.",
    },
    {
      title: "How-to Guide",
      href: "/about/how-to-guide",
      description:
        "A guide on how to use the features of the Xray Atlas effectively.",
    },
    {
      title: "Schema",
      href: "/about/schema",
      description: "The data schema used in the Xray Atlas.",
    },
    {
      title: "Technology",
      href: "/about/technology",
      description: "The technology stack behind the Xray Atlas.",
    },
  ];

function TopNav() {
  return (
    <nav className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center space-x-3 font-sans font-thin text-3xl"
        >
          <Image
            src="/wsu-logo.png"
            alt="WSU Logo"
            width={40}
            height={40}
            className="h-10 w-auto rounded-lg bg-wsu-crimson"
          />
          <span>X-ray Atlas</span>
        </Link>

        <div className="flex items-center gap-4">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link href="/" passHref>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    Home
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger>About</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                    {aboutComponents.map((component) => (
                      <ListItem
                        key={component.title}
                        title={component.title}
                        href={component.href}
                      >
                        {component.description}
                      </ListItem>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/upload" passHref>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    Upload
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          <Link
            href="https://github.com/WSU-Carbon-Lab/xray-atlas"
            className="transition-all hover:scale-105"
          >
            <Image
              src={github}
              alt="GitHub"
              width={40}
              height={40}
              className="brightness-100"
            />
          </Link>
        </div>
      </div>
    </nav>
  );
}

const ListItem = React.forwardRef<
  React.ComponentRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors",
            className,
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";

function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="container px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="space-y-4">
            <h3 className="font-sans text-lg text-black">Xray Atlas</h3>
            <p className="flex-wrap text-sm text-gray-600">
              Advancing material research through collaborative data.
            </p>
            <h4 className="text-sm font-semibold text-gray-900">Hosted By</h4>
            <p className="text-sm text-gray-600">
              <Link
                href="https://labs.wsu.edu/carbon/"
                className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
              >
                Washington State University · Collins Research Group
              </Link>
            </p>
            <p className="text-sm text-gray-600">
              <Link
                href="https://faculty.psau.edu.sa/en/psau/facultymember/om.alqahtani"
                className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
              >
                Prince Sattam bin Abdulaziz University · Obaid Alqahtani
              </Link>
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">Quick Links</h4>
            <div className="flex flex-col space-y-2">
              <Link
                href="https://github.com/WSU-Carbon-Lab/xray-atlas/issues/new?template=upload-data.md"
                className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
              >
                Upload
              </Link>
              <Link
                href="/upload"
                className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
              >
                Documentation
              </Link>
              <Link
                href="https://github.com/WSU-Carbon-Lab/xray-atlas/issues/new/choose"
                className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
              >
                Contact
              </Link>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">
              Collaborators
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link
                  href="https://www.nist.gov/mml/materials-science-and-engineering-division/polymers-processing-group"
                  className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
                >
                  NIST RSoXR Group
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.bnl.gov/nsls2/beamlines/beamline.php?r=12-ID"
                  className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
                >
                  NSLS II SMI & SST1 Beamlines
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.ansto.gov.au/facilities/australian-synchrotron/synchrotron-beamlines/soft-x-ray-spectroscopy#content-scientists"
                  className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
                >
                  The Australian Synchrotron Soft X-ray Spectroscopy Beamline
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.monash.edu/engineering/chrismcneill"
                  className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
                >
                  Monash University Chris McNeill Group
                </Link>
              </li>
              <li>
                <Link
                  href="https://weiyougroup.org/"
                  className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
                >
                  The University of North Carolina at Chapel Hill You Group
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex flex-col justify-between border-t pt-4 md:flex-row">
          <div className="text-center text-sm text-gray-600 md:text-left">
            © {new Date().getFullYear()} X-ray Atlas. All rights reserved.
          </div>
          <div className="mt-4 flex justify-center gap-4 text-sm md:mt-0 md:justify-end">
            <Link
              href="/privacy"
              className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
            >
              Privacy
            </Link>
            <Link
              href="https://github.com/WSU-Carbon-Lab/xray-atlas"
              className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
            >
              GitHub
            </Link>
            <Link
              href="https://wsu.edu/"
              className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
            >
              WSU
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <TopNav />
        <main className="flex-1 bg-white">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
