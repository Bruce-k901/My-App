"use client";

import { useState, useEffect } from 'react';
import { X, Search, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useConversations } from '@/hooks/useConversations';
import type { Message } from '@/types/messaging';
import { toast } from 'sonner';

interface ForwardMessageModalProps {
  message: Message;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ForwardMessageModal({
  message,
  isOpen,
  onClose,
  onSuccess,
}: ForwardMessageModalProps) {
  const { user, companyId } = useAppContext();
  const { conversations } = useConversations({ autoLoad: true });
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isForwarding, setIsForwarding] = useState(false);

  // Filter conversations based on search
  const filteredConversations = conversations.filter((conv) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      conv.name?.toLowerCase().includes(searchLower) ||
      conv.participants?.some((p: any) =>
        p.user?.full_name?.toLowerCase().includes(searchLower) ||
        p.user?.email?.toLowerCase().includes(searchLower)
      )
    );
  });

  // Exclude the current conversation from the list
  const availableConversations = filteredConversations.filter(
    (conv) => conv.id !== message.channel_id
  );

  const toggleChannel = (channelId: string) => {
    setSelectedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  };

  const handleForward = async () => {
    if (selectedChannels.size === 0) {
      toast.error('Please select at least one conversation');
      return;
    }

    if (!user) {
      toast.error('Not authenticated');
      return;
    }

    console.time('forward-message');
    setIsForwarding(true);

    try {
      console.time('step1-validate');
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');
      console.timeEnd('step1-validate');

      console.time('step2-prepare-data');
      const senderName = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User';
      const originalSenderName = message.sender?.full_name || 'Unknown';
      
      // Prepare forward content - preserve original for images/files, add forward prefix for text
      let forwardContent: string;
      if (message.message_type === 'image' || message.message_type === 'file') {
        // For images/files, keep original content (usually filename) but add forward context
        forwardContent = message.content || (message.message_type === 'image' ? 'Image' : 'File');
      } else {
        // For text messages, add forward prefix
        forwardContent = `Forwarded message:\n"${message.content}"\n- ${originalSenderName}`;
      }
      
      // Prepare the base message insert object
      const baseMessageInsert: any = {
        channel_id: '',
        sender_profile_id: currentUser.id,
        content: forwardContent,
        message_type: message.message_type, // Preserve original type (image/file/text)
        metadata: {
          forwarded_from_message_id: message.id,
          forwarded_from_channel_id: message.channel_id,
          forwarded_at: new Date().toISOString(),
          forwarded_from_sender: originalSenderName,
          sender_name: senderName,
          sender_email: currentUser.email,
        },
      };
      
      // Preserve file/image attachment information if present
      if (message.message_type === 'image' || message.message_type === 'file') {
        if (message.file_url) {
          baseMessageInsert.file_url = message.file_url;
        }
        if (message.file_name) {
          baseMessageInsert.file_name = message.file_name;
        }
        if (message.file_size) {
          baseMessageInsert.file_size = message.file_size;
        }
        if (message.file_type) {
          baseMessageInsert.file_type = message.file_type;
        }
      }
      
      console.timeEnd('step2-prepare-data');

      console.time('step3-insert-messages');
      // ✅ PARALLEL INSERT - All inserts happen at once
      const insertPromises = Array.from(selectedChannels).map((channelId) => {
        const messageInsert = {
          ...baseMessageInsert,
          channel_id: channelId,
        };
        return supabase.from('messaging_messages').insert(messageInsert);
      });

      const results = await Promise.all(insertPromises);
      console.timeEnd('step3-insert-messages');

      console.time('step4-check-errors');
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        console.error('Some forwards failed:', errors);
        toast.error(`${errors.length} of ${selectedChannels.size} forwards failed`);
      } else {
        toast.success(`Message forwarded to ${selectedChannels.size} conversation${selectedChannels.size > 1 ? 's' : ''}`);
        setSelectedChannels(new Set());
        onSuccess?.();
        onClose();
      }
      console.timeEnd('step4-check-errors');

      console.timeEnd('forward-message');
    } catch (error: any) {
      console.error('Error forwarding message:', error);
      toast.error(error.message || 'Failed to forward message');
      console.timeEnd('forward-message');
    } finally {
      setIsForwarding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#141823] border border-gray-200 dark:border-white/[0.06] rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/[0.06]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Forward Message</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-white/[0.06]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/40" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {availableConversations.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-white/40 py-8">
              {searchTerm ? 'No conversations found' : 'No other conversations available'}
            </div>
          ) : (
            availableConversations.map((conv) => {
              const isSelected = selectedChannels.has(conv.id);
              const name =
                conv.name ||
                (conv.type === 'direct'
                  ? conv.participants?.find((p: any) => (p.profile_id || p.user_id) !== user?.id)?.user?.full_name ||
                    'Direct Message'
                  : 'Group Chat') ||
                'Conversation';

              return (
                <button
                  key={conv.id}
                  onClick={() => toggleChannel(conv.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    isSelected
                      ? 'bg-pink-50 dark:bg-pink-500/20 border-pink-300 dark:border-pink-500/50'
                      : 'bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? 'bg-pink-500 border-pink-500'
                        : 'border-gray-300 dark:border-white/30'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{name}</div>
                    {conv.last_message && (
                      <div className="text-xs text-gray-500 dark:text-white/40 truncate mt-1">
                        {conv.last_message.content}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-white/[0.06] flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-white/60">
            {selectedChannels.size} conversation{selectedChannels.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-transparent text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-white/[0.06] rounded-lg transition-colors"
              disabled={isForwarding}
            >
              Cancel
            </button>
            <button
              onClick={handleForward}
              disabled={selectedChannels.size === 0 || isForwarding}
              className="px-4 py-2 bg-transparent text-[#EC4899] border border-[#EC4899] rounded-lg hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isForwarding ? 'Forwarding...' : `Forward to ${selectedChannels.size}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

