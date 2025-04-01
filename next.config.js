/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");

/** @type {import("next").NextConfig} */
const config = {
    images: {
        remotePatterns: [
            {
                protocol: undefined,
                hostname: '**',
            },
            {
                protocol: 'https',
                hostname: 'raw.githubusercontent.com',
                pathname: '/WSU-Carbon-Lab/molecules/main/**'
            }
        ],
        dangerouslyAllowSVG: true,
        contentDispositionType: 'attachment',
    }
}

export default config;
