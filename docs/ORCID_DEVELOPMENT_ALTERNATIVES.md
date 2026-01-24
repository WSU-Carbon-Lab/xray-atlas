# ORCID Development Alternatives (Localhost Not Supported)

ORCID's production environment **does not accept localhost URLs** for redirect URIs. This document outlines several alternatives for development testing.

## Option 1: Use ORCID Sandbox Environment (Recommended)

ORCID provides a sandbox environment that accepts HTTP URLs, including localhost.

### Setup Steps

1. **Register a Sandbox Application:**
   - Go to https://sandbox.orcid.org/developer-tools
   - Sign in (or create a test account at https://sandbox.orcid.org/register)
   - Register a new application
   - Add redirect URI: `http://localhost:3001/api/auth/callback/orcid`
   - Copy the Client ID and Client Secret

2. **Update Your .env File:**
   ```bash
   ORCID_CLIENT_ID=your_sandbox_client_id
   ORCID_CLIENT_SECRET=your_sandbox_client_secret
   ORCID_USE_SANDBOX=true
   AUTH_URL=http://localhost:3001
   ```

3. **Create Test Accounts:**
   - Register test users at https://sandbox.orcid.org/register
   - Note: Sandbox only sends emails to @mailinator.com addresses

### Advantages
- ✅ Accepts localhost URLs
- ✅ Free to use
- ✅ Separate from production data
- ✅ No additional setup required

### Disadvantages
- ⚠️ Requires separate credentials
- ⚠️ Test data only

---

## Option 2: Use a Tunneling Service (ngrok/Cloudflare Tunnel)

Use a tunneling service to expose your localhost as a public HTTPS URL.

### Using ngrok

1. **Install ngrok:**
   ```bash
   brew install ngrok  # macOS
   # or download from https://ngrok.com/download
   ```

2. **Start your dev server:**
   ```bash
   bun run dev
   ```

3. **Start ngrok tunnel:**
   ```bash
   ngrok http 3001
   ```

4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

5. **Register in ORCID:**
   - Add redirect URI: `https://abc123.ngrok.io/api/auth/callback/orcid`
   - Note: Free ngrok URLs change on restart, paid plans have fixed domains

6. **Update .env:**
   ```bash
   AUTH_URL=https://abc123.ngrok.io
   ORCID_CLIENT_ID=your_production_client_id
   ORCID_CLIENT_SECRET=your_production_client_secret
   ```

### Using Cloudflare Tunnel (cloudflared)

1. **Install cloudflared:**
   ```bash
   brew install cloudflared
   ```

2. **Start tunnel:**
   ```bash
   cloudflared tunnel --url http://localhost:3001
   ```

3. **Use the provided HTTPS URL** in ORCID

### Advantages
- ✅ Uses production ORCID credentials
- ✅ Real HTTPS URL
- ✅ Works with production ORCID

### Disadvantages
- ⚠️ Requires additional service
- ⚠️ Free ngrok URLs change on restart
- ⚠️ Slight latency overhead

---

## Option 3: Use a Local Domain Alias

Map a custom domain to localhost using your hosts file.

### Setup Steps

1. **Edit your hosts file:**
   ```bash
   sudo nano /etc/hosts
   ```

2. **Add this line:**
   ```
   127.0.0.1 xrayatlas.local
   ```

3. **Register in ORCID:**
   - Add redirect URI: `http://xrayatlas.local:3001/api/auth/callback/orcid`
   - Note: You may need to use a subdomain you own

4. **Update .env:**
   ```bash
   AUTH_URL=http://xrayatlas.local:3001
   ```

5. **Access your app at:**
   ```
   http://xrayatlas.local:3001
   ```

### Advantages
- ✅ No external services
- ✅ Works with production ORCID (if you own the domain)

### Disadvantages
- ⚠️ May not work if ORCID validates domain ownership
- ⚠️ Requires manual hosts file editing

---

## Option 4: Use a Staging Environment

Deploy a staging version of your app and use that for development testing.

### Setup Steps

1. **Deploy to staging** (e.g., Vercel preview deployment)
2. **Register staging URL in ORCID:**
   - `https://staging.xrayatlas.wsu.edu/api/auth/callback/orcid`
3. **Use staging for development testing**

### Advantages
- ✅ Production-like environment
- ✅ Real HTTPS
- ✅ Works with production ORCID

### Disadvantages
- ⚠️ Requires deployment for each change
- ⚠️ Slower development cycle

---

## Recommended Approach

**For Development:**
- Use **Option 1 (ORCID Sandbox)** - It's the easiest and designed for this purpose

**For Quick Testing:**
- Use **Option 2 (ngrok)** - If you need to test with production ORCID quickly

**For Production:**
- Use your production domain: `https://xrayatlas.wsu.edu/api/auth/callback/orcid`

---

## Environment Variable Summary

### Development with Sandbox
```bash
ORCID_CLIENT_ID=your_sandbox_client_id
ORCID_CLIENT_SECRET=your_sandbox_client_secret
ORCID_USE_SANDBOX=true
AUTH_URL=http://localhost:3001
```

### Development with ngrok
```bash
ORCID_CLIENT_ID=your_production_client_id
ORCID_CLIENT_SECRET=your_production_client_secret
ORCID_USE_SANDBOX=false  # or omit
AUTH_URL=https://your-ngrok-url.ngrok.io
```

### Production
```bash
ORCID_CLIENT_ID=your_production_client_id
ORCID_CLIENT_SECRET=your_production_client_secret
ORCID_USE_SANDBOX=false  # or omit
AUTH_URL=https://xrayatlas.wsu.edu
```
