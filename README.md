This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 🧠 ENVIRONMENT SETUP FOR ALL FUTURE BUILDS

### Quick Start

1. **Duplicate `.env.template` → `.env.local`**
2. **Add real Supabase credentials**
3. **Restart local server (`npm run dev`)**
4. **Never commit `.env.local`**
5. **Ensure Vercel Environment Variables are up to date**

### Required Environment Variables

The following variables must be configured in `.env.local` for local development:

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_URL=https://your-project.supabase.co

# External APIs
COMPANIES_HOUSE_KEY=your_companies_house_api_key

# Application Environment
NEXT_PUBLIC_APP_ENV=development

# Optional: Email notifications
SENDGRID_KEY=your_sendgrid_api_key
```

### Environment Setup Process

1. **Copy the template file:**
   ```bash
   cp .env.template .env.local
   ```

2. **Get your Supabase credentials:**
   - Go to your [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Go to Settings → API
   - Copy the Project URL and anon/service_role keys

3. **Update `.env.local` with real values**

4. **Restart the development server:**
   ```bash
   npm run dev
   ```

### Production Deployment (Vercel)

For production builds, add the same environment variables in:
**Vercel → Project → Settings → Environment Variables**

Set variables for both **Production** and **Preview** environments.

### Version Tagging with Environment Context

When creating stable releases, include environment variable documentation:

```bash
git tag -a v1.0.0 -m "
Stable release v1.0.0
Required env vars:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY  
- SUPABASE_SERVICE_ROLE_KEY
- COMPANIES_HOUSE_KEY
"
git push origin v1.0.0
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Notifications & Digest

This app integrates Supabase for realtime notifications and scheduled daily digests.

### Edge Functions

- `send_daily_digest`: Compiles a 24-hour summary per site and creates in-app notifications, optionally sending emails via SendGrid.

### Environment Variables

Add to `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SENDGRID_KEY` (optional, enables outbound digest emails)

### Scheduling Daily Digest (Supabase Cron)

Configure a daily schedule at `06:00 UTC` via Supabase Dashboard:

1. Deploy the `send_daily_digest` function.
2. In Dashboard → Edge Functions → Schedules, add:
   - Name: `daily-digest`
   - Cron: `0 6 * * *`
   - Function: `send_daily_digest`
3. Set function environment variables as needed (e.g. `SENDGRID_KEY`).

Notes:

- In-app notifications are created regardless of email configuration.
- Email delivery is skipped if `SENDGRID_KEY` is not set.
- Notifications older than 14 days are auto-archived by the function.
