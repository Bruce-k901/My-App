This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 🧠 ENVIRONMENT SETUP FOR ALL FUTURE BUILDS

### Quick Start

1. **Duplicate `.env.template` → `.env.local`**
2. **Add real Supabase credentials**
3. **Restart local server (`npm run dev`)**
4. **Never commit `.env.local`**

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

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load fonts.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

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

## 🔄 Today's Tasks Cron Job

The app automatically generates daily checklist tasks at midnight UTC using a Supabase Edge Function.

### Prerequisites

- At least 1 active task template in `task_templates` table
- At least 1 active site in `sites` table
- Cron schedule configured in Supabase Dashboard

### Verification

Run the verification script to check if everything is set up correctly:

```bash
npm run verify-cron
```

### Manual Setup Required

The cron schedule must be configured manually in Supabase Dashboard. See `docs/CRON_SETUP_INSTRUCTIONS.md` for step-by-step instructions.

### Manual Testing

To manually trigger task generation (useful for testing):

```bash
curl -X POST http://localhost:3000/api/admin/generate-tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Monitoring

- Check Edge Function logs: Supabase Dashboard → Edge Functions → generate-daily-tasks → Logs
- Verify tasks were created: Query `checklist_tasks` table where `due_date = CURRENT_DATE`
- Check for duplicates: See verification script or `docs/CRON_SETUP_INSTRUCTIONS.md`

### Troubleshooting

If tasks aren't generating:

1. Run `npm run verify-cron` to check prerequisites
2. Check Edge Function logs for errors
3. Verify cron schedule is enabled in Supabase Dashboard
4. Confirm Authorization header is set correctly
