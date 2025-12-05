"use client";

import { useState, useEffect } from 'react';
import { Users, Building2, User, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import type { Conversation } from '@/types/messaging';
import AIAssistantWidget from '@/components/assistant/AIAssistantWidget';

interface ConversationHeaderProps {
  conversationId: string;
}

export function ConversationHeader({ conversationId }: ConversationHeaderProps) {
  const { user } = useAppContext();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) return;

    const loadConversation = async () => {
      setLoading(true);
      try {
        // Load conversation details
        const { data: convData, error: convError } = await supabase
          .from('messaging_channels')
          .select('*')
          .eq('id', conversationId)
          .single();

        if (convError) throw convError;

        if (convData) {
          const conv: Conversation = {
            ...convData,
            type: convData.channel_type || convData.type,
            site_id: convData.entity_type === 'site' ? convData.entity_id : convData.site_id,
          } as Conversation;
          setConversation(conv);

          // Load participants
          const { data: membersData, error: membersError } = await supabase
            .from('messaging_channel_members')
            .select(`
              user_id,
              profiles:user_id (
                id,
                full_name,
                email
              )
            `)
            .eq('channel_id', conversationId);

          if (!membersError && membersData) {
            setParticipants(membersData.map((m: any) => ({
              id: m.user_id,
              ...m.profiles,
            })));
          }
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConversation();

    // Subscribe to conversation updates
    const channel = supabase
      .channel(`conversation-header-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messaging_channels',
          filter: `id=eq.${conversationId}`,
        },
        () => {
          loadConversation();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const getConversationIcon = (type?: string) => {
    switch (type) {
      case 'direct':
        return User;
      case 'group':
      case 'team':
        return Users;
      case 'site':
        return Building2;
      default:
        return Users;
    }
  };

  const getConversationName = () => {
    if (conversation?.name) return conversation.name;
    if (conversation?.type === 'direct' && participants.length > 0) {
      const otherParticipant = participants.find(p => p.id !== user?.id);
      return otherParticipant?.full_name || otherParticipant?.email?.split('@')[0] || 'Direct Message';
    }
    if (participants.length > 0) {
      return participants.map(p => p.full_name || p.email?.split('@')[0]).join(', ');
    }
    return 'Conversation';
  };

  const Icon = conversation ? getConversationIcon(conversation.type) : Users;

  if (loading) {
    return (
      <div className="flex-shrink-0 h-16 border-b border-white/[0.06] bg-white/[0.02] px-4 flex items-center">
        <div className="h-4 w-32 bg-white/[0.1] rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 h-16 border-b border-white/[0.06] bg-[#0B0D13] px-4 flex items-center justify-between relative">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-shrink-0 p-2 bg-pink-500/10 rounded-lg">
          <Icon className="w-5 h-5 text-pink-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-white truncate">
            {getConversationName()}
          </h2>
          {participants.length > 0 && (
            <p className="text-xs text-white/50 truncate">
              {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
            </p>
          )}
        </div>
      </div>
      {/* Ask AI Button - Positioned in top right */}
      <div className="flex-shrink-0 relative">
        <AIAssistantWidget position="top-right" compact={true} />
      </div>
    </div>
  );
}

