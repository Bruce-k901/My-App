# Domain Setup Guide: checkly-app.com

This guide will help you connect your custom domain `checkly-app.com` to your Vercel deployment.

## Prerequisites

- ✅ Your domain `checkly-app.com` is registered with a domain registrar
- ✅ Access to your domain registrar's DNS management panel
- ✅ Your app is deployed on Vercel

---

## Step 1: Add Domain in Vercel Dashboard

1. **Go to your Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your project (My-App)

2. **Navigate to Domain Settings**
   - Click on **Settings** tab
   - Click on **Domains** in the left sidebar

3. **Add Your Domain**
   - Click **Add Domain** button
   - Enter: `checkly-app.com`
   - Click **Add**

4. **Vercel will show you DNS records to configure**
   - You'll see something like:

     ```
     Type: A
     Name: @
     Value: 76.76.21.21

     Type: CNAME
     Name: www
     Value: cname.vercel-dns.com
     ```

---

## Step 2: Configure DNS Records at Your Domain Registrar

You need to add DNS records at your domain registrar (where you bought checkly-app.com).

### Option A: Root Domain (checkly-app.com)

**If your registrar supports A records for root domains:**

1. Log into your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)
2. Go to DNS Management / DNS Settings
3. Add these records:

   **Record 1:**
   - **Type:** `A`
   - **Name/Host:** `@` (or leave blank, or `checkly-app.com`)
   - **Value/Points to:** `76.76.21.21` (Vercel's IP - check Vercel dashboard for current IP)
   - **TTL:** `3600` (or default)

   **Record 2:**
   - **Type:** `CNAME`
   - **Name/Host:** `www`
   - **Value/Points to:** `cname.vercel-dns.com`
   - **TTL:** `3600` (or default)

### Option B: Using CNAME Flattening (Recommended)

**If your registrar supports CNAME flattening (Cloudflare, some others):**

1. Add CNAME record:
   - **Type:** `CNAME`
   - **Name/Host:** `@` (or root)
   - **Value/Points to:** `cname.vercel-dns.com`
   - **TTL:** `3600`

2. Add www subdomain:
   - **Type:** `CNAME`
   - **Name/Host:** `www`
   - **Value/Points to:** `cname.vercel-dns.com`
   - **TTL:** `3600`

### Option C: Using Cloudflare (If using Cloudflare)

1. **Add DNS Records in Cloudflare:**
   - Go to Cloudflare Dashboard → Your Domain → DNS
   - Add:
     - **Type:** `CNAME`
     - **Name:** `@`
     - **Target:** `cname.vercel-dns.com`
     - **Proxy status:** 🟠 Proxied (Orange cloud)
   - Add:
     - **Type:** `CNAME`
     - **Name:** `www`
     - **Target:** `cname.vercel-dns.com`
     - **Proxy status:** 🟠 Proxied (Orange cloud)

2. **Important:** Make sure SSL/TLS encryption mode is set to **Full** or **Full (strict)** in Cloudflare SSL/TLS settings

---

## Step 3: Verify Domain in Vercel

1. **Wait for DNS Propagation**
   - DNS changes can take 5 minutes to 48 hours
   - Usually takes 5-30 minutes

2. **Check Domain Status in Vercel**
   - Go back to Vercel Dashboard → Settings → Domains
   - You should see `checkly-app.com` with status:
     - ✅ **Valid Configuration** (green checkmark)
     - ⏳ **Pending** (waiting for DNS)
     - ❌ **Invalid Configuration** (check DNS records)

3. **Vercel will automatically:**
   - Issue SSL certificate (Let's Encrypt)
   - Configure HTTPS
   - Set up redirects

---

## Step 4: Configure Next.js for Custom Domain

Update your Next.js configuration if needed:

### Update `next.config.js` (if exists)

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing config...
};

module.exports = nextConfig;
```

**Note:** Vercel handles domain configuration automatically, so you typically don't need to change Next.js config.

---

## Step 5: Update Environment Variables (If Needed)

If your app uses absolute URLs, you may need to update environment variables:

1. **In Vercel Dashboard:**
   - Go to **Settings** → **Environment Variables**
   - Add/Update:
     ```
     NEXT_PUBLIC_APP_URL=https://checkly-app.com
     ```
   - Apply to: Production, Preview, Development

2. **Redeploy** (Vercel will auto-redeploy when you add env vars)

---

## Step 6: Test Your Domain

1. **Wait for DNS propagation** (check with: https://dnschecker.org)
2. **Visit your domain:**
   - http://checkly-app.com
   - https://checkly-app.com (should auto-redirect to HTTPS)
   - http://www.checkly-app.com (should redirect to root)

3. **Verify SSL Certificate:**
   - Check that the padlock icon shows in browser
   - Certificate should be issued by Let's Encrypt

---

## Troubleshooting

### Domain Not Resolving

1. **Check DNS propagation:**
   - Visit: https://dnschecker.org
   - Enter: `checkly-app.com`
   - Check if A/CNAME records are propagated globally

2. **Verify DNS records:**
   - Double-check records match what Vercel shows
   - Ensure no typos in IP addresses or CNAME values

3. **Wait longer:**
   - Some DNS changes take up to 48 hours
   - Clear your browser cache and DNS cache:
     ```bash
     # Windows
     ipconfig /flushdns
     ```

### SSL Certificate Not Issuing

1. **Check domain status in Vercel:**
   - Ensure domain shows "Valid Configuration"
   - If it shows errors, fix DNS records first

2. **Wait for certificate:**
   - SSL certificates are issued automatically by Vercel
   - Can take 5-60 minutes after DNS is configured

3. **Check Vercel logs:**
   - Go to Vercel Dashboard → Your Project → Deployments
   - Check for any domain-related errors

### Domain Shows "Invalid Configuration"

1. **Verify DNS records match exactly:**
   - Check Vercel dashboard for exact values
   - Ensure no extra spaces or typos

2. **Check TTL:**
   - Lower TTL (300-600) helps with faster updates
   - Higher TTL (3600+) is fine once configured

3. **Remove conflicting records:**
   - Delete any old A/CNAME records pointing elsewhere
   - Only keep the Vercel records

---

## Common Domain Registrars Setup

### GoDaddy

1. Go to **My Products** → **DNS** → **Manage DNS**
2. Add A record: `@` → `76.76.21.21`
3. Add CNAME: `www` → `cname.vercel-dns.com`

### Namecheap

1. Go to **Domain List** → **Manage** → **Advanced DNS**
2. Add A record: `@` → `76.76.21.21`
3. Add CNAME: `www` → `cname.vercel-dns.com`

### Cloudflare

1. Go to **DNS** → **Records**
2. Add CNAME: `@` → `cname.vercel-dns.com` (Proxy enabled)
3. Add CNAME: `www` → `cname.vercel-dns.com` (Proxy enabled)

### Google Domains

1. Go to **DNS** → **Custom records**
2. Add A record: `@` → `76.76.21.21`
3. Add CNAME: `www` → `cname.vercel-dns.com`

---

## Next Steps After Domain Setup

1. ✅ **Test all pages** on your custom domain
2. ✅ **Update any hardcoded URLs** in your code to use `checkly-app.com`
3. ✅ **Update marketing materials** with new domain
4. ✅ **Set up email** (if needed) - e.g., hello@checkly-app.com
5. ✅ **Configure redirects** (if needed) - Vercel handles www → root automatically

---

## Need Help?

- **Vercel Domain Docs:** https://vercel.com/docs/concepts/projects/domains
- **Vercel Support:** https://vercel.com/support
- **DNS Checker:** https://dnschecker.org

---

**Note:** The exact IP address and CNAME values may vary. Always check your Vercel dashboard for the current values to use.
