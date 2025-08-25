/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");

/** @type {import("next").NextConfig} */
const config = {
    allowedDevOrigins: [
        'local-origin.dev',
        '*.local-origin.dev',
    ],
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
    },
    // Configure recommended cache headers
    headers: async () => {
        return [
            {
                source: '/_next/static/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=60, immutable',
                    },
                ],
            },
        ];
    },
}

export default config;
