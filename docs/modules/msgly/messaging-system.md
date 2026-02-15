# Messaging System Implementation Guide

## Overview

This document describes the full-featured messaging system schema and how to implement it in your application.

## Database Schema

The migration `20250216000000_create_messaging_system.sql` creates the following tables:

### Core Tables

1. **`conversations`** - Chat conversations (direct, group, site-wide, team)
2. **`conversation_participants`** - Users in each conversation
3. **`messages`** - Individual messages
4. **`message_reads`** - Read receipts
5. **`message_reactions`** - Emoji reactions
6. **`message_mentions`** - User mentions (@username)
7. **`typing_indicators`** - Real-time typing status

## Features Supported

✅ **Direct Messages** - 1-on-1 conversations  
✅ **Group Chats** - Multi-user conversations  
✅ **Site-wide Chats** - Conversations for entire sites  
✅ **Team Chats** - Role-based team conversations  
✅ **File Attachments** - Images, documents, etc.  
✅ **Read Receipts** - See who read your messages  
✅ **Message Reactions** - Emoji reactions  
✅ **Threaded Replies** - Reply to specific messages  
✅ **Mentions** - @username mentions  
✅ **Typing Indicators** - Real-time typing status  
✅ **Message Editing** - Edit sent messages  
✅ **Soft Deletes** - Delete messages without removing from DB  
✅ **Mute Conversations** - Mute notifications  
✅ **Archived Conversations** - Archive old conversations

## Conversation Types

- **`direct`** - 1-on-1 conversation between two users
- **`group`** - Custom group chat with multiple users
- **`site`** - Site-wide conversation (all users at a site)
- **`team`** - Team-based conversation (by role, e.g., all Managers)

## Usage Examples

### 1. Create a Direct Conversation

```typescript
// Create a direct conversation between two users
const createDirectConversation = async (otherUserId: string) => {
  const { data: profile } = await supabase.auth.getUser();
  if (!profile?.user) return;

  // Check if conversation already exists
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("type", "direct")
    .eq("company_id", companyId)
    .limit(1);

  if (existing && existing.length > 0) {
    return existing[0].id;
  }

  // Create new conversation
  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({
      type: "direct",
      company_id: companyId,
      created_by: profile.user.id,
    })
    .select()
    .single();

  if (error) throw error;

  // Add both participants
  await supabase.from("conversation_participants").insert([
    { conversation_id: conversation.id, user_id: profile.user.id },
    { conversation_id: conversation.id, user_id: otherUserId },
  ]);

  return conversation.id;
};
```

### 2. Create a Group Chat

```typescript
const createGroupChat = async (name: string, userIds: string[]) => {
  const { data: profile } = await supabase.auth.getUser();
  if (!profile?.user) return;

  // Create conversation
  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({
      type: "group",
      name,
      company_id: companyId,
      created_by: profile.user.id,
    })
    .select()
    .single();

  if (error) throw error;

  // Add all participants (creator is admin)
  const participants = [
    { conversation_id: conversation.id, user_id: profile.user.id, role: "admin" },
    ...userIds.map((userId) => ({
      conversation_id: conversation.id,
      user_id: userId,
      role: "member",
    })),
  ];

  await supabase.from("conversation_participants").insert(participants);

  return conversation.id;
};
```

### 3. Send a Message

```typescript
const sendMessage = async (conversationId: string, content: string, replyToId?: string) => {
  const { data: profile } = await supabase.auth.getUser();
  if (!profile?.user) return;

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: profile.user.id,
      content,
      reply_to_id: replyToId || null,
    })
    .select()
    .single();

  if (error) throw error;

  // Parse mentions (@username) and create mention records
  const mentions = extractMentions(content);
  if (mentions.length > 0) {
    await supabase.from("message_mentions").insert(
      mentions.map((userId) => ({
        message_id: message.id,
        mentioned_user_id: userId,
      })),
    );
  }

  return message;
};
```

### 4. Upload File Attachment

