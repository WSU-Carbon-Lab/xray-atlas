/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
  async redirects() {
    return [
      {
        source: "/about/home",
        destination: "/wiki",
        permanent: true,
      },
      {
        source: "/about/data-representation",
        destination: "/wiki/atlas/data-model",
        permanent: true,
      },
      {
        source: "/about/platform-features",
        destination: "/wiki/atlas",
        permanent: true,
      },
      {
        source: "/about/contributions",
        destination: "/wiki/atlas/contributing",
        permanent: true,
      },
      {
        source: "/wiki/home",
        destination: "/wiki",
        permanent: true,
      },
      {
        source: "/wiki/data-representation",
        destination: "/wiki/atlas/data-model",
        permanent: true,
      },
      {
        source: "/wiki/data-representation/input-spectroscopy",
        destination: "/wiki/atlas/uploading-data",
        permanent: true,
      },
      {
        source: "/wiki/data-representation/input-spectroscopy/template",
        destination: "/wiki/atlas/uploading-data/template",
        permanent: true,
      },
      {
        source: "/wiki/data-representation/optical-constants",
        destination: "/wiki/nexafs/optical-constants",
        permanent: true,
      },
      {
        source: "/wiki/data-representation/kramers-kronig-delta",
        destination: "/wiki/nexafs/optical-constants",
        permanent: true,
      },
      {
        source: "/wiki/platform-features",
        destination: "/wiki/atlas",
        permanent: true,
      },
      {
        source: "/wiki/platform-features/dataset-quality-metrics",
        destination: "/wiki/atlas/quality-metrics",
        permanent: true,
      },
      {
        source: "/wiki/contributions",
        destination: "/wiki/atlas/contributing",
        permanent: true,
      },
      {
        source: "/wiki/data-insights",
        destination: "/wiki",
        permanent: true,
      },
      {
        source: "/wiki/api-reference",
        destination: "/wiki/api",
        permanent: true,
      },
      {
        source: "/wiki/api/openapi-contract",
        destination: "/wiki/api/openapi",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "via.placeholder.com",
      },
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "**.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "pubchem.ncbi.nlm.nih.gov",
      },
      {
        protocol: "https",
        hostname: "heroui-assets.nyc3.cdn.digitaloceanspaces.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.icon-icons.com",
      },
      {
        protocol: "https",
        hostname: "cdn.prod.website-files.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default config;
