# Additional Messaging APIs Guide

Beyond SMS, WhatsApp, and Email, here are **10+ messaging/business communication APIs** you can integrate:

---

## 1. Slack API ⭐ (Highly Recommended)

### What It Is

Team communication platform - very popular in hospitality operations.

### Why It's Perfect for Hospitality

- ✅ **Team channels** - Create channels per venue
- ✅ **Rich notifications** - Buttons, attachments, formatting
- ✅ **Two-way communication** - Staff can reply
- ✅ **Integration ecosystem** - Connects with other tools
- ✅ **Free tier** - Up to 10,000 messages/month
- ✅ **Mobile app** - Staff already use it

### Cost

- **Free**: Up to 10,000 messages/month
- **Paid**: $7.25/user/month (Pro) - but free tier is usually enough for notifications

### Implementation Complexity

**Easy** (1-2 days)

- Simple REST API
- Webhook setup
- OAuth for workspace connection

### Best Use Cases

- **Daily digests** → Post to #compliance channel
- **Critical alerts** → Direct message managers
- **Task assignments** → Create Slack tasks
- **Incident reports** → Rich formatted messages with photos
- **Team coordination** - Staff can discuss issues

### Example Integration

```typescript
// Send notification to Slack channel
await fetch("https://slack.com/api/chat.postMessage", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    channel: "#compliance-alerts",
    text: "🚨 Temperature Alert",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Temperature Failure*\nFridge #3 is at 8°C (target: 0-4°C)",
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "View Details" },
            url: "https://app.checkly.app/temperature-logs",
          },
        ],
      },
    ],
  }),
});
```

### Setup Steps

1. Create Slack App at api.slack.com
2. Install to workspace
3. Get Bot Token
4. Add to `.env.local`: `SLACK_BOT_TOKEN=xoxb-...`
5. Create API route: `src/app/api/slack/route.ts`

---

## 2. Microsoft Teams API

### What It Is

Microsoft's team collaboration platform - popular in enterprise hospitality chains.

### Why It's Useful

- ✅ **Enterprise integration** - If venues use Microsoft 365
- ✅ **Rich cards** - Adaptive cards with actions
- ✅ **Channels** - Similar to Slack
- ✅ **Free** - Included with Microsoft 365

### Cost

**FREE** - Included with Microsoft 365 subscription

### Implementation Complexity

**Medium** (2-3 days)

- OAuth flow required
- Adaptive Cards format
- Webhook setup

### Best Use Cases

- Enterprise hospitality chains using Microsoft 365
- Integration with existing Teams workflows
- Rich formatted compliance reports

### When to Use

- ✅ Venues already use Microsoft 365
- ✅ Enterprise customers
- ❌ Small independent venues (use Slack instead)

---

## 3. Telegram Bot API ⭐ (Great for International)

### What It Is

Popular messaging app with bot API - huge in Europe, Middle East, Asia.

### Why It's Great

- ✅ **FREE** - No message limits
- ✅ **Rich media** - Photos, documents, buttons
- ✅ **Group chats** - Create groups per venue
- ✅ **Global reach** - 700M+ users
- ✅ **Simple API** - Very easy to integrate
- ✅ **No approval** - Unlike WhatsApp

### Cost

**FREE** - Unlimited messages

### Implementation Complexity

**Easy** (1 day)

- Simple REST API
- Bot token setup
- No OAuth needed

### Best Use Cases

- **International venues** - Especially Europe/Middle East
- **Group notifications** - Per-venue Telegram groups
- **Rich media** - Send photos from incidents
- **Two-way** - Staff can reply via bot

### Example Integration

```typescript
// Send message to Telegram group
await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chat_id: TELEGRAM_GROUP_ID,
    text: "🚨 Temperature Alert: Fridge #3 is at 8°C",
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "View Details", url: "https://app.checkly.app/temperature-logs" }],
      ],
    },
  }),
});
```

### Setup Steps

1. Message @BotFather on Telegram
2. Create bot: `/newbot`
3. Get token
4. Add to `.env.local`: `TELEGRAM_BOT_TOKEN=...`
5. Create API route: `src/app/api/telegram/route.ts`

---

## 4. Discord API

### What It Is

Gaming-focused chat platform, but increasingly used for business.

### Why It's Useful

- ✅ **FREE** - Unlimited messages
- ✅ **Rich embeds** - Beautiful formatted messages
- ✅ **Voice channels** - Could use for emergency calls
- ✅ **Popular with younger staff** - Gen Z/Millennials

### Cost

**FREE** - Unlimited messages

### Implementation Complexity

**Easy** (1 day)

- Simple REST API
- Webhook or bot setup

### Best Use Cases

- Venues with younger staff
- Non-traditional hospitality (gaming cafes, esports venues)
- Rich formatted compliance reports

