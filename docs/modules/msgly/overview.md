# Msgly Module Overview

## Purpose

Msgly is Opsly's comprehensive internal messaging and communication system. It provides thread-based conversations, channels, file attachments, read receipts, message reactions, and topic categorization for team communication across the platform.

## Module Location

- **Routes**: `src/app/dashboard/messaging/`
- **Components**: `src/components/messaging/`
- **API**: Not under `/api/msgly/` - uses Supabase direct queries
- **State Management**: `src/lib/stores/panel-store.ts`
- **Types**: `src/types/messaging.ts`
- **Hooks**: Various messaging hooks in `src/hooks/`

## Architecture

### Delivery Modes

Msgly operates in two modes:

1. **Slide-out Panel** (Primary)
   - Triggered by bell icon in `DashboardHeader`
   - Managed by `panel-store.ts` (Zustand)
   - Component: `messaging-panel.tsx` wraps `Messaging.tsx`
   - Opens as right-side sheet overlay

2. **Full-Page Route** (Secondary)
   - Route: `/dashboard/messaging`
   - Redirects to dashboard and opens panel
   - Used for deep linking and notifications

### Panel State Management

```typescript
// From panel-store.ts
const { messagingOpen, setMessagingOpen } = usePanelStore();
```

The panel store manages:

- `messagingOpen`: Controls messaging panel visibility
- `calendarOpen`: Calendar panel
- `aiAssistantOpen`: AI assistant panel
- `searchOpen`: Global search panel

## Navigation Structure

### Primary Interface

```
/dashboard/messaging (redirects to /dashboard with panel open)
  └─> Opens MessagingPanel component
      └─> Renders Messaging component
          ├─> ConversationList (left sidebar)
          ├─> MessageThread (main area)
          ├─> MessageInput (bottom input)
          └─> ConversationContentTabs (tabs for filtering)
```

### URL Parameters

- `?conversation={id}` - Deep link to specific conversation

## Key Features

### 1. Conversation Types

- **Direct Messages** - 1-on-1 conversations
- **Group Chats** - Multi-user conversations
- **Channels** - Topic or team-based channels
- **Site-wide Chats** - Entire site conversations

### 2. Message Features

- **Thread-based messaging** - Messages organized by conversation
- **File attachments** - Images, PDFs, documents
- **Read receipts** - Track who read messages
- **Message reactions** - Emoji reactions
- **Threaded replies** - Reply to specific messages
- **Message editing** - Edit sent messages
- **Soft deletes** - Delete without removing from DB
- **Mentions** - @username mentions
- **Typing indicators** - Real-time typing status

### 3. Topic Categorization

Messages can be tagged with topics:

- 🛡️ Safety
- 🔧 Maintenance
- 🔄 Operations
- 👥 HR
- ✅ Compliance
- ⚠️ Incidents
- 💬 General

### 4. Integration Features

- **Convert to Task** - Turn messages into action items
- **Convert to Callout** - Escalate to incidents
- **Forward Messages** - Share across conversations
- **Topic Filtering** - Filter by category

### 5. Unread Tracking

- Unread count badge on bell icon
- Per-conversation unread tracking
- Mark as read on conversation open
- Real-time updates via Supabase subscriptions

## Key Components

### Core Components

| Component                | Purpose                        | Location                    |
| ------------------------ | ------------------------------ | --------------------------- |
| `Messaging.tsx`          | Main messaging interface       | `src/components/messaging/` |
| `messaging-panel.tsx`    | Sheet wrapper for panel mode   | `src/components/messaging/` |
| `ConversationList.tsx`   | Sidebar with conversation list | `src/components/messaging/` |
| `MessageThread.tsx`      | Message display area           | `src/components/messaging/` |
| `MessageInput.tsx`       | Message composition            | `src/components/messaging/` |
| `ConversationHeader.tsx` | Conversation title/actions     | `src/components/messaging/` |
| `MessageButton.tsx`      | Bell icon with unread badge    | `src/components/layout/`    |

### Specialized Components

