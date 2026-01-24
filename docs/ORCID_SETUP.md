# ORCID OAuth Setup Guide

This guide explains how to configure ORCID OAuth redirect URLs for both development and production environments.

## NextAuth Callback URL Pattern

NextAuth v5 uses the following callback URL pattern:
```
[base-url]/api/auth/callback/[provider-id]
```

For ORCID (provider id: `orcid`), the callback URL is:
```
[base-url]/api/auth/callback/orcid
```

## Development Setup

### 1. Determine Your Development URL

Your development server runs on:
- Default: `http://localhost:3000`
- If port 3000 is in use: `http://localhost:3001` (or next available port)

Check which port your dev server is using by looking at the terminal output when you run `bun run dev`.

### 2. Configure AUTH_URL in .env

Update your `.env` file with the correct development URL:

```bash
# For port 3000
AUTH_URL=http://localhost:3000

# OR for port 3001 (if 3000 is in use)
AUTH_URL=http://localhost:3001
```

### 3. Register Redirect URL in ORCID

**⚠️ IMPORTANT:** ORCID's production environment **does not accept localhost URLs**. You have several options:

#### Option A: Use ORCID Sandbox (Recommended for Development)

1. Go to https://sandbox.orcid.org/developer-tools
2. Sign in (or create a test account at https://sandbox.orcid.org/register)
3. Register a new application
4. Add redirect URI: `http://localhost:3001/api/auth/callback/orcid`
5. Copy the Client ID and Client Secret
6. Set `ORCID_USE_SANDBOX=true` in your `.env` file

#### Option B: Use a Tunneling Service (ngrok)

1. Install ngrok: `brew install ngrok`
2. Start your dev server: `bun run dev`
3. In another terminal: `ngrok http 3001`
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
5. Register in production ORCID: `https://abc123.ngrok.io/api/auth/callback/orcid`
6. Update `AUTH_URL` in `.env` to the ngrok URL

**For more details and other alternatives, see [ORCID_DEVELOPMENT_ALTERNATIVES.md](./ORCID_DEVELOPMENT_ALTERNATIVES.md)**

5. Copy the **Client ID** and **Client Secret**
6. Update your `.env` file:
   ```bash
   ORCID_CLIENT_ID=your_client_id_here
   ORCID_CLIENT_SECRET=your_client_secret_here
   ```

### 4. Test Development Login

1. Start your dev server: `bun run dev`
2. Navigate to `http://localhost:3001/sign-in` (or your port)
3. Click "Sign in with ORCID"
4. You should be redirected to ORCID for authentication
5. After authorizing, you should be redirected back to your app

## Production Setup

### 1. Determine Your Production URL

Your production URL will be your deployed domain, for example:
- `https://xray-atlas.vercel.app`
- `https://xray-atlas.com`
- `https://www.xray-atlas.com`

### 2. Configure AUTH_URL for Production

In your production environment (Vercel, etc.), set the `AUTH_URL` environment variable:

```bash
AUTH_URL=https://your-production-domain.com
```

**Note:** On Vercel, NextAuth automatically detects the URL from `VERCEL_URL`, so you may not need to set `AUTH_URL` explicitly. However, it's recommended to set it for clarity.

### 3. Register Production Redirect URL in ORCID

1. Go to https://orcid.org/developer-tools
2. Edit your application
3. Add the production redirect URI:
   ```
   https://your-production-domain.com/api/auth/callback/orcid
   ```

   **Important:** You can add multiple redirect URIs to the same ORCID application. Add both:
   - Development: `http://localhost:3001/api/auth/callback/orcid`
   - Production: `https://your-production-domain.com/api/auth/callback/orcid`

### 4. Update Production Environment Variables

In your hosting platform (Vercel, etc.), set:
- `AUTH_SECRET` (same as development, or generate a new one)
- `AUTH_URL` (your production URL)
- `ORCID_CLIENT_ID` (same as development)
- `ORCID_CLIENT_SECRET` (same as development)

## Troubleshooting

### Redirect URL Mismatch Error

If you see an error like "redirect_uri_mismatch", check:

1. **Exact URL match**: The redirect URL in ORCID must match exactly, including:
   - Protocol (`http://` vs `https://`)
   - Port number (if using non-standard port)
   - Trailing slashes (should NOT have trailing slash)

### "Invalid redirect URL" Error in ORCID

If ORCID shows "Invalid redirect URL" when adding localhost:

1. **Use HTTP, not HTTPS for localhost**: ORCID requires `http://localhost` (not `https://localhost`) because localhost doesn't have SSL certificates
   - ✅ Correct: `http://localhost:3001/api/auth/callback/orcid`
   - ❌ Wrong: `https://localhost:3001/api/auth/callback/orcid`

2. **Check URL format**: Ensure no trailing slashes and correct port number

2. **Check AUTH_URL**: Verify your `AUTH_URL` environment variable matches your actual URL

3. **Check ORCID settings**: Ensure the redirect URI in ORCID exactly matches:
   ```
   [AUTH_URL]/api/auth/callback/orcid
   ```

### Development Port Changes

If your dev server uses a different port:
1. Update `AUTH_URL` in `.env`
2. Update the redirect URI in ORCID to match
3. Restart your dev server

### Multiple Environments

You can use the same ORCID application for multiple environments by adding multiple redirect URIs:
- `http://localhost:3000/api/auth/callback/orcid`
- `http://localhost:3001/api/auth/callback/orcid`
- `https://staging.yourdomain.com/api/auth/callback/orcid`
- `https://yourdomain.com/api/auth/callback/orcid`

## Quick Reference

### Development Callback URL
```
http://localhost:3001/api/auth/callback/orcid
```
**Important:** Use `http://` (not `https://`) for localhost URLs. ORCID will reject HTTPS localhost URLs.
(Replace `3001` with your actual port)

### Production Callback URL
```
https://your-production-domain.com/api/auth/callback/orcid
```

### Environment Variables Needed

**Development (.env):**
```bash
AUTH_SECRET=your_generated_secret
AUTH_URL=http://localhost:3001
ORCID_CLIENT_ID=your_orcid_client_id
ORCID_CLIENT_SECRET=your_orcid_client_secret
```

**Production (Vercel/etc.):**
```bash
AUTH_SECRET=your_generated_secret
AUTH_URL=https://your-production-domain.com
ORCID_CLIENT_ID=your_orcid_client_id
ORCID_CLIENT_SECRET=your_orcid_client_secret
```