### When to Use

- ✅ Gaming/esports venues
- ✅ Venues with young staff
- ❌ Traditional fine dining (use Slack/Teams)

---

## 5. Apple Business Chat

### What It Is

Native iOS messaging for businesses - appears in Messages app.

### Why It's Valuable

- ✅ **Native iOS** - Feels like texting
- ✅ **Rich media** - Photos, documents, Apple Pay
- ✅ **High engagement** - 98% open rate
- ✅ **Professional** - Verified business account

### Cost

**FREE** - But requires Apple Business Chat account

### Implementation Complexity

**Hard** (5-7 days)

- Apple Business Chat account required
- Complex setup process
- iOS-focused (Android users can't use)

### Best Use Cases

- iOS-heavy user base
- Premium hospitality venues
- Customer-facing communication

### Limitations

- ⚠️ **iOS only** - Android users excluded
- ⚠️ **Business verification** - Takes weeks
- ⚠️ **Complex setup** - More involved than other options

---

## 6. Google Business Messages (RCS)

### What It Is

Rich Communication Services - Android's answer to iMessage.

### Why It's Useful

- ✅ **Android native** - Works in Messages app
- ✅ **Rich media** - Photos, buttons, carousels
- ✅ **Free** - No per-message cost
- ✅ **High engagement** - Native messaging experience

### Cost

**FREE** - But requires Google Business Messages account

### Implementation Complexity

**Hard** (5-7 days)

- Google Business Messages account
- Complex verification
- Android-focused

### Best Use Cases

- Android-heavy user base
- Rich media notifications
- Customer communication

### Limitations

- ⚠️ **Android only** - iOS users excluded
- ⚠️ **Business verification** - Takes weeks
- ⚠️ **Not universally available** - Carrier dependent

---

## 7. Facebook Messenger API

### What It Is

Facebook's messaging platform - can be used for business communication.

### Why It's Useful

- ✅ **Wide reach** - 1B+ users
- ✅ **Rich media** - Photos, videos, buttons
- ✅ **Free** - No per-message cost
- ✅ **Two-way** - Users can reply

### Cost

**FREE** - But requires Facebook Business account

### Implementation Complexity

**Medium** (3-4 days)

- Facebook Business account
- App review process
- Webhook setup

### Best Use Cases

- Customer-facing communication
- Marketing integration
- Social media presence

### Limitations

- ⚠️ **App review** - Can take weeks
- ⚠️ **24-hour window** - Limited messaging window
- ⚠️ **Not ideal for internal** - Better for customer communication

---

## 8. Instagram Direct Messages API

### What It Is

Instagram messaging - similar to Facebook Messenger.

### Why It's Useful

- ✅ **Visual platform** - Great for photos
- ✅ **Young audience** - Popular with Gen Z
- ✅ **Rich media** - Photos, videos, stories

### Cost

**FREE** - But requires Instagram Business account

### Implementation Complexity

**Medium** (3-4 days)

- Instagram Business account
- App review process
- Similar to Facebook Messenger

### Best Use Cases

- Visual-heavy venues (restaurants, cafes)
- Social media integration
- Marketing communication

### Limitations

- ⚠️ **Not ideal for internal** - Better for customer/marketing
- ⚠️ **App review** - Can take weeks

---

## 9. Twitter/X Direct Messages API

### What It Is

Twitter/X messaging - can be used for business communication.

### Why It's Useful

- ✅ **Public visibility** - Can be public-facing
- ✅ **Real-time** - Instant communication
- ✅ **Hashtags** - Can track conversations

### Cost

**FREE** - Basic API tier

### Implementation Complexity

**Easy** (1-2 days)

- Simple REST API
- OAuth setup

### Best Use Cases

- Public-facing communication
- Customer service
- Social media integration

### Limitations

- ⚠️ **Not ideal for internal** - Better for public/customer communication
- ⚠️ **Character limits** - 280 characters

---

## 10. Signal (Not Available)

### What It Is

Privacy-focused messaging app.

### Status

**NOT AVAILABLE** - No business API, privacy-focused, no official API

### Why It's Not an Option

- ❌ No official API
- ❌ Privacy-focused (no business features)
- ❌ Not designed for business use

---

## Comparison Table

| Platform                | Cost            | Complexity | Best For               | Global Reach |
| ----------------------- | --------------- | ---------- | ---------------------- | ------------ |
| **Slack**               | Free (10k msgs) | Easy       | Team communication     | ⭐⭐⭐⭐     |
| **Telegram**            | Free            | Easy       | International venues   | ⭐⭐⭐⭐⭐   |
| **Microsoft Teams**     | Free (with 365) | Medium     | Enterprise chains      | ⭐⭐⭐⭐     |
| **Discord**             | Free            | Easy       | Gaming venues          | ⭐⭐⭐       |
| **Apple Business Chat** | Free            | Hard       | iOS-heavy users        | ⭐⭐⭐       |
| **Google RCS**          | Free            | Hard       | Android-heavy users    | ⭐⭐⭐       |
| **Facebook Messenger**  | Free            | Medium     | Customer communication | ⭐⭐⭐⭐⭐   |
| **Instagram DM**        | Free            | Medium     | Visual venues          | ⭐⭐⭐⭐     |
| **Twitter/X DM**        | Free            | Easy       | Public communication   | ⭐⭐⭐       |

---

## Recommended Strategy

### For Internal Team Communication

1. **Slack** (Primary) - Best for team coordination
2. **Telegram** (Alternative) - If international or prefer Telegram
3. **Microsoft Teams** (If using Microsoft 365)

### For Customer Communication

1. **WhatsApp Business** (Primary) - Most popular globally
2. **Facebook Messenger** (Alternative) - Good reach
3. **Apple Business Chat** (iOS premium) - If iOS-heavy

### For Critical Alerts

1. **SMS** (Primary) - Most reliable
2. **Browser Push** (Primary) - Free, instant
3. **Slack DM** (Secondary) - If team uses Slack

---

## Implementation Priority

### 🥇 Phase 1: Slack Integration (HIGH PRIORITY)

**Why:** Most popular for team communication, free tier generous
**Impact:** Team coordination, rich notifications
**Cost:** FREE (up to 10k messages/month)
**Time:** 1-2 days

### 🥈 Phase 2: Telegram Bot (MEDIUM PRIORITY)

**Why:** FREE, unlimited, great for international
**Impact:** Group notifications, rich media
**Cost:** FREE
**Time:** 1 day

### 🥉 Phase 3: Microsoft Teams (IF NEEDED)

**Why:** Only if venues use Microsoft 365
**Impact:** Enterprise integration
**Cost:** FREE (with 365)
**Time:** 2-3 days

---

## Code Example: Multi-Channel Notification Service

```typescript
// src/lib/notifications/multi-channel.ts

interface NotificationPayload {
  title: string;
  message: string;
  url?: string;
  urgent?: boolean;
  channels: ("slack" | "telegram" | "email" | "sms" | "push")[];
}

export async function sendMultiChannelNotification(payload: NotificationPayload, userId: string) {
  const results = await Promise.allSettled([
    payload.channels.includes("slack") && sendSlackNotification(payload),
    payload.channels.includes("telegram") && sendTelegramNotification(payload),
    payload.channels.includes("email") && sendEmailNotification(payload, userId),
    payload.channels.includes("sms") && sendSMSNotification(payload, userId),
    payload.channels.includes("push") && sendPushNotification(payload, userId),
  ]);

  return results;
}

async function sendSlackNotification(payload: NotificationPayload) {
  // Slack implementation
}

async function sendTelegramNotification(payload: NotificationPayload) {
  // Telegram implementation
}
```

---

## Database Schema for Multi-Channel Preferences

```sql
-- Add to profile_settings table
ALTER TABLE profile_settings ADD COLUMN IF NOT EXISTS
  slack_enabled BOOLEAN DEFAULT false,
  slack_channel_id TEXT,
  telegram_enabled BOOLEAN DEFAULT false,
  telegram_chat_id TEXT,
  teams_enabled BOOLEAN DEFAULT false,
  teams_webhook_url TEXT,
  notification_channels JSONB DEFAULT '["email", "push"]'::jsonb;
```

---

## Cost Analysis (Per Venue/Month)

| Channel         | Volume       | Cost                |
| --------------- | ------------ | ------------------- |
| Slack           | 200 messages | **FREE**            |
| Telegram        | 200 messages | **FREE**            |
| Microsoft Teams | 200 messages | **FREE** (with 365) |
| Discord         | 200 messages | **FREE**            |
| **TOTAL**       |              | **$0**              |

**All team communication channels are FREE!**

---

## Next Steps

1. **Start with Slack** - Most popular, easiest integration
2. **Add Telegram** - If international or prefer Telegram
3. **Consider Teams** - Only if venues use Microsoft 365
4. **Test with real users** - Get feedback on preferred channels

---

## Resources

- **Slack API**: https://api.slack.com
- **Telegram Bot API**: https://core.telegram.org/bots/api
- **Microsoft Teams**: https://learn.microsoft.com/en-us/microsoftteams/platform/
- **Discord API**: https://discord.com/developers/docs

---

**Bottom Line:** Slack + Telegram = FREE team communication channels that complement your existing email/SMS/push notifications. Perfect for daily coordination, while SMS/Push handle critical alerts.
