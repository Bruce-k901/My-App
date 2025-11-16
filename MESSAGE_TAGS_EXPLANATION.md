# Message Tags Explanation

## Two Types of Tags Can Appear Above Messages:

### 1. **Sender Name Tag** (Lines 154-158 in MessageThread.tsx)

**What it shows:** The sender's name (e.g., "John Doe" or "john@example.com")

**When it appears:**

- When `showAvatar` is `true` AND
- When `message.sender` exists AND has `full_name` or `email`

**What controls `showAvatar`:**

```typescript
const showAvatar =
  !prevMessage || // First message in conversation
  prevMessage.sender_id !== message.sender_id || // Different sender
  new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 300000; // 5+ minutes gap
```

**So `showAvatar` is TRUE when:**

- It's the very first message in the conversation
- The previous message was from a different person
- More than 5 minutes have passed since the previous message

**Current Code:**

```tsx
{
  showAvatar && message.sender && (message.sender.full_name || message.sender.email) && (
    <div className="text-xs text-white/40 mb-1 px-2">
      {message.sender.full_name || message.sender.email?.split("@")[0]}
    </div>
  );
}
```

---

### 2. **Reply Preview Box** (Lines 160-190 in MessageThread.tsx)

**What it shows:** A box with:

- Reply icon (↩)
- Sender name (or "Someone" if sender info missing)
- Preview of the replied-to message content

**When it appears:**

- When `message.reply_to` exists (message is a reply to another message)

**Current Code:**

```tsx
{
  message.reply_to && (
    <div className="mb-2 px-3 py-2 bg-white/[0.08] border-l-3 border-pink-500/70 rounded text-xs">
      <div className="flex items-center gap-2 mb-1">
        <Reply className="w-3 h-3 text-pink-400" />
        <div className="font-semibold text-pink-300">
          {message.reply_to.sender?.full_name ||
            message.reply_to.sender?.email?.split("@")[0] ||
            "Someone"}
        </div>
      </div>
      <div className="text-white/70 truncate max-w-[250px]">{message.reply_to.content}</div>
    </div>
  );
}
```

---

## Debugging Steps:

1. **Check if messages have `reply_to` set incorrectly:**
   - Open browser console
   - Check `message.reply_to` value for messages showing tags
   - If `reply_to` exists but shouldn't, that's the issue

2. **Check if `showAvatar` is incorrectly true:**
   - Check if `prevMessage.sender_id === message.sender_id` for consecutive messages
   - Check if time gap is less than 5 minutes
   - If `showAvatar` is true when it shouldn't be, that's the issue

3. **Check sender info:**
   - Verify `message.sender` exists and has `full_name` or `email`
   - If sender info is missing, sender name tag won't show (which is correct)

---

## To Remove Tags:

**To remove sender name tags:**

- Remove or comment out lines 154-158

**To remove reply preview boxes:**

- Remove or comment out lines 160-190
- OR ensure `message.reply_to` is always `null` for non-reply messages
