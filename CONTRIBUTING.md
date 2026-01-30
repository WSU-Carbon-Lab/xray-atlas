# Contributing to X-ray Atlas

Thank you for your interest in contributing to X-ray Atlas. This guide covers development environment setup, tooling, and best practices for contributors.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
  - [Infisical for Secrets Management](#infisical-for-secrets-management)
  - [Manual Environment Configuration](#manual-environment-configuration)
- [Database Setup](#database-setup)
- [Authentication Setup](#authentication-setup)
  - [ORCID OAuth](#orcid-oauth)
  - [GitHub OAuth](#github-oauth)
  - [Local OAuth Testing with ngrok](#local-oauth-testing-with-ngrok)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Git Workflow](#git-workflow)
- [Pull Request Guidelines](#pull-request-guidelines)

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Installation |
|------|---------|--------------|
| **Bun** | >= 1.0 | [bun.sh](https://bun.sh/) |
| **Node.js** | >= 20 | [nodejs.org](https://nodejs.org/) |
| **Git** | >= 2.0 | [git-scm.com](https://git-scm.com/) |
| **ngrok** | Latest | [ngrok.com](https://ngrok.com/) |
| **Infisical CLI** | Latest | [infisical.com](https://infisical.com/docs/cli/overview) |

### Installing Prerequisites

```bash
# macOS (using Homebrew)
brew install oven-sh/bun/bun
brew install ngrok
brew install infisical/get-cli/infisical

# Verify installations
bun --version
ngrok --version
infisical --version
```

---

## Environment Setup

X-ray Atlas requires several environment variables for database connections, authentication providers, and external APIs.

### Infisical for Secrets Management

We use [Infisical](https://infisical.com/) for secure secrets management across the team. This ensures consistent environment configuration and prevents secrets from being committed to version control.

#### Initial Setup

1. **Create an Infisical Account**

   Sign up at [app.infisical.com](https://app.infisical.com/) and request access to the WSU-Carbon-Lab workspace.

2. **Authenticate the CLI**

   ```bash
   infisical login
   ```

3. **Initialize the Project**

   ```bash
   cd xray-atlas
   infisical init
   ```

   Select the `xray-atlas` project and `development` environment when prompted.

4. **Export Secrets to .env.local**

   ```bash
   infisical export --env=dev > .env.local
   ```

5. **Run with Infisical**

   You can also run commands with secrets injected automatically:

   ```bash
   infisical run -- bun dev
   ```

#### Environment Profiles

| Environment | Use Case |
|-------------|----------|
| `dev` | Local development |
| `staging` | Preview deployments |
| `prod` | Production (read-only for most contributors) |

#### Syncing Secrets

When environment variables are updated:

```bash
# Pull latest secrets
infisical export --env=dev > .env.local

# Or run with latest secrets without saving to disk
infisical run -- bun dev
```

### Manual Environment Configuration

If you don't have Infisical access, create a `.env.local` file manually:

```bash
# Copy the template
cp .env.example .env.local
```

Required environment variables:

```bash
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://user:password@host:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:5432/postgres"

# Supabase
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# Authentication
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="http://localhost:3000"

# OAuth Providers (optional for basic development)
ORCID_CLIENT_ID="your-orcid-client-id"
ORCID_CLIENT_SECRET="your-orcid-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# External APIs
CAS_API_KEY="your-cas-api-key"
```

Generate a secure `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

---

## Database Setup

X-ray Atlas uses PostgreSQL via Supabase with Prisma ORM.

### Local Development with Supabase

1. **Generate Prisma Client**

   ```bash
   bun run postinstall
   ```

2. **Run Migrations**

   ```bash
   # Apply existing migrations
   bun run db:migrate

   # Or push schema changes directly (development only)
   bun run db:push
   ```

3. **Explore Data with Prisma Studio**

   ```bash
   bun run db:studio
   ```

### Creating Migrations

When modifying `prisma/schema.prisma`:

```bash
# Generate a new migration
bun run db:generate

# This creates a migration file in prisma/migrations/
# Review the SQL before committing
```

---

## Authentication Setup

X-ray Atlas supports multiple OAuth providers. For local development, you can use the dev mock user system or configure real OAuth.

### Dev Mock User

For testing without OAuth, the application includes a development user panel (visible only in `NODE_ENV=development`). This provides a mock authenticated user without requiring OAuth configuration.

### ORCID OAuth

ORCID is the primary authentication provider for researcher verification.

1. **Register an Application**

   - Go to [orcid.org/developer-tools](https://orcid.org/developer-tools)
   - Create a new application
   - Add redirect URI: `http://localhost:3000/api/auth/callback/orcid`

2. **Configure Environment**

   ```bash
   ORCID_CLIENT_ID="APP-XXXXXXXXXXXX"
   ORCID_CLIENT_SECRET="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   ```

3. **ORCID Sandbox (Optional)**

   For testing without affecting production ORCID records:

   - Register at [sandbox.orcid.org/developer-tools](https://sandbox.orcid.org/developer-tools)
   - Set `ORCID_USE_SANDBOX=true`

### GitHub OAuth

1. **Create OAuth App**

   - Go to [github.com/settings/developers](https://github.com/settings/developers)
   - New OAuth App
   - Homepage URL: `http://localhost:3000`
   - Callback URL: `http://localhost:3000/api/auth/callback/github`

2. **Configure Environment**

   ```bash
   GITHUB_CLIENT_ID="Ov23liXXXXXXXXXX"
   GITHUB_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   ```

### Local OAuth Testing with ngrok

OAuth providers like ORCID require HTTPS and non-localhost URLs. Use ngrok to create a secure tunnel for local OAuth testing.

#### Setup ngrok

1. **Create Account and Authenticate**

   ```bash
   # Sign up at ngrok.com and get your authtoken
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

2. **Start Development with Tunnel**

   ```bash
   bun dev:tunnel
   ```

   This runs Next.js and ngrok concurrently. Note your ngrok URL (e.g., `https://abc123.ngrok-free.app`).

3. **Update Environment**

   In `.env.local`:

   ```bash
   AUTH_URL="https://abc123.ngrok-free.app"
   ```

4. **Update OAuth Provider**

   Add the ngrok callback URL to your OAuth provider:

   ```
   https://abc123.ngrok-free.app/api/auth/callback/orcid
   https://abc123.ngrok-free.app/api/auth/callback/github
   ```

#### ngrok Tips

- **Free tier URLs change on restart.** Consider a paid plan for stable subdomains.
- **Inspect requests** at `http://127.0.0.1:4040`
- **Cookie issues?** The auth config includes `sameSite: "none"` for cross-site OAuth flows.

#### Troubleshooting OAuth with ngrok

| Issue | Solution |
|-------|----------|
| 503 Service Unavailable | Ensure `bun dev` is running before ngrok connects |
| Configuration Error | Verify `AUTH_URL` matches your ngrok URL exactly |
| Cookies not persisting | Check that ngrok URL uses HTTPS |
| State mismatch | Clear browser cookies and retry |

---

## Development Workflow

### Starting Development

```bash
# Standard development (localhost only)
bun dev

# Development with ngrok tunnel (for OAuth testing)
bun dev:tunnel
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start dev server with Turbopack |
| `bun dev:tunnel` | Start dev server with ngrok tunnel |
| `bun build` | Build for production |
| `bun start` | Start production server |
| `bun check` | Run linting and type checking |
| `bun lint` | Run ESLint |
| `bun lint:fix` | Fix ESLint errors |
| `bun format:check` | Check Prettier formatting |
| `bun format:write` | Fix Prettier formatting |
| `bun typecheck` | Run TypeScript type checking |
| `bun db:generate` | Create Prisma migration |
| `bun db:migrate` | Apply Prisma migrations |
| `bun db:push` | Push schema changes (dev only) |
| `bun db:studio` | Open Prisma Studio |

### Before Committing

Always run the full check suite:

```bash
bun check
```

This runs both ESLint and TypeScript type checking.

---

## Code Style

### TypeScript

- Strict mode enabled
- Explicit return types on exported functions
- No `any` types without justification
- Use Zod for runtime validation

### Formatting

- Prettier with Tailwind CSS plugin
- 2-space indentation
- No semicolons
- Single quotes for strings

```bash
# Check formatting
bun format:check

# Fix formatting
bun format:write
```

### Linting

- ESLint with Next.js and TypeScript configs
- React hooks rules enforced
- Import sorting

```bash
# Check linting
bun lint

# Fix auto-fixable issues
bun lint:fix
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

Types:

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting) |
| `refactor` | Code refactoring |
| `perf` | Performance improvements |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |

Examples:

```bash
feat(molecules): add SMILES structure search
fix(auth): resolve ORCID callback cookie issue
docs(contributing): add ngrok setup guide
refactor(plots): extract axis components
```

---

## Git Workflow

### Branch Naming

```
type/issue-number-brief-description
```

Examples:

```
feat/35-user-profile-redesign
fix/36-passkey-invalid-character
refactor/32-colocation-migration
```

### Using Graphite (Recommended)

We use [Graphite](https://graphite.dev/) for stacked PRs and branch management.

```bash
# Install Graphite CLI
brew install withgraphite/tap/graphite

# Create a new branch
gt create feat/new-feature

# Stack another branch on top
gt create feat/dependent-feature

# Restack all branches on main
gt restack

# Submit PRs for the stack
gt submit --stack
```

### Standard Git Workflow

If not using Graphite:

```bash
# Create feature branch
git checkout -b feat/your-feature main

# Make changes and commit
git add .
git commit -m "feat: add your feature"

# Push and create PR
git push -u origin feat/your-feature
```

### Keeping Branches Updated

```bash
# Using Graphite
gt restack

# Using Git
git fetch origin
git rebase origin/main
```

---

## Pull Request Guidelines

### Before Opening a PR

1. **Run all checks**

   ```bash
   bun check
   ```

2. **Test your changes locally**

3. **Update documentation if needed**

4. **Ensure commits follow conventional commit format**

### PR Template

```markdown
## Summary

Brief description of changes.

## Changes

- Change 1
- Change 2
- Change 3

## Test Plan

- [ ] Tested locally
- [ ] Tested OAuth flow (if auth changes)
- [ ] Tested on mobile (if UI changes)

## Screenshots (if UI changes)

Before | After
--- | ---
img | img
```

### Review Process

1. All PRs require at least one approval
2. CI checks must pass (linting, type checking, build)
3. Address review feedback promptly
4. Squash and merge preferred for clean history

### After Merge

If using Graphite with stacked PRs:

```bash
# After your PR is merged, sync and continue
gt sync
```

---

## Getting Help

- **Discord**: Join our community server for real-time help
- **Issues**: Open a [GitHub issue](https://github.com/WSU-Carbon-Lab/xray-atlas/issues) for bugs or feature requests
- **Discussions**: Use [GitHub Discussions](https://github.com/WSU-Carbon-Lab/xray-atlas/discussions) for questions

---

## License

By contributing to X-ray Atlas, you agree that your contributions will be licensed under the MIT License.
