"use client";

import { useState, useEffect } from 'react';
import { Users, Building2, User, Sparkles } from '@/components/ui/icons';
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
          // First get member user IDs
          const { data: membersData, error: membersError } = await supabase
            .from('messaging_channel_members')
            .select('profile_id')
            .eq('channel_id', conversationId)
            .is('left_at', null);
          
          // Then fetch profiles separately
          let participants: any[] = [];
          if (!membersError && membersData && membersData.length > 0) {
            const userIds = membersData.map((m: any) => m.profile_id || m.user_id);
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .in('id', userIds);
            
            participants = (profilesData || []).map(profile => ({
              user_id: profile.id, // Keep for backward compatibility
              profile_id: profile.id,
              profiles: profile
            }));
          }

          if (!membersError) {
            setParticipants(participants.map((m: any) => ({
              id: m.profile_id || m.user_id,
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
    // For direct messages, always show the OTHER person's name (not the channel name)
    if (conversation?.type === 'direct' && participants.length > 0) {
      const otherParticipant = participants.find(p => p.id !== user?.id);
      if (otherParticipant) {
        return otherParticipant.full_name || otherParticipant.email?.split('@')[0] || 'Direct Message';
      }
      // Fallback: if we can't find the other participant, use channel name
      // but only if it's not the current user's name
      if (conversation?.name && conversation.name !== user?.email) {
        return conversation.name;
      }
      return 'Direct Message';
    }
    
    // For group/site/team channels, use the channel name or participant list
    if (conversation?.name) return conversation.name;
    if (participants.length > 0) {
      return participants.map(p => p.full_name || p.email?.split('@')[0]).join(', ');
    }
    return 'Conversation';
  };

  const Icon = conversation ? getConversationIcon(conversation.type) : Users;

  if (loading) {
    return (
      <div className="flex-shrink-0 h-16 border-b border-theme bg-white dark:bg-white/[0.02] px-4 flex items-center">
        <div className="h-4 w-32 bg-gray-200 dark:bg-white/[0.1] rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 h-16 border-b border-theme bg-white dark:bg-[#0B0D13] px-4 flex items-center justify-between relative">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-shrink-0 p-2 bg-[#D37E91]/10 dark:bg-[#D37E91]/15 rounded-lg">
          <Icon className="w-5 h-5 text-[#D37E91] dark:text-[#D37E91]" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-theme-primary truncate flex items-center gap-2">
            {getConversationName()}
            {conversation?.name?.includes('(WhatsApp)') && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium rounded">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.11-1.14l-.29-.18-3.01.79.81-2.95-.19-.3A7.96 7.96 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/></svg>
                WhatsApp
              </span>
            )}
          </h2>
          {participants.length > 0 && (
            <p className="text-xs text-theme-tertiary truncate">
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

