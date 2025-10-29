# ORCID Provider Setup Guide

This guide explains how to configure and use the ORCID provider for NextAuth in your application.

## What is ORCID?

ORCID (Open Researcher and Contributor ID) provides a persistent digital identifier that distinguishes researchers and supports automated linkages between researchers and their professional activities.

## Features

- ✅ OAuth2 authentication with ORCID
- ✅ Support for both production and sandbox environments
- ✅ TypeScript types included
- ✅ Fully integrated with NextAuth v5
- ✅ Environment variable validation

## Setup Instructions

### 1. Register Your Application with ORCID

#### For Production:

1. Go to [https://orcid.org/developer-tools](https://orcid.org/developer-tools)
2. Sign in with your ORCID account
3. Register a new OAuth application
4. Set your redirect URI to: `http://localhost:3000/api/auth/callback/orcid` (for development)
   - For production, use: `https://yourdomain.com/api/auth/callback/orcid`
5. Save your Client ID and Client Secret

#### For Sandbox (Testing):

1. Go to [https://sandbox.orcid.org/developer-tools](https://sandbox.orcid.org/developer-tools)
2. Create a sandbox account if you don't have one
3. Follow the same steps as production

### 2. Configure Environment Variables

Add the following to your `.env` file:

```bash
# ORCID OAuth Credentials
AUTH_ORCID_ID="your-client-id-here"
AUTH_ORCID_SECRET="your-client-secret-here"

# Optional: Use sandbox for testing
ORCID_USE_SANDBOX="true"
```

**Note:** Remove or set `ORCID_USE_SANDBOX` to `"false"` when deploying to production.

### 3. Provider Configuration

The ORCID provider is already configured in `src/server/auth/config.ts`. The configuration automatically:

- Selects the correct ORCID environment (sandbox or production)
- Maps ORCID profile data to NextAuth user object
- Handles OAuth2 flow

## User Profile Data

The ORCID provider returns the following user data:

```typescript
{
  id: string; // ORCID iD (e.g., "0000-0002-1825-0097")
  name: string; // Full name or ORCID iD if name not available
  email: string; // Email (may be null if not shared)
  image: null; // ORCID doesn't provide profile images via OAuth
}
```

## Scopes

By default, the provider requests the `/authenticate` scope, which provides:

- ORCID iD
- Name (if public)

To request email access, modify the scope in `src/server/auth/orcid.ts`:

```typescript
scope: "/authenticate openid email",
```

**Note:** Users must explicitly grant email permission in ORCID settings.

## Available Scopes

- `/authenticate` - Basic authentication (recommended)
- `openid` - OpenID Connect authentication
- `email` - Access to user's email (requires user permission)

For more advanced scopes (like reading/updating ORCID records), see the [ORCID API documentation](https://info.orcid.org/documentation/api-tutorials/api-tutorial-get-and-authenticated-orcid-id/).

## Testing

### Using Sandbox

1. Set `ORCID_USE_SANDBOX="true"` in your `.env`
2. Create a sandbox account at [https://sandbox.orcid.org/register](https://sandbox.orcid.org/register)
3. Register your OAuth application in the sandbox
4. Test authentication flow

### Production Testing

Before going live, make sure to:

- ✅ Test with real ORCID accounts
- ✅ Verify redirect URIs match your production domain
- ✅ Remove or set `ORCID_USE_SANDBOX` to `"false"`
- ✅ Test the complete sign-in/sign-out flow

## Troubleshooting

### "Invalid redirect_uri"

- Make sure your redirect URI in ORCID matches exactly: `https://yourdomain.com/api/auth/callback/orcid`
- Check that you're using the correct environment (sandbox vs production)

### "No email returned"

- Email is optional in ORCID and requires user permission
- Users must make their email public or grant explicit access
- Not all ORCID accounts have verified emails

### "Invalid client credentials"

- Verify your `AUTH_ORCID_ID` and `AUTH_ORCID_SECRET` are correct
- Check if you're using sandbox credentials with production URLs (or vice versa)

## Resources

- [ORCID Developer Documentation](https://info.orcid.org/documentation/)
- [ORCID OAuth Guide](https://info.orcid.org/documentation/integration-guide/getting-authenticated-orcid-ids/)
- [NextAuth.js Documentation](https://next-auth.js.org/)

## Example Usage

Users will see "Sign in with ORCID" as an option alongside other providers (like Discord). When they click it:

1. They're redirected to ORCID to authorize your app
2. After authorization, they're redirected back to your app
3. NextAuth creates a session with their ORCID data
4. You can access their ORCID iD via the session

```typescript
import { auth } from "~/server/auth";

export default async function Page() {
  const session = await auth();

  if (session?.user) {
    console.log("ORCID iD:", session.user.id);
    console.log("Name:", session.user.name);
  }
}
```
