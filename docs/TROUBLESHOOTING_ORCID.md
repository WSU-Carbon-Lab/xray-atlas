# Troubleshooting ORCID Authentication

## Common Issues and Solutions

### Issue: "Invalid client id" Error

**Symptoms:**
- Error message: "The provided client id APP-XXXXX is invalid"
- You're on sandbox.orcid.org but using production client ID (or vice versa)

**Causes:**
1. Server not restarted after updating `.env` file
2. Wrong client ID for the environment (sandbox vs production)
3. Environment variables not being loaded correctly

**Solutions:**

1. **Restart your dev server:**
   ```bash
   # Stop the current server (Ctrl+C)
   # Then restart
   bun run dev
   ```

2. **Verify your .env file:**
   ```bash
   cat .env | grep ORCID
   ```
   
   Should show:
   ```bash
   ORCID_CLIENT_ID=APP-AYPOSB8GP6KN7ZF2  # Sandbox ID
   ORCID_CLIENT_SECRET=97371d81-c2bc-4108-8de3-dc86c7c1d601
   ORCID_USE_SANDBOX=true
   ```

3. **Check server logs:**
   When the server starts, you should see:
   ```
   [ORCID Config] Using: {
     baseUrl: 'https://sandbox.orcid.org',
     clientId: 'APP-AYPOSB8GP6KN7ZF2',
     useSandbox: 'true'
   }
   ```

4. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   bun run dev
   ```

### Issue: Redirect URI Mismatch

**Symptoms:**
- Redirected back from ORCID but shows error
- "redirect_uri_mismatch" error

**Solutions:**

1. **Verify redirect URI in ORCID matches exactly:**
   - Sandbox: `http://localhost:3001/api/auth/callback/orcid`
   - Production: `https://xrayatlas.wsu.edu/api/auth/callback/orcid`

2. **Check AUTH_URL in .env:**
   ```bash
   AUTH_URL=http://localhost:3001  # For development
   ```

3. **Ensure no trailing slashes** in redirect URI

### Issue: Nothing Displaying After Sign In

**Symptoms:**
- Click "Sign in with ORCID"
- Redirected to ORCID
- After authorizing, blank page or error

**Debugging Steps:**

1. **Check browser console** for errors
2. **Check network tab** for failed requests
3. **Check server logs** for errors
4. **Verify callback URL** is registered in ORCID

**Common Causes:**
- Redirect URI not registered in ORCID
- Wrong AUTH_URL configuration
- CORS issues
- Session storage issues

### Issue: Wrong Environment Being Used

**Symptoms:**
- Expecting sandbox but using production (or vice versa)
- Wrong ORCID URL in browser

**Solutions:**

1. **Check ORCID_USE_SANDBOX value:**
   ```bash
   # Should be exactly "true" (string)
   ORCID_USE_SANDBOX=true
   ```

2. **Verify in server logs:**
   Look for the `[ORCID Config]` log message on server start

3. **Check which ORCID URL is being used:**
   - Sandbox: `https://sandbox.orcid.org/oauth/authorize`
   - Production: `https://orcid.org/oauth/authorize`

### Debugging Checklist

- [ ] `.env` file has correct credentials
- [ ] `ORCID_USE_SANDBOX=true` for sandbox (or `false`/unset for production)
- [ ] Server restarted after `.env` changes
- [ ] Redirect URI registered in correct ORCID environment
- [ ] `AUTH_URL` matches your actual app URL
- [ ] Browser console shows no errors
- [ ] Server logs show correct ORCID configuration
- [ ] Test account created (for sandbox: at sandbox.orcid.org)

### Quick Debug Command

Check what the server is actually using:

```bash
# In your terminal, after starting the server, look for:
# [ORCID Config] Using: { baseUrl: '...', clientId: '...', useSandbox: '...' }
```

### Environment Variable Verification

Create a test endpoint to verify env vars (temporary, for debugging):

```typescript
// src/app/api/debug-auth/route.ts (temporary file)
import { env } from "~/env";

export async function GET() {
  return Response.json({
    hasClientId: !!env.ORCID_CLIENT_ID,
    clientIdPrefix: env.ORCID_CLIENT_ID?.substring(0, 10),
    useSandbox: env.ORCID_USE_SANDBOX,
    authUrl: env.AUTH_URL,
  });
}
```

Then visit: `http://localhost:3001/api/debug-auth`

**Remember to delete this file after debugging!**
