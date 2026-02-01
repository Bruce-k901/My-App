# 📧 Setting Up Offer Letter Emails

## Current Status

✅ **Offer letter system is built and working**
✅ **Email template is beautiful and professional**
⚠️ **Email service needs configuration**

## Why Emails Aren't Sending

Your app uses **Resend** for emails, but it's not configured yet. Without the API key, emails are logged to the console instead of being sent.

## How to Fix

### Option 1: Use Resend (Recommended)

1. **Sign up for Resend** (free tier: 100 emails/day)
   - Go to: https://resend.com
   - Sign up with your email
   - Verify your email

2. **Get your API key**
   - Dashboard → API Keys → Create API Key
   - Copy the key (starts with `re_`)

3. **Add to environment variables**
   
   In `.env.local`:
   ```env
   RESEND_API_KEY=re_your_api_key_here
   RESEND_FROM=noreply@yourdomain.com
   ```

4. **Verify domain** (for production)
   - In Resend Dashboard → Domains → Add Domain
   - Add DNS records to your domain
   - For testing: Use `onboarding@resend.dev` as the FROM address

5. **Restart server**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

### Option 2: Test Without Email (For Now)

The system still works without emails:
- ✅ Offer letters are created
- ✅ You get the offer URL in a toast
- ✅ You can share the link manually
- ✅ Candidates can still accept offers

Just copy the URL from the toast and send it manually (via WhatsApp, text, etc.)

## Email Features (Once Configured)

When Resend is set up, candidates will automatically receive:

📧 **Beautiful HTML Email** with:
- Gradient header with company branding
- All offer details (position, salary, start date, contract)
- Big "Review & Accept Offer" button
- 7-day expiry notice
- Professional formatting

## Testing

1. **Configure Resend** (see above)
2. **Send a test offer**
   - Go to candidate profile
   - Click "Send Offer"
   - Fill out details
   - Submit
3. **Check email**
   - Candidate should receive email instantly
   - Email goes to spam? Mark as "Not Spam"
4. **Click link in email**
   - Opens offer acceptance page
   - Candidate can sign and accept
   - Automatically creates profile + onboarding

## Troubleshooting

### Email goes to spam
- **Fix**: Verify your domain in Resend
- **Temporary**: Use `onboarding@resend.dev` for testing

### Still not receiving emails
- Check Resend Dashboard → Logs
- Verify `RESEND_API_KEY` and `RESEND_FROM` are set
- Restart dev server after changing `.env.local`
- Check console for error messages

### Want to use a different email service?
You can modify `/api/send-email/route.ts` to use:
- SendGrid
- Mailgun  
- AWS SES
- Any other SMTP service

---

**For now**: The offer system works! Just copy the URL from the toast and share it manually. Once Resend is configured, emails will send automatically. 🚀
