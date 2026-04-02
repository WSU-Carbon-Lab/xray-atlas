<h1 align="center">X-ray Atlas</h1>

<p align="center">
  Open database and web application for Near-Edge X-ray Absorption Fine Structure (NEXAFS) spectroscopy.
</p>

<div align="center">
  <a href="https://xray-atlas.vercel.app">Home</a> | <a href="CONTRIBUTING.md">Contributing</a> | <a href="https://github.com/WSU-Carbon-Lab/xray-atlas/issues">Issues</a>
</div>

## Table of Contents

This repository contains the Next.js app, Prisma schema, and contributor documentation for X-ray Atlas.

- [`src/app`](https://github.com/WSU-Carbon-Lab/xray-atlas/tree/main/src/app) - Next.js App Router (browse, contribute, molecules, facilities, API routes)
- [`src/server`](https://github.com/WSU-Carbon-Lab/xray-atlas/tree/main/src/server) - tRPC routers, authentication, and server-side data access
- [`src/components`](https://github.com/WSU-Carbon-Lab/xray-atlas/tree/main/src/components) - Shared UI, plots, forms, and layout
- [`prisma`](https://github.com/WSU-Carbon-Lab/xray-atlas/tree/main/prisma) - Database schema and migrations

[Report an Issue](https://github.com/WSU-Carbon-Lab/xray-atlas/issues/new)

## Contributing

X-ray Atlas is open source and we welcome contributions from the community.

<!-- prettier-ignore -->
> [!NOTE]
> If your change requires database migrations, new secrets, or production infrastructure updates, coordinate with maintainers before merging so deployments stay consistent.

<!-- prettier-ignore-end -->

1. Fork and clone the repository
2. Install [Bun](https://bun.sh/) and Node.js 24 or newer (see `package.json` `engines`)
3. Install dependencies with `bun install`
4. Follow [`CONTRIBUTING.md`](CONTRIBUTING.md) for environment setup, database setup, and local OAuth
5. Run `bun run check` before opening a pull request
6. Open a pull request with a clear description of the change

## License

Application code is licensed under the [MIT License](LICENSE). Contributed datasets are licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

### Citing Datasets

Each dataset has a minted DOI. When using X-ray Atlas data, cite:

**Individual dataset:**
```
[Dataset Name] [DOI]. Adapted from [Original Publication]. Hosted by X-Ray Atlas.
```

**Entire collection:**
```
X-Ray Atlas [Collection DOI]. Accessed [Date].
```

See dataset landing pages for full citation details and examples.
