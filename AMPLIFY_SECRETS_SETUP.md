# AWS Amplify Secrets Setup Guide

This guide explains how to configure secrets for your X-Ray Atlas application using AWS Amplify Gen 2.

## Overview

The application uses AWS Amplify's secret management system to securely store and access sensitive credentials like ORCID OAuth keys. Secrets are defined in the backend configuration and automatically become available as environment variables at runtime.

## Architecture

```
amplify/backend.ts (Infrastructure)
    ↓ Defines secrets
    ↓
AWS Secrets Manager / SSM Parameter Store
    ↓ Runtime access via environment variables
    ↓
src/server/auth/config.ts (Runtime)
```

## Required Secrets

The following secrets must be configured:

1. **AUTH_ORCID_ID** - Your ORCID OAuth Client ID
2. **AUTH_ORCID_SECRET** - Your ORCID OAuth Client Secret
3. **AUTH_SECRET** - NextAuth.js secret for session encryption
4. **ORCID_USE_SANDBOX** (Optional) - Set to "true" for sandbox testing

## Setup Steps

### 1. Get ORCID Credentials

#### Production:

1. Go to [https://orcid.org/developer-tools](https://orcid.org/developer-tools)
2. Sign in with your ORCID account
3. Register a new OAuth application
4. Set redirect URI: `https://yourdomain.com/api/auth/callback/orcid`
5. Save your Client ID and Client Secret

#### Sandbox (for testing):

1. Go to [https://sandbox.orcid.org/developer-tools](https://sandbox.orcid.org/developer-tools)
2. Create a sandbox account
3. Follow same steps as production
4. Use sandbox credentials and set `ORCID_USE_SANDBOX=true`

### 2. Generate NextAuth Secret

Generate a secure random string for AUTH_SECRET:

```bash
# Using openssl
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or using npx (Next.js Auth)
npx auth secret
```

### 3. Configure Secrets in Amplify

#### Option A: Using Amplify CLI (Recommended for Production)

1. **Set secrets using Amplify CLI:**

```bash
# Navigate to your project root
cd /path/to/xray-atlas

# Set ORCID Client ID
npx ampx sandbox secret set AUTH_ORCID_ID

# Set ORCID Client Secret
npx ampx sandbox secret set AUTH_ORCID_SECRET

# Set NextAuth Secret
npx ampx sandbox secret set AUTH_SECRET

# Optional: Set sandbox flag
npx ampx sandbox secret set ORCID_USE_SANDBOX
```

You'll be prompted to enter the value for each secret securely.

2. **List configured secrets:**

```bash
npx ampx sandbox secret list
```

3. **Remove a secret (if needed):**

```bash
npx ampx sandbox secret remove SECRET_NAME
```

#### Option B: Using .env file (Development Only)

For local development, you can use a `.env` file:

```bash
# .env (DO NOT COMMIT THIS FILE)
AUTH_SECRET="your-generated-secret-here"
AUTH_ORCID_ID="your-orcid-client-id"
AUTH_ORCID_SECRET="your-orcid-client-secret"
ORCID_USE_SANDBOX="true"
```

⚠️ **Warning:** Never commit `.env` to version control. Use Amplify secrets for production.

### 4. Deploy to Amplify

After configuring secrets:

```bash
# Push changes to Amplify
git add .
git commit -m "Configure ORCID authentication with Amplify secrets"
git push

# Amplify will automatically deploy with configured secrets
```

## How Secrets Work

### In Backend Configuration (`amplify/backend.ts`)

Secrets are declared in the infrastructure code:

```typescript
import { defineBackend, secret } from "@aws-amplify/backend";

const backend = defineBackend({ auth, data });

// Define secrets
const orcidClientId = secret("AUTH_ORCID_ID");
const orcidClientSecret = secret("AUTH_ORCID_SECRET");
const authSecret = secret("AUTH_SECRET");
```

This tells Amplify to:

1. Create/reference secrets in AWS Secrets Manager
2. Make them available as environment variables at runtime

### In Runtime Code (`src/server/auth/config.ts`)

Access secrets via environment variables:

```typescript
export const authConfig = {
  providers: [
    ORCIDProvider({
      clientId: process.env.AUTH_ORCID_ID!,
      clientSecret: process.env.AUTH_ORCID_SECRET!,
    }),
  ],
};
```

## Environment-Specific Configuration

### Local Development

```bash
# Use .env file or set environment variables
export AUTH_ORCID_ID="sandbox-client-id"
export AUTH_ORCID_SECRET="sandbox-client-secret"
export ORCID_USE_SANDBOX="true"
export AUTH_SECRET="dev-secret-key"

npm run dev
```

### Staging/Production

Use Amplify CLI to set secrets:

```bash
# For sandbox environment
npx ampx sandbox secret set AUTH_ORCID_ID

# For production (after deploying)
# Secrets are managed in AWS Console or via CLI
```

## Troubleshooting

### Error: "Module not found" with `@aws-amplify/backend`

**Problem:** Importing `@aws-amplify/backend` in runtime code causes bundling issues.

**Solution:** Only use `@aws-amplify/backend` in `amplify/` directory files. In runtime code (`src/`), use `process.env` to access environment variables.

❌ **Wrong:**

```typescript
// src/server/auth/config.ts
import { secret } from "@aws-amplify/backend";
const id = secret("AUTH_ORCID_ID");
```

✅ **Correct:**

```typescript
// src/server/auth/config.ts
const id = process.env.AUTH_ORCID_ID;
```

### Secret Not Available at Runtime

**Check:**

1. Secret is defined in `amplify/backend.ts`
2. Secret value is set via Amplify CLI: `npx ampx sandbox secret set SECRET_NAME`
3. Application has been redeployed after setting secrets
4. For local dev, `.env` file exists with the secret

### ORCID Authentication Not Working

**Verify:**

1. Redirect URI matches exactly in ORCID app settings
2. Using correct environment (sandbox vs production)
3. `ORCID_USE_SANDBOX` matches your ORCID credentials
4. Secrets are properly set and accessible

## Security Best Practices

1. ✅ **Use Amplify secrets for production** - Don't use `.env` in production
2. ✅ **Rotate secrets regularly** - Update secrets periodically
3. ✅ **Never commit secrets** - Keep `.env` in `.gitignore`
4. ✅ **Use sandbox for testing** - Don't use production credentials in development
5. ✅ **Restrict access** - Use IAM policies to limit who can access secrets
6. ✅ **Use strong AUTH_SECRET** - Generate cryptographically secure random strings

## Additional Resources

- [Amplify Gen 2 Secrets Documentation](https://docs.amplify.aws/gen2/deploy-and-host/fullstack-branching/secrets/)
- [ORCID OAuth Documentation](https://info.orcid.org/documentation/integration-guide/getting-authenticated-orcid-ids/)
- [NextAuth.js Configuration](https://next-auth.js.org/configuration/options)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)

## Quick Reference

```bash
# Set a secret
npx ampx sandbox secret set SECRET_NAME

# List secrets
npx ampx sandbox secret list

# Remove a secret
npx ampx sandbox secret remove SECRET_NAME

# Generate NextAuth secret
npx auth secret

# Run local dev
npm run dev

# Deploy to Amplify
git push
```
