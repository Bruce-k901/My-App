# React2Shell Vulnerability (CVE-2025-55182) - Security Check Guide

## 🔴 Critical Vulnerability Overview

**CVE-2025-55182 (React2Shell)** is a critical remote code execution (RCE) vulnerability in React Server Components with a CVSS score of 10.0.

**Affected Versions:**

- React: 19.0.0, 19.1.0, 19.1.1, **19.2.0** ❌
- Next.js: 15.x and 16.x (App Router)
- React Server Components packages: `react-server-dom-webpack`, `react-server-dom-parcel`, `react-server-dom-turbopack`

**Patched Versions:**

- React: **19.0.1, 19.1.2, 19.2.1+** ✅
- Next.js: **15.0.5+, 15.1.9+, 15.2.6+, 15.3.6+, 15.4.8+, 15.5.7+, 16.0.7+** ✅

---

## ✅ How to Check Your Protection Status

### Method 1: Check package.json

```bash
# Check your current React version
npm list react react-dom next
```

**Expected Output (Protected):**

```
react@19.2.1
react-dom@19.2.1
next@16.0.7
```

### Method 2: Check package-lock.json

```bash
# Search for React version in lock file
grep -A 2 '"node_modules/react"' package-lock.json | grep version
```

**Should show:** `"version": "19.2.1"` or higher

### Method 3: Use npm audit

```bash
# Check for known vulnerabilities
npm audit

# Check specifically for React2Shell
npm audit | grep -i "react2shell\|CVE-2025-55182"
```

### Method 4: Manual version check

Open `package.json` and verify:

```json
{
  "dependencies": {
    "react": "^19.2.1", // ✅ Must be 19.2.1 or higher
    "react-dom": "^19.2.1", // ✅ Must be 19.2.1 or higher
    "next": "^16.0.7" // ✅ Must be 16.0.7 or higher
  }
}
```

---

## 🔧 How to Fix (If Vulnerable)

### Step 1: Update package.json

```json
{
  "dependencies": {
    "react": "^19.2.1",
    "react-dom": "^19.2.1"
  }
}
```

### Step 2: Update dependencies

```bash
npm install
# or
npm update react react-dom
```

### Step 3: Verify the update

```bash
npm list react react-dom
```

### Step 4: Rebuild your application

```bash
npm run build
```

### Step 5: Test your application

```bash
npm run dev
# Test all Server Component functionality
```

---

## 🛡️ Additional Protection Measures

### 1. Enable WAF (Web Application Firewall)

If using Vercel, Cloudflare, or AWS, enable WAF rules that detect React2Shell exploit attempts.

### 2. Monitor Server Logs

Watch for unusual patterns in server logs:

- Unexpected serialization errors
- Suspicious payloads in RSC requests
- Unauthorized code execution attempts

### 3. Keep Dependencies Updated

```bash
# Check for outdated packages regularly
npm outdated

# Update all dependencies (be careful!)
npm update
```

### 4. Use Dependency Scanning Tools

- **GitHub Dependabot**: Automatically creates PRs for security updates
- **Snyk**: `npx snyk test`
- **npm audit**: `npm audit fix`

---

## 🔍 Verification Checklist

- [ ] React version is 19.2.1 or higher
- [ ] react-dom version is 19.2.1 or higher
- [ ] Next.js version is 16.0.7 or higher (if using Next.js)
- [ ] `npm audit` shows no critical vulnerabilities
- [ ] Application builds successfully after update
- [ ] Server Components still work correctly
- [ ] No runtime errors in production

---

## 📚 Resources

- **Official CVE**: CVE-2025-55182
- **React Security Advisory**: https://react.dev/blog/security
- **Next.js Security**: https://nextjs.org/docs/app/building-your-application/security
- **React2Shell Info**: https://react2shell.info

---

## ⚠️ Important Notes

1. **This vulnerability affects Server Components only** - Client-side React is not affected
2. **Next.js App Router uses Server Components by default** - Your app is at risk if using Next.js 15/16
3. **The vulnerability allows unauthenticated RCE** - Extremely dangerous, patch immediately
4. **Exploitation began within hours** - Don't delay patching

---

## 🚨 Current Status

**Last Checked:** $(date)
**React Version:** Check with `npm list react`
**Status:** ⚠️ **ACTION REQUIRED** - Update React to 19.2.1+

---

## Quick Check Command

Run this one-liner to check your protection status:

```bash
npm list react react-dom next 2>/dev/null | grep -E "react@|react-dom@|next@" | awk '{print $2}' | sed 's/@//' | while read pkg ver; do echo "$pkg: $ver"; done
```

Or simply:

```bash
npm list react react-dom next
```
