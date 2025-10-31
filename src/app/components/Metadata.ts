import { type Metadata } from "next";

export const siteMetadata: Metadata = {
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
};