```typescript
const sendFileMessage = async (conversationId: string, file: File, caption?: string) => {
  const { data: profile } = await supabase.auth.getUser();
  if (!profile?.user) return;

  // Upload file to Supabase Storage
  const fileExt = file.name.split(".").pop();
  const fileName = `${conversationId}/${Date.now()}.${fileExt}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("message_attachments")
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: urlData } = supabase.storage.from("message_attachments").getPublicUrl(fileName);

  // Create message with file
  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: profile.user.id,
      content: caption || "",
      message_type: file.type.startsWith("image/") ? "image" : "file",
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
    })
    .select()
    .single();

  return message;
};
```

### 5. Real-time Message Subscription

```typescript
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useMessages(conversationId: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial messages
    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          sender:profiles(id, full_name, email),
          reply_to:messages(id, content, sender:profiles(full_name))
        `,
        )
        .eq("conversation_id", conversationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading messages:", error);
        return;
      }

      setMessages(data || []);
      setLoading(false);
    };

    loadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch full message with relations
          const { data: newMessage } = await supabase
            .from("messages")
            .select(
              `
              *,
              sender:profiles(id, full_name, email),
              reply_to:messages(id, content, sender:profiles(full_name))
            `,
            )
            .eq("id", payload.new.id)
            .single();

          if (newMessage) {
            setMessages((prev) => [...prev, newMessage]);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === payload.new.id ? { ...msg, ...payload.new } : msg)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return { messages, loading };
}
```

### 6. Mark Messages as Read

```typescript
const markAsRead = async (conversationId: string, messageIds: string[]) => {
  const { data: profile } = await supabase.auth.getUser();
  if (!profile?.user) return;

  // Insert read receipts
  await supabase
    .from("message_reads")
    .insert(
      messageIds.map((messageId) => ({
        message_id: messageId,
        user_id: profile.user.id,
      })),
    )
    .select();

  // Update participant's last_read_at
  const latestMessageId = messageIds[messageIds.length - 1];
  await supabase
    .from("conversation_participants")
    .update({
      last_read_at: new Date().toISOString(),
      last_read_message_id: latestMessageId,
    })
    .eq("conversation_id", conversationId)
    .eq("user_id", profile.user.id);
};
```

### 7. Add Reaction

```typescript
const addReaction = async (messageId: string, emoji: string) => {
  const { data: profile } = await supabase.auth.getUser();
  if (!profile?.user) return;

  const { error } = await supabase.from("message_reactions").insert({
    message_id: messageId,
    user_id: profile.user.id,
    emoji,
  });

  if (error && error.code !== "23505") {
    // Ignore duplicate key error
    throw error;
  }
};
```

### 8. Typing Indicator

```typescript
const setTyping = async (conversationId: string, isTyping: boolean) => {
  const { data: profile } = await supabase.auth.getUser();
  if (!profile?.user) return;

  if (isTyping) {
    await supabase.from("typing_indicators").upsert({
      conversation_id: conversationId,
      user_id: profile.user.id,
      is_typing: true,
      updated_at: new Date().toISOString(),
    });
  } else {
    await supabase
      .from("typing_indicators")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("user_id", profile.user.id);
  }
};

// Subscribe to typing indicators
const useTypingIndicators = (conversationId: string) => {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_indicators",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch current typing users
          const { data } = await supabase
            .from("typing_indicators")
            .select("user_id")
            .eq("conversation_id", conversationId)
            .eq("is_typing", true)
            .gt("updated_at", new Date(Date.now() - 3000).toISOString()); // Last 3 seconds

          setTypingUsers(data?.map((t) => t.user_id) || []);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return typingUsers;
};
```

### 9. Get User's Conversations

```typescript
const getUserConversations = async () => {
  const { data: profile } = await supabase.auth.getUser();
  if (!profile?.user) return [];

  const { data, error } = await supabase
    .from("conversations")
    .select(
      `
      *,
      participants:conversation_participants(
        user:profiles(id, full_name, email)
      ),
      last_message:messages(
        id,
        content,
        created_at,
        sender:profiles(full_name)
      )
    `,
    )
    .order("last_message_at", { ascending: false, nullsFirst: false });

  return data;
};
```

## Storage Setup

You'll need to create a Supabase Storage bucket for message attachments:

```sql
-- Create storage bucket (run in Supabase SQL editor)
INSERT INTO storage.buckets (id, name, public)
VALUES ('message_attachments', 'message_attachments', true);

-- Set up storage policies
CREATE POLICY "Users can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message_attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'message_attachments');
```

## Next Steps

1. **Run the migration**: Apply `20250216000000_create_messaging_system.sql`
2. **Create Storage bucket**: Set up `message_attachments` bucket
3. **Build UI Components**:
   - Conversation list
   - Message thread
   - Message input
   - File upload
   - Reactions UI
4. **Implement Real-time**: Use Supabase Realtime subscriptions
5. **Add Notifications**: Push notifications for mentions/new messages

## Performance Considerations

- Messages are paginated (load 50 at a time)
- Indexes are optimized for common queries
- Typing indicators auto-cleanup after 30 seconds
- Consider archiving old conversations (>90 days)

## Security

- All tables have RLS enabled
- Users can only see conversations they're participants in
- Company/site scoping ensures multi-tenant isolation
- File uploads are scoped to conversations
