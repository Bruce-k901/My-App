# Messaging System - Quick Start Guide

## 🚀 Setup Steps

### 1. Run Database Migration

```bash
# Apply the migration via Supabase CLI
supabase migration up

# Or apply manually in Supabase Dashboard SQL Editor
# Copy contents of: supabase/migrations/20250216000000_create_messaging_system.sql
```

### 2. Create Storage Bucket

Run the SQL script to create the storage bucket for file attachments:

```bash
# In Supabase Dashboard SQL Editor, run:
# supabase/sql/create_message_storage_bucket.sql
```

Or manually:

1. Go to Supabase Dashboard → Storage
2. Create new bucket: `message_attachments`
3. Set as public
4. Add the policies from the SQL file

### 3. Add to Navigation

Add messaging to your sidebar navigation. Update `src/components/layouts/NewMainSidebar.tsx` or your navigation component:

```typescript
{
  href: '/dashboard/messaging',
  label: 'Messages',
  icon: MessageSquare,
}
```

### 4. Test It Out!

Navigate to `/dashboard/messaging` and start chatting!

## 📁 Files Created

### Database

- `supabase/migrations/20250216000000_create_messaging_system.sql` - Full schema
- `supabase/sql/create_message_storage_bucket.sql` - Storage setup

### Types

- `src/types/messaging.ts` - TypeScript types

### Hooks

- `src/hooks/useMessages.ts` - Message management hook
- `src/hooks/useConversations.ts` - Conversation list hook
- `src/hooks/useTypingIndicator.ts` - Typing indicator hook

### Components

- `src/components/messaging/Messaging.tsx` - Main messaging component
- `src/components/messaging/ConversationList.tsx` - Conversation sidebar
- `src/components/messaging/MessageThread.tsx` - Message display
- `src/components/messaging/MessageInput.tsx` - Message input with file upload

### Pages

- `src/app/dashboard/messaging/page.tsx` - Messaging page route

### Utilities

- `src/lib/messaging/utils.ts` - Helper functions

## 🎯 Usage Examples

### Create a Direct Message

```typescript
import { useConversations } from "@/hooks/useConversations";

function MyComponent() {
  const { createConversation } = useConversations();

  const startChat = async (otherUserId: string) => {
    const conversation = await createConversation("direct", [otherUserId]);
    if (conversation) {
      // Navigate to messaging page with conversation selected
      router.push(`/dashboard/messaging?conversation=${conversation.id}`);
    }
  };
}
```

### Create a Group Chat

```typescript
const createGroup = async (userIds: string[], groupName: string) => {
  const conversation = await createConversation("group", userIds, groupName);
  return conversation;
};
```

### Send a Message Programmatically

```typescript
import { useMessages } from "@/hooks/useMessages";

function MyComponent() {
  const { sendMessage } = useMessages({ conversationId: "conv-id" });

  const send = async () => {
    await sendMessage("Hello!");
  };
}
```

## 🔧 Customization

### Styling

All components use Tailwind classes matching your existing design system:

- Dark theme (`bg-[#0B0D13]`)
- Pink accent colors (`pink-500`, `pink-400`)
- Glass morphism effects (`bg-white/[0.03]`)

### Features to Add

- [ ] Message reactions UI
- [ ] Message editing UI
- [ ] Message deletion UI
- [ ] User mention autocomplete
- [ ] Emoji picker
- [ ] Voice messages
- [ ] Message search
- [ ] Conversation search
- [ ] Push notifications

## 📊 Database Tables

1. **conversations** - Chat conversations
2. **conversation_participants** - Users in conversations
3. **messages** - Individual messages
4. **message_reads** - Read receipts
5. **message_reactions** - Emoji reactions
6. **message_mentions** - @username mentions
7. **typing_indicators** - Real-time typing status

## 🔒 Security

- All tables have Row Level Security (RLS) enabled
- Users can only see conversations they're participants in
- Company/site scoping ensures multi-tenant isolation
- File uploads are scoped to conversations

## 🐛 Troubleshooting

### Messages not appearing?

- Check RLS policies are applied
- Verify user is a participant in the conversation
- Check browser console for errors

### File uploads failing?

- Verify storage bucket exists: `message_attachments`
- Check storage policies are applied
- Verify file size < 10MB

### Real-time not working?

- Check Supabase Realtime is enabled
- Verify WebSocket connection in browser DevTools
- Check channel subscriptions are active

## 📚 Next Steps

1. **Add to Sidebar** - Add messaging link to navigation
2. **Add Notifications** - Show unread count badge
3. **Add User Picker** - Create UI to start new conversations
4. **Add Reactions** - Build reaction picker UI
5. **Add Search** - Implement message/conversation search
6. **Add Push Notifications** - Integrate with service worker

## 🎨 UI Components Ready

All components are production-ready and follow your existing design patterns:

- ✅ Responsive design
- ✅ Dark theme
- ✅ Loading states
- ✅ Error handling
- ✅ Real-time updates
- ✅ File uploads
- ✅ Typing indicators

Enjoy your new messaging system! 🎉
