# Next.js 404 Chunk Errors - Deployment Cache Issue

## Problem

After deploying, users see 404 errors for Next.js static chunks:

```
GET https://www.checkly-app.com/_next/static/css/90dfe46413bcaa97.css net::ERR_ABORTED 404
GET https://www.checkly-app.com/_next/static/chunks/app/layout-37ffba41d450f652.js net::ERR_ABORTED 404
ChunkLoadError: Loading chunk 7177 failed
```

## Root Cause

This happens when:

1. **New deployment** - Build hashes changed, but browser cached old HTML
2. **Incomplete deployment** - Files not fully uploaded yet
3. **CDN/Cache layer** - Serving stale HTML that references old chunks
4. **Browser cache** - Old service worker or cached assets

## Solutions

### 1. **Immediate Fix for Users** (Hard Refresh)

Users need to do a hard refresh:

- **Windows/Linux**: `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac**: `Cmd + Shift + R`
- **Mobile**: Clear browser cache in settings

### 2. **Deployment Configuration** (Recommended)

#### Option A: Add Cache Headers (Vercel/Netlify)

If using Vercel, add `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/_next/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/_next/static/chunks/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

#### Option B: Add Service Worker Cache Busting

If using a service worker, ensure it updates on new deployments.

### 3. **Next.js Configuration** (Prevent Future Issues)

Add to `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  // ... existing config

  // Ensure consistent build output
  generateBuildId: async () => {
    // Use git commit hash or timestamp for build ID
    return process.env.BUILD_ID || `build-${Date.now()}`;
  },

  // Add headers for static assets
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};
```

### 4. **Deployment Checklist**

Before deploying:

- [ ] Clear `.next` folder locally
- [ ] Run fresh build: `npm run build`
- [ ] Verify build completes successfully
- [ ] Check all static files are generated
- [ ] Deploy and wait for completion
- [ ] Test with incognito/private window

### 5. **CDN/Cache Layer** (If Applicable)

If using Cloudflare or similar:

1. Purge cache after deployment
2. Set cache rules:
   - HTML files: Short cache (5 minutes)
   - Static assets: Long cache (1 year, immutable)

### 6. **Client-Side Error Handling**

Add error boundary to handle chunk load errors gracefully:

```typescript
// Add to app/layout.tsx or _app.tsx
useEffect(() => {
  const handleChunkError = (event: ErrorEvent) => {
    if (event.message?.includes("ChunkLoadError") || event.message?.includes("Loading chunk")) {
      // Force page reload
      window.location.reload();
    }
  };

  window.addEventListener("error", handleChunkError);
  return () => window.removeEventListener("error", handleChunkError);
}, []);
```

## Prevention

1. **Always wait for deployment to complete** before testing
2. **Use versioned deployments** (not overwriting)
3. **Implement proper cache headers**
4. **Add error boundaries** for chunk load errors
5. **Monitor deployment logs** for missing files

## Quick Fix Script

Add to `package.json`:

```json
{
  "scripts": {
    "deploy": "npm run build && npm run deploy:platform",
    "deploy:clean": "rm -rf .next && npm run build && npm run deploy:platform"
  }
}
```

## Testing After Deployment

1. Open in **incognito/private window** (no cache)
2. Check browser console for 404s
3. Verify all chunks load correctly
4. Test navigation between pages
5. Check Network tab for failed requests
