import { type Metadata } from "next";

export const siteMetadata: Metadata = {
  metadataBase: new URL("https://xrayatlas.wsu.edu"),
  alternates: {
    canonical: "/",
  },
  title: {
    template: "%s | Xray Atlas",
    default: "Xray Atlas",
  },
  description:
    "Comprehensive database for X-ray spectroscopy data collected by the WSU Collins Lab",
  icons: [{ rel: "icon", url: "https://repo.wsu.edu/favicon/icon.svg" }],
  openGraph: {
    type: "website",
    url: "https://xrayatlas.wsu.edu",
    title: "Xray Atlas | WSU Collins Research Group",
    description:
      "Comprehensive database for X-ray spectroscopy data collected by the WSU Collins Lab",
    siteName: "Xray Atlas",
    images: [
      {
        url: "https://wpcdn.web.wsu.edu/wp-labs/uploads/sites/945/2017/11/Scattxrayering-Rendering.jpg",
        width: 1200,
        height: 630,
        alt: "Xray Atlas Preview Image",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Xray Atlas | WSU Collins Research Group",
    description:
      "Comprehensive database for X-ray spectroscopy data collected by the WSU Collins Lab",
    images: ["https://wpcdn.web.wsu.edu/wp-labs/uploads/sites/945/2017/11/Scattxrayering-Rendering.jpg"],
  },
  applicationName: "Xray Atlas",
  keywords: [
    // Research Group Keywords
    "WSU",
    "Washington State University",
    "WSU Physics",
    "Brian Collins",
    "WSU Collins Research Group",
    // Open Data Keywords
    "Open Data",
    "Data Repository",
    "Data Archive",
    // Research Concept Keywords
    "Materials science",
    "Materials physics",
    "Atomic Molecular and Optical Physics",
    "Soft Matter Physics",
    "Material Engineering",
    "Advanced Functional Materials",
    // Spectroscopy Keywords
    "X-ray science",
    "X-ray spectroscopy",
    "NEXAFS",
    "X-ray absorption fine structure",
    "X-ray absorption spectroscopy",
    "EXAFS",
    "XAS",
    "X-ray near edge absorption fine structure",
    // Other X-ray Science Keywords
    "X-ray diffraction",
    "X-ray scattering",
    "X-ray crystallography",
    "X-ray imaging",
    "X-ray computed tomography",
    "X-ray microtomography",
    "Resonant Scattering",
    "Polarized Scattering",
    "RSoXS",
    "PRSoXS",
    "RSoXR",
    "PRSoXR",
    // Instrument / Facility Keywords
    "Advanced Light Source",
    "ALS",
    "National Synchrotron Light Source",
    "NSLS-II",
    "Stanford Synchrotron Radiation Lightsource",
    "SSRL",
    "SLAC National Accelerator Laboratory",
    "SLAC",
    "Advanced Photon Source",
    "APS",
    "Argonne National Laboratory",
    "ANL",
    "Brookhaven National Laboratory",
    "BNL",
    "Lawrence Berkeley National Laboratory",
    "LBNL",
    "Berkeley Lab",
  ],
  authors: [
    { name: "WSU Collins Research Group", url: "https://labs.wsu.edu/carbon/" },
  ],
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "ZkDe5DfUfqbo9aAiISOxS1C-dvhZmMl6SWI9xhSTpkk",
  },
};