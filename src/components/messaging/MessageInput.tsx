"use client";

import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { Smile, X } from 'lucide-react';
import { VoiceInput } from '@/components/ui/VoiceInput';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/messaging/utils';

interface MessageInputProps {
  conversationId: string;
  sendMessage: (content: string, replyToId?: string) => Promise<any>;
  replyTo?: { id: string; content: string; senderName: string } | null;
  onCancelReply?: () => void;
}

export function MessageInput({
  conversationId,
  sendMessage,
  replyTo,
  onCancelReply,
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setTyping } = useTypingIndicator({ conversationId });

  const handleSend = async () => {
    if (!content.trim() && !replyTo) return;

    await sendMessage(content.trim(), replyTo?.id);
    setContent('');
    setTyping(false);
    if (onCancelReply) onCancelReply();
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (value: string) => {
    setContent(value);
    if (value.trim()) {
      setTyping(true);
    } else {
      setTyping(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversationId) return;

    setUploading(true);
    try {
      // Compress images before upload (maintains high resolution but reduces file size)
      let fileToUpload = file;
      let originalSize = file.size;
      
      if (file.type.startsWith('image/')) {
        try {
          fileToUpload = await compressImage(file);
          console.log(`Image compression: ${(originalSize / 1024).toFixed(1)}KB → ${(fileToUpload.size / 1024).toFixed(1)}KB`);
        } catch (compressionError) {
          console.warn('Image compression failed, using original:', compressionError);
          // Continue with original file if compression fails
        }
      }

      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${conversationId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('message_attachments')
        .upload(fileName, fileToUpload);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('message_attachments')
        .getPublicUrl(fileName);

      // Create message with file
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const messageType = fileToUpload.type.startsWith('image/') ? 'image' : 'file';

      await supabase.from('messaging_messages').insert({
        channel_id: conversationId,
        sender_id: user.id,
        sender_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        content: fileToUpload.name,
        message_type: messageType,
        file_url: urlData.publicUrl,
        file_name: fileToUpload.name,
        file_size: fileToUpload.size,
        file_type: fileToUpload.type,
        parent_message_id: replyTo?.id || null,
        attachments: [],
      });

      if (onCancelReply) onCancelReply();
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex-shrink-0 border-t border-white/[0.1] bg-white/[0.03] p-2 sm:p-3 md:p-4 max-w-full overflow-hidden">
      {/* Reply Preview - Fixed height to prevent layout shift */}
      <div className={`mb-2 sm:mb-3 transition-all duration-200 ${replyTo ? 'h-[50px] sm:h-[60px] opacity-100' : 'h-0 opacity-0 overflow-hidden'}`}>
        {replyTo && (
          <div className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white/[0.05] border-l-2 border-pink-500/50 rounded flex items-center justify-between h-full">
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="text-[10px] sm:text-xs text-white/60 mb-0.5 sm:mb-1 truncate">Replying to {replyTo.senderName}</div>
              <div className="text-xs sm:text-sm text-white/80 truncate break-words">{replyTo.content}</div>
            </div>
            <button
              onClick={onCancelReply}
              className="flex-shrink-0 ml-2 min-h-[32px] min-w-[32px] p-1 hover:bg-white/10 active:bg-white/15 rounded transition-colors touch-manipulation"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/60" />
            </button>
          </div>
        )}
      </div>

      {/* Input Area - Fixed height */}
      <div className="flex items-center gap-1.5 sm:gap-2 h-[44px]">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-shrink-0 min-h-[44px] min-w-[44px] p-2 text-white/60 hover:text-white active:text-white/80 hover:bg-white/10 active:bg-white/15 rounded-lg transition-colors disabled:opacity-50 touch-manipulation"
          title="Attach file"
        >
          <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileUpload}
          accept="image/*,.pdf,.doc,.docx,.txt"
        />

        <VoiceInput 
          onTranscript={(text) => handleInputChange(content ? `${content} ${text}` : text)}
          className="flex-shrink-0 min-h-[44px] min-w-[44px]"
        />

        <div className="flex-1 relative h-full min-w-0">
          <textarea
            value={content}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            onBlur={() => setTyping(false)}
            placeholder="Type a message..."
            rows={1}
            className="w-full h-full px-3 sm:px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder-white/40 resize-none focus:outline-none focus:ring-2 focus:ring-pink-500/50 text-xs sm:text-sm leading-tight touch-manipulation overflow-x-hidden"
            style={{
              minHeight: '44px',
              maxHeight: '44px',
            }}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!content.trim() && !replyTo}
          className="flex-shrink-0 min-h-[44px] min-w-[44px] w-[44px] h-[44px] flex items-center justify-center bg-pink-500/20 hover:bg-pink-500/30 active:bg-pink-500/40 text-pink-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          title="Send message"
        >
          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Upload status - Fixed height to prevent layout shift */}
      <div className={`h-[18px] sm:h-[20px] transition-all duration-200 ${uploading ? 'opacity-100' : 'opacity-0 overflow-hidden'}`}>
        {uploading && (
          <div className="text-[10px] sm:text-xs text-white/60">Uploading file...</div>
        )}
      </div>
    </div>
  );
}

