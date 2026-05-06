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
        destination: "/wiki/home",
        permanent: true,
      },
      {
        source: "/about/data-representation",
        destination: "/wiki/data-representation",
        permanent: true,
      },
      {
        source: "/about/platform-features",
        destination: "/wiki/platform-features",
        permanent: true,
      },
      {
        source: "/about/contributions",
        destination: "/wiki/contributions",
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
