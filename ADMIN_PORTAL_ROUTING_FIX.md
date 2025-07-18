# Admin Portal Routing Fix

## Issue
The admin portal was redirecting back to the landing page when accessing `/admin/sign-in` instead of showing the admin sign-in page.

## Root Cause
The admin portal's React Router was missing the `basename="/admin"` configuration, which is required for sub-path routing in a unified deployment.

## Fix Applied

### 1. Added basename to BrowserRouter
**File**: `admin-portal/src/index.tsx`
```tsx
// Before
<BrowserRouter
  future={{
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  }}
>

// After
<BrowserRouter
  basename="/admin"
  future={{
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  }}
>
```

### 2. Updated Build Configuration
**File**: `admin-portal/package.json`
```json
// Before
"build": "cross-env GENERATE_SOURCEMAP=false ESLINT_NO_DEV_ERRORS=true TSC_COMPILE_ON_ERROR=true SKIP_PREFLIGHT_CHECK=true react-scripts build"

// After
"build": "cross-env PUBLIC_URL=/admin GENERATE_SOURCEMAP=false ESLINT_NO_DEV_ERRORS=true TSC_COMPILE_ON_ERROR=true SKIP_PREFLIGHT_CHECK=true react-scripts build"
```

### 3. Updated Environment URLs
**File**: `admin-portal/.env.production`
```bash
# Updated to use correct domain
REACT_APP_API_URL=https://finalagent-main-eywj.vercel.app/api
REACT_APP_WS_URL=wss://finalagent-main-eywj.vercel.app
REACT_APP_CLIENT_PORTAL_URL=https://finalagent-main-eywj.vercel.app
REACT_APP_ADMIN_PORTAL_URL=https://finalagent-main-eywj.vercel.app/admin
```

### 4. Improved Vercel Routing
**File**: `vercel.json`
```json
"rewrites": [
  {
    "source": "/api/(.*)",
    "destination": "/backend/dist/server.js"
  },
  {
    "source": "/admin/static/(.*)",
    "destination": "/admin-portal/static/$1"
  },
  {
    "source": "/admin/(.*)",
    "destination": "/admin-portal/index.html"
  },
  {
    "source": "/(.*)",
    "destination": "/client-portal/index.html"
  }
]
```

## Expected Behavior After Fix

### ✅ Working URLs
- **Landing Page**: `https://finalagent-main-eywj.vercel.app/`
- **Client Login**: `https://finalagent-main-eywj.vercel.app/client/login`
- **Admin Sign-in**: `https://finalagent-main-eywj.vercel.app/admin/sign-in` ← **This should now work!**
- **Admin Dashboard**: `https://finalagent-main-eywj.vercel.app/admin/dashboard`

### 🔄 Routing Flow
1. User clicks "Admin Portal" button on landing page
2. Redirects to `https://finalagent-main-eywj.vercel.app/admin/sign-in`
3. Vercel routes `/admin/*` to admin portal's `index.html`
4. Admin portal's React Router (with `basename="/admin"`) handles the `/sign-in` route
5. Shows admin sign-in page instead of redirecting back to landing

## Testing
After deployment, test these scenarios:

1. **Direct URL Access**: Go directly to `https://finalagent-main-eywj.vercel.app/admin/sign-in`
   - ✅ Should show admin sign-in page
   - ❌ Should NOT redirect to landing page

2. **Navigation from Landing**: Click "Admin Portal" button on landing page
   - ✅ Should navigate to admin sign-in page
   - ❌ Should NOT redirect back to landing

3. **Admin Portal Navigation**: After signing in to admin portal
   - ✅ All admin routes should work correctly
   - ✅ Static assets should load properly

## Deployment Status
- **Commit**: `d9e3d44`
- **Status**: ✅ Pushed to repository
- **Vercel**: Will auto-deploy from repository
- **ETA**: Should be live within 2-3 minutes

## Verification Commands
```bash
# Check if admin portal is accessible
curl -I https://finalagent-main-eywj.vercel.app/admin/sign-in

# Should return 200 OK, not redirect
```

## Troubleshooting
If the issue persists after deployment:

1. **Clear browser cache** - Hard refresh (Ctrl+F5)
2. **Check Vercel deployment logs** - Verify build succeeded
3. **Test in incognito mode** - Rule out caching issues
4. **Check browser console** - Look for routing errors

The fix addresses the core routing issue and should resolve the admin portal redirection problem.