| Component                     | Purpose                             |
| ----------------------------- | ----------------------------------- |
| `ConversationContentTabs.tsx` | Tab filtering (All/Mentions/Topics) |
| `StartConversationModal.tsx`  | New conversation creation           |
| `TopicFilter.tsx`             | Filter by topic category            |
| `TopicTagModal.tsx`           | Tag messages with topics            |
| `ConvertToTaskModal.tsx`      | Convert message to task             |
| `ConvertToCalloutModal.tsx`   | Convert to incident                 |
| `ForwardMessageModal.tsx`     | Forward to other conversations      |
| `MessageImageGallery.tsx`     | Image attachment viewer             |
| `ActionPrompt.tsx`            | AI-suggested actions                |
| `FilteredMessagesView.tsx`    | Filtered message display            |

## Database Schema

### Core Tables

```sql
-- Conversations
conversations
  - id, type, name, company_id, site_id, created_by
  - last_message_at, topic, pinned

-- Messages
messaging_messages
  - id, conversation_id, sender_id, content
  - message_type, file_url, file_name, topic
  - reply_to_id, edited_at, deleted_at

-- Participants
conversation_participants
  - conversation_id, user_id, role
  - last_read_at, last_read_message_id

-- Message Reads
message_reads
  - message_id, user_id, read_at

-- Message Reactions
message_reactions
  - message_id, user_id, emoji

-- Message Mentions
message_mentions
  - message_id, mentioned_user_id

-- Typing Indicators
typing_indicators
  - conversation_id, user_id, is_typing, updated_at

-- Channel Members (for unread tracking)
messaging_channel_members
  - channel_id, profile_id
  - last_read_at, unread_count
```

### Storage

**Bucket**: `message_attachments`

- Stores file attachments
- Organized by conversation folders
- Public access via signed URLs

## Real-time Subscriptions

Msgly uses Supabase Realtime for:

1. **New messages** - Instant message delivery
2. **Message updates** - Edits, deletions
3. **Typing indicators** - Who's typing
4. **Read receipts** - Message read status
5. **Unread counts** - Badge updates

## Hooks

### Key Messaging Hooks

```typescript
// Message fetching and subscriptions
useMessages(conversationId);

// Unread count for badge
useUnreadMessageCount();

// Typing indicators
useTypingIndicator(conversationId);

// Conversations list
useConversations();
```

## Integration with Other Modules

### Dashboard Integration

```typescript
// From DashboardHeader
import { MessageButton } from '@/components/layout/MessageButton';

// Bell icon with unread badge
<MessageButton />
```

### Task Integration

Messages can be converted to tasks:

- Opens `CreateTaskModal` with message content
- Links task back to message thread
- Maintains context for task origin

### Incident Integration

Messages can be escalated to incidents:

- Opens `ConvertToCalloutModal`
- Creates incident record
- Links to original message

## Mobile Responsiveness

- **Mobile**: Conversation list and thread swap views
- **Desktop**: Side-by-side layout
- Auto-opens conversation list on mobile when no selection
- Sidebar toggle for mobile navigation

## Notification System

### In-App Notifications

- Unread badge on bell icon
- Real-time count updates
- Per-conversation unread tracking

### Toast Notifications

- New message alerts
- Mention notifications
- System messages

## Related Documentation

- **[Messaging System Implementation Guide](./messaging-system.md)** - Detailed database schema, features, and usage examples
- **[API Reference](./api-reference.md)** - Third-party messaging integrations (Slack, Telegram, WhatsApp, etc.)

## Technical Notes

### Authentication

All messaging features require:

- Authenticated user session
- Company/site context via `useAppContext()`
- RLS policies enforce access control

### Performance

- Messages paginated (50 at a time)
- Lazy loading for older messages
- Indexes optimized for common queries
- Real-time subscriptions auto-cleanup

### Error Handling

- Graceful degradation if tables don't exist
- Error code `42P01` handled (table not found)
- Toast notifications for user-facing errors
- Console warnings for missing features

## Color Theme

Msgly uses **teal** as its module color:

- Primary: `#14b8a6` (teal-500)
- Accent: `#0d9488` (teal-600)
- Light: `#5eead4` (teal-300)

## Future Enhancements

Potential features mentioned in documentation:

- Push notifications for mobile
- Email notifications
- Message search
- Voice/video calls
- Message pinning
- Conversation archiving (already in schema)
- Message scheduling
