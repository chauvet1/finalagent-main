# Environment Configuration Guide

This guide explains how the BahinLink system handles environment configuration to work seamlessly across local development and production deployment.

## Overview

The system uses a centralized environment configuration approach that:
- ✅ Works in both local development and production
- ✅ Automatically detects the current environment
- ✅ Prevents hardcoded localhost URLs in production
- ✅ Provides fallback defaults for all environments
- ✅ Validates required configuration on startup

## Environment Variables

### Required Variables

```bash
# Authentication (Required)
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_...

# Portal URLs (Optional - auto-detected if not set)
REACT_APP_CLIENT_PORTAL_URL=https://your-domain.com
REACT_APP_ADMIN_PORTAL_URL=https://your-domain.com/admin
REACT_APP_API_URL=https://your-domain.com/api
```

### Optional Variables

```bash
# App Configuration
REACT_APP_NAME=BahinLink
REACT_APP_VERSION=1.0.0

# Feature Flags
REACT_APP_ENABLE_DEBUG=true
REACT_APP_ENABLE_MOCK_DATA=true

# Build Configuration
GENERATE_SOURCEMAP=false
ESLINT_NO_DEV_ERRORS=true
TSC_COMPILE_ON_ERROR=true
```

## How It Works

### Local Development
- **Client Portal**: `http://localhost:3000`
- **Admin Portal**: `http://localhost:3002`
- **API**: `http://localhost:8000`

Environment variables override these defaults if provided.

### Production Deployment
- **Auto-detection**: Uses `window.location.origin` to detect current domain
- **Client Portal**: Current domain (e.g., `https://finalagent-main-eywj.vercel.app`)
- **Admin Portal**: Current domain + `/admin` (e.g., `https://finalagent-main-eywj.vercel.app/admin`)
- **API**: Current domain + `/api` (e.g., `https://finalagent-main-eywj.vercel.app/api`)

Environment variables override auto-detection if provided.

## Configuration Files

### Vercel Deployment
Update `vercel.json` with your actual domain:

```json
{
  "env": {
    "REACT_APP_API_URL": "https://your-actual-domain.vercel.app/api",
    "REACT_APP_ADMIN_PORTAL_URL": "https://your-actual-domain.vercel.app/admin",
    "REACT_APP_CLIENT_PORTAL_URL": "https://your-actual-domain.vercel.app",
    "REACT_APP_CLERK_PUBLISHABLE_KEY": "pk_test_..."
  }
}
```

### Local Development
Create `.env.local` files:

```bash
# client-portal/.env.local
REACT_APP_CLIENT_PORTAL_URL=http://localhost:3000
REACT_APP_ADMIN_PORTAL_URL=http://localhost:3002
REACT_APP_API_URL=http://localhost:8000
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_...

# admin-portal/.env.local
REACT_APP_CLIENT_PORTAL_URL=http://localhost:3000
REACT_APP_ADMIN_PORTAL_URL=http://localhost:3002
REACT_APP_API_URL=http://localhost:8000
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_...
```

## Testing Configuration

### Automatic Testing
The system automatically runs environment tests in development mode. Check the browser console for:
- ✅ Environment config loaded successfully
- ✅ Environment validation passed
- ✅ Portal URLs are valid
- ✅ No localhost URLs in production

### Manual Testing
```typescript
import { runAllEnvironmentTests } from './utils/environmentTest';

// Run comprehensive environment tests
runAllEnvironmentTests();
```

### Debug Information
```typescript
import { debugEnvironmentConfig } from './config/environment';

// Show detailed environment configuration
debugEnvironmentConfig();
```

## Troubleshooting

### Issue: Redirects to localhost in production
**Solution**: Update `vercel.json` with correct domain URLs

### Issue: Environment variables not loading
**Solution**: 
1. Check variable names start with `REACT_APP_`
2. Restart development server after adding variables
3. Verify Vercel environment variables are set correctly

### Issue: CORS errors in production
**Solution**: Ensure API URL matches your backend deployment URL

### Issue: Authentication not working
**Solution**: Verify `REACT_APP_CLERK_PUBLISHABLE_KEY` is set correctly

## Best Practices

1. **Never hardcode URLs** - Always use environment configuration
2. **Test in production-like environment** before deploying
3. **Use environment variables** for all external URLs
4. **Validate configuration** on app startup
5. **Keep sensitive keys secure** - never commit them to git

## File Structure

```
src/
├── config/
│   └── environment.ts          # Centralized environment config
├── utils/
│   ├── navigationUtils.ts      # Navigation with environment-aware URLs
│   └── environmentTest.ts      # Environment testing utilities
└── services/
    └── api.ts                  # API client with environment-aware URLs
```

## Migration from Hardcoded URLs

If you have existing hardcoded URLs, replace them with:

```typescript
// ❌ Old way
const CLIENT_URL = 'http://localhost:3000';
const ADMIN_URL = 'http://localhost:3002';

// ✅ New way
import { PORTAL_URLS } from './config/environment';
const CLIENT_URL = PORTAL_URLS.client;
const ADMIN_URL = PORTAL_URLS.admin;
```

## Support

For issues with environment configuration:
1. Check browser console for environment test results
2. Run `debugEnvironmentConfig()` to see current configuration
3. Verify all required environment variables are set
4. Test in both development and production environments
