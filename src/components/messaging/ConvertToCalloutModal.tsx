"use client";

import React, { useState, useEffect } from 'react';
import { Wrench, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'sonner';
import { detectPriority } from '@/lib/messaging/detectAction';
import type { Message } from '@/types/messaging';

interface ConvertToCalloutModalProps {
  message: Message;
  conversationContext?: {
    site_id?: string;
    asset_id?: string;
  };
  onClose: () => void;
  onSuccess: (calloutId: string) => void;
}

export default function ConvertToCalloutModal({ 
  message, 
  conversationContext,
  onClose, 
  onSuccess 
}: ConvertToCalloutModalProps) {
  const { companyId, siteId: userSiteId, userId } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [calloutData, setCalloutData] = useState({
    asset_id: conversationContext?.asset_id || '',
    site_id: conversationContext?.site_id || userSiteId || '',
    callout_type: 'reactive' as 'reactive' | 'warranty' | 'ppm',
    priority: detectPriority(message.content) as 'low' | 'medium' | 'urgent',
    fault_description: message.content,
    notes: '',
  });

  // Load assets for the site
  useEffect(() => {
    if (!calloutData.site_id || !companyId) return;

    const loadAssets = async () => {
      const { data } = await supabase
        .from('assets')
        .select('id, name, category')
        .eq('company_id', companyId)
        .eq('site_id', calloutData.site_id)
        .is('archived', false)
        .order('name');
      
      if (data) {
        setAssets(data);
      }
    };

    loadAssets();
  }, [calloutData.site_id, companyId]);

  const handleCreate = async () => {
    if (!calloutData.asset_id) {
      toast.error('Please select an asset');
      return;
    }

    if (!companyId) {
      toast.error('Company ID is required');
      return;
    }

    if (!calloutData.fault_description.trim()) {
      toast.error('Please enter a fault description');
      return;
    }

    setLoading(true);
    try {
      // Get image attachments from message if any
      const attachments: string[] = [];
      if (message.message_type === 'image' && message.file_url) {
        attachments.push(message.file_url);
      }

      // Create the callout
      const { data: callout, error: calloutError } = await supabase
        .from('callouts')
        .insert({
          company_id: companyId,
          asset_id: calloutData.asset_id,
          site_id: calloutData.site_id || null,
          callout_type: calloutData.callout_type,
          priority: calloutData.priority,
          fault_description: calloutData.fault_description,
          notes: calloutData.notes || null,
          attachments: attachments.length > 0 ? attachments : null,
          status: 'open',
          created_by: userId,
        })
        .select()
        .single();

      if (calloutError) throw calloutError;

      // Update the message to mark action was taken
      const { error: messageError } = await supabase
        .from('messaging_messages')
        .update({
          metadata: {
            ...message.metadata,
            action_taken: true,
            action_type: 'callout_created',
            action_entity_id: callout.id,
          }
        })
        .eq('id', message.id);

      if (messageError) {
        console.error('Error updating message:', messageError);
        // Non-fatal, continue
      }

      // Add a system message to the conversation
      if (userId) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('messaging_messages').insert({
          channel_id: message.channel_id,
          sender_id: userId,
          sender_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'System',
          content: `🔧 Callout created: ${calloutData.fault_description.substring(0, 50)}${calloutData.fault_description.length > 50 ? '...' : ''}`,
          message_type: 'system',
          is_system: true,
          attachments: [],
          metadata: {
            type: 'callout_created',
            callout_id: callout.id,
            original_message_id: message.id
          }
        });
      }

      toast.success('Callout created successfully');
      onSuccess(callout.id);
    } catch (error: any) {
      console.error('Error creating callout:', error);
      toast.error(error?.message || 'Failed to create callout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1d2e] border border-white/[0.08] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Wrench className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Create Callout</h2>
              <p className="text-sm text-white/60">Create a maintenance callout from this message</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-white/60" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Original Message Preview */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
            <p className="text-xs text-white/40 mb-2">Original Message:</p>
            <p className="text-sm text-white/80 line-clamp-3">{message.content}</p>
          </div>

          {/* Asset Selection */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Asset *
            </label>
            <select
              value={calloutData.asset_id}
              onChange={(e) => setCalloutData({ ...calloutData, asset_id: e.target.value })}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white focus:outline-none focus:border-[#EC4899] transition-colors"
              required
            >
              <option value="">Select an asset...</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id} className="bg-[#1a1d2e]">
                  {asset.name} ({asset.category})
                </option>
              ))}
            </select>
          </div>

          {/* Callout Type */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Callout Type
            </label>
            <div className="flex gap-2">
              {['reactive', 'warranty', 'ppm'].map((type) => (
                <button
                  key={type}
                  onClick={() => setCalloutData({ ...calloutData, callout_type: type as any })}
                  className={`
                    flex-1 px-4 py-2 rounded-lg border transition-all capitalize
                    ${calloutData.callout_type === type
                      ? 'bg-transparent border-[#EC4899] text-[#EC4899]'
                      : 'bg-white/[0.03] border-white/[0.06] text-white/60 hover:bg-white/[0.06]'
                    }
                  `}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Priority
            </label>
            <div className="flex gap-2">
              {['low', 'medium', 'urgent'].map((priority) => (
                <button
                  key={priority}
                  onClick={() => setCalloutData({ ...calloutData, priority: priority as any })}
                  className={`
                    flex-1 px-4 py-2 rounded-lg border transition-all capitalize
                    ${calloutData.priority === priority
                      ? priority === 'urgent' 
                        ? 'bg-red-500/20 border-red-500/40 text-red-400'
                        : priority === 'medium'
                        ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                        : 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                      : 'bg-white/[0.03] border-white/[0.06] text-white/60 hover:bg-white/[0.06]'
                    }
                  `}
                >
                  {priority}
                </button>
              ))}
            </div>
          </div>

          {/* Fault Description */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Fault Description *
            </label>
            <textarea
              value={calloutData.fault_description}
              onChange={(e) => setCalloutData({ ...calloutData, fault_description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#EC4899] transition-colors resize-none"
              placeholder="Describe the issue..."
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Additional Notes
            </label>
            <textarea
              value={calloutData.notes}
              onChange={(e) => setCalloutData({ ...calloutData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#EC4899] transition-colors resize-none"
              placeholder="Add any additional information..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white hover:bg-white/[0.06] transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !calloutData.asset_id || !calloutData.fault_description.trim()}
            className="px-6 py-2.5 bg-transparent text-[#EC4899] border border-[#EC4899] rounded-lg font-medium hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Callout'}
          </button>
        </div>
      </div>
    </div>
  );
}

