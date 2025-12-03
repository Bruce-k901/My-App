# Hydration Root Cause Analysis 🔍

## The Real Problem

**Next.js App Router SSR + Client Components with Async Context = Hydration Mismatches**

### Architecture Issue

1. **Root Layout** (`src/app/layout.tsx`) is a **Server Component** (no "use client")
2. **AppProvider** (`src/context/AppContext.tsx`) is a **Client Component** ("use client")
3. **Dashboard Layout** (`src/app/dashboard/layout.tsx`) is a **Client Component** that uses `useAppContext()`

### What Happens

1. **Server Render:**
   - Next.js renders `RootLayout` (Server Component)
   - AppProvider initializes with `loading: false`, `user: null`, `session: null`
   - DashboardLayout renders with these initial values
   - Server HTML sent to client

2. **Client Hydration:**
   - React receives server HTML
   - AppProvider's `useEffect` runs, sets `loading: true`, fetches session
   - AppContext values change
   - DashboardLayout re-renders with new values
   - **MISMATCH**: Server HTML doesn't match client HTML

### The Smoking Gun

```typescript
// AppContext.tsx line 40-42
const [loading, setLoading] = useState(false); // Server: false
// ...
useEffect(() => {
  setIsMounted(true);
  setLoading(true); // Client: true (after mount)
  // ...
}, []);
```

**Server renders with `loading: false`, client hydrates with `loading: false` then immediately changes to `loading: true`** → Components that depend on `loading` render differently.

## Why This Started 2-3 Weeks Ago

Likely causes:

1. **Next.js 15 upgrade** - Changed how SSR works for client components
2. **AppContext refactor** - Changed initial state from `loading: true` to `loading: false`
3. **Dashboard layout changes** - Started using AppContext values that differ on server vs client

## The Fix

**Option 1: Make Dashboard Layout Client-Only (No SSR)**

- Use `dynamic` import with `ssr: false`
- Prevents server rendering entirely

**Option 2: Ensure Consistent Initial State**

- AppContext must provide same values on server and client
- Use `suppressHydrationWarning` strategically
- Don't conditionally render based on context values that change after mount

**Option 3: Move to Server Components**

- Use Next.js 15 Server Components for layout
- Fetch data on server, pass as props
- Only use client components for interactive parts

## Recommended Fix

Make the dashboard layout truly client-only to prevent SSR hydration issues.
