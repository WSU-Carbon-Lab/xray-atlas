# Switching Between ORCID Sandbox and Production

This guide explains how to configure your application to use either ORCID Sandbox (for development/testing) or ORCID Production (for live users).

## How It Works

The application automatically switches between sandbox and production based on the `ORCID_USE_SANDBOX` environment variable:

- `ORCID_USE_SANDBOX=true` → Uses `https://sandbox.orcid.org`
- `ORCID_USE_SANDBOX=false` or unset → Uses `https://orcid.org`

## Current Configuration

### Development (Sandbox) - Current Setup

Your `.env` file is configured for sandbox:

```bash
ORCID_CLIENT_ID=APP-AYPOSB8GP6KN7ZF2
ORCID_CLIENT_SECRET=97371d81-c2bc-4108-8de3-dc86c7c1d601
ORCID_USE_SANDBOX=true
AUTH_URL=http://localhost:3001
```

**Sandbox Redirect URI:** `http://localhost:3001/api/auth/callback/orcid`

**Note:** The email mentioned redirect URI as `https://xrayatlas.wsu.edu/` but it should be:
```
https://xrayatlas.wsu.edu/api/auth/callback/orcid
```

You'll need to update this in the ORCID sandbox developer tools.

### Production Configuration

When ready for production, update your `.env` (or production environment variables):

```bash
ORCID_CLIENT_ID=your_production_client_id
ORCID_CLIENT_SECRET=your_production_client_secret
ORCID_USE_SANDBOX=false
AUTH_URL=https://xrayatlas.wsu.edu
```

**Production Redirect URI:** `https://xrayatlas.wsu.edu/api/auth/callback/orcid`

## Switching Environments

### To Use Sandbox (Development)

1. Set in `.env`:
   ```bash
   ORCID_USE_SANDBOX=true
   ORCID_CLIENT_ID=APP-AYPOSB8GP6KN7ZF2
   ORCID_CLIENT_SECRET=97371d81-c2bc-4108-8de3-dc86c7c1d601
   AUTH_URL=http://localhost:3001
   ```

2. Restart your dev server

3. Users will authenticate against `https://sandbox.orcid.org`

### To Use Production

1. Get production credentials from ORCID (contact ORCID support or your consortium lead)

2. Set in `.env` (or production environment):
   ```bash
   ORCID_USE_SANDBOX=false
   ORCID_CLIENT_ID=your_production_client_id
   ORCID_CLIENT_SECRET=your_production_client_secret
   AUTH_URL=https://xrayatlas.wsu.edu
   ```

3. Restart your server

4. Users will authenticate against `https://orcid.org`

## Important Notes

### Sandbox Environment

- ✅ Accepts `http://localhost` redirect URIs
- ✅ Test data only (separate from production)
- ✅ Free to use
- ✅ Create test accounts at https://sandbox.orcid.org/register
- ⚠️ Emails only sent to @mailinator.com addresses

### Production Environment

- ❌ Does NOT accept `http://localhost` redirect URIs
- ✅ Real ORCID accounts
- ✅ Requires registered redirect URIs
- ⚠️ Must use HTTPS for redirect URIs

## Redirect URI Configuration

### Sandbox Redirect URIs

Register these in https://sandbox.orcid.org/developer-tools:

1. `http://localhost:3001/api/auth/callback/orcid` (development)
2. `https://xrayatlas.wsu.edu/api/auth/callback/orcid` (production testing)

### Production Redirect URIs

Register these in https://orcid.org/developer-tools:

1. `https://xrayatlas.wsu.edu/api/auth/callback/orcid` (production)

## Testing Checklist

### Sandbox Testing

- [ ] `ORCID_USE_SANDBOX=true` in `.env`
- [ ] Sandbox credentials configured
- [ ] Redirect URI registered in sandbox: `http://localhost:3001/api/auth/callback/orcid`
- [ ] Test account created at https://sandbox.orcid.org/register
- [ ] Test account email is @mailinator.com
- [ ] Can sign in with test account

### Production Testing

- [ ] `ORCID_USE_SANDBOX=false` in production environment
- [ ] Production credentials configured
- [ ] Redirect URI registered in production: `https://xrayatlas.wsu.edu/api/auth/callback/orcid`
- [ ] `AUTH_URL=https://xrayatlas.wsu.edu` in production
- [ ] Can sign in with real ORCID account

## Environment-Specific Configuration

### Development (.env)

```bash
# Sandbox for development
ORCID_CLIENT_ID=APP-AYPOSB8GP6KN7ZF2
ORCID_CLIENT_SECRET=97371d81-c2bc-4108-8de3-dc86c7c1d601
ORCID_USE_SANDBOX=true
AUTH_URL=http://localhost:3001
```

### Production (Vercel/Deployment Platform)

```bash
# Production credentials
ORCID_CLIENT_ID=your_production_client_id
ORCID_CLIENT_SECRET=your_production_client_secret
ORCID_USE_SANDBOX=false
AUTH_URL=https://xrayatlas.wsu.edu
```

## Troubleshooting

### "Invalid redirect URL" Error

- **Sandbox:** Ensure using `http://localhost` (not `https://`)
- **Production:** Ensure using `https://` with your actual domain

### Wrong Environment Being Used

- Check `ORCID_USE_SANDBOX` value (must be exactly `"true"` or `"false"`)
- Restart your server after changing environment variables
- Check browser console for which ORCID URL is being used

### Can't Sign In

- Verify credentials match the environment (sandbox vs production)
- Check redirect URI is registered in the correct ORCID environment
- Ensure `AUTH_URL` matches your actual application URL
