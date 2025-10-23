# ORCID Authentication Setup Guide

This guide explains how to complete the ORCID authentication setup for the X-ray Atlas application.

## Overview

The application has been configured to use AWS Amplify with ORCID as the sole federated identity provider. Users can only sign in using their ORCID accounts, and the system automatically syncs their public ORCID profile data.

## Prerequisites

1. AWS Account with appropriate permissions
2. ORCID Developer Account
3. Node.js and npm installed

## Setup Steps

### 1. Register with ORCID

1. Go to [ORCID Developer Tools](https://orcid.org/developer-tools)
2. Sign in with your ORCID account
3. Click "Register for the free ORCID public API"
4. Fill out the application form:
   - **Application name**: X-ray Atlas
   - **Website URL**: Your application URL (e.g., `https://your-domain.com`)
   - **Description**: Brief description of your application
   - **Redirect URIs**:
     - `http://localhost:3000/sign-in` (for development)
     - `https://your-domain.com/sign-in` (for production)
5. Note down your **Client ID** and **Client Secret**

### 2. Deploy Amplify Backend

```bash
# Install Amplify CLI if not already installed
npm install -g @aws-amplify/cli

# Deploy the backend
npx ampx sandbox
```

This will create the necessary AWS resources and update `amplify_outputs.json`.

### 3. Configure ORCID in AWS Cognito

1. Go to the [AWS Cognito Console](https://console.aws.amazon.com/cognito/)
2. Find your User Pool (created by Amplify)
3. Go to "Federation" → "Identity providers"
4. Click "Add identity provider" → "OpenID Connect"
5. Configure:
   - **Provider name**: `ORCID`
   - **Issuer URL**: `https://orcid.org`
   - **Client ID**: Your ORCID Client ID
   - **Client Secret**: Your ORCID Client Secret
   - **Authorize scopes**: `openid email profile`
6. Click "Add identity provider"

### 4. Configure Attribute Mapping

1. In the same User Pool, go to "Attribute mapping"
2. Map the following attributes:
   - `sub` → `custom:orcid_id`
   - `email` → `email`
   - `name` → `name`

### 5. Update App Client Settings

1. Go to "App clients" in your User Pool
2. Select your app client
3. Go to "Hosted UI" settings
4. Add your callback URLs:
   - `http://localhost:3000/sign-in`
   - `https://your-domain.com/sign-in`
5. Add your sign-out URLs:
   - `http://localhost:3000/`
   - `https://your-domain.com/`
6. Enable the ORCID identity provider

### 6. Update Environment Variables

Create a `.env.local` file in your project root:

```env
NEXT_PUBLIC_ORCID_CLIENT_ID=your_orcid_client_id
```

### 7. Update Amplify Configuration

Update `amplify/auth/resource.ts` with your actual ORCID credentials:

```typescript
export const auth = defineAuth({
  loginWith: {
    externalProviders: {
      oidc: [
        {
          name: "ORCID",
          issuerUrl: "https://orcid.org",
          clientId: "YOUR_ACTUAL_ORCID_CLIENT_ID",
          clientSecret: "YOUR_ACTUAL_ORCID_CLIENT_SECRET",
          // ... rest of configuration
        },
      ],
      callbackUrls: [
        "http://localhost:3000/sign-in",
        "https://your-domain.com/sign-in",
      ],
      logoutUrls: ["http://localhost:3000/", "https://your-domain.com/"],
    },
  },
  // ... rest of configuration
});
```

### 8. Test the Setup

1. Start your development server:

   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/sign-in`
3. Click "Sign In with ORCID"
4. Complete the ORCID authentication flow
5. Verify that you're redirected back to the application

## Features Implemented

### Authentication

- ✅ ORCID-only authentication (no email/password)
- ✅ Automatic user profile creation on first sign-in
- ✅ ORCID profile data synchronization
- ✅ Sign out functionality

### User Profile Management

- ✅ View ORCID public profile data
- ✅ Add auxiliary email addresses
- ✅ Add contact information
- ✅ Profile picture support

### Organization Management

- ✅ Create organizations
- ✅ Join organizations
- ✅ View organization members
- ✅ Role-based permissions (Owner/Admin/Member)

### Route Protection

- ✅ Upload page requires authentication
- ✅ Profile page requires authentication
- ✅ Organization pages require authentication
- ✅ Public pages remain accessible

## Data Models

### User

- `orcid_id`: Primary identifier from ORCID
- `email`: Primary email from ORCID
- `auxiliary_emails`: Additional email addresses
- `contact_info`: Additional contact information
- `profile_picture_url`: Profile picture URL
- `name`: Display name
- `created_at`, `updated_at`: Timestamps

### Organization

- `id`: Unique identifier
- `name`: Organization name
- `description`: Organization description
- `created_at`, `updated_at`: Timestamps

### OrganizationMember

- `user_id`: Reference to User
- `organization_id`: Reference to Organization
- `role`: OWNER, ADMIN, or MEMBER
- `joined_at`: When the user joined

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI" error**

   - Ensure your ORCID app redirect URIs match exactly
   - Check that the URLs in Cognito match your ORCID configuration

2. **"Client not found" error**

   - Verify your ORCID Client ID and Secret are correct
   - Ensure the ORCID app is active

3. **"Attribute mapping" errors**

   - Check that the attribute mapping in Cognito is correct
   - Ensure the custom attribute `orcid_id` is created

4. **CORS errors**
   - Make sure your domain is added to ORCID's allowed origins
   - Check that your callback URLs are properly configured

### Getting Help

- Check the [AWS Amplify documentation](https://docs.amplify.aws/)
- Review the [ORCID API documentation](https://info.orcid.org/documentation/)
- Check the application logs for detailed error messages

## Security Considerations

- Never commit ORCID credentials to version control
- Use environment variables for sensitive configuration
- Regularly rotate ORCID client secrets
- Monitor authentication logs for suspicious activity
- Implement proper error handling to avoid information leakage
