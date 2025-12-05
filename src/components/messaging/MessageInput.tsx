"use client";

import { useState, useRef, KeyboardEvent, useEffect, useCallback } from 'react';
import { Send, Paperclip, Smile, X, Mic, MicOff, User } from 'lucide-react';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/messaging/utils';
import { useAppContext } from '@/context/AppContext';

interface MessageInputProps {
  conversationId: string;
  sendMessage: (content: string, replyToId?: string) => Promise<any>;
  replyTo?: { id: string; content: string; senderName: string } | null;
  onCancelReply?: () => void;
}

interface MentionUser {
  id: string;
  full_name: string | null;
  email: string | null;
  isParticipant?: boolean;
}

export function MessageInput({
  conversationId,
  sendMessage,
  replyTo,
  onCancelReply,
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [dictationSupported, setDictationSupported] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(-1);
  const [mentionStart, setMentionStart] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const { setTyping } = useTypingIndicator({ conversationId });
  const { companyId, user } = useAppContext();

  // Load mentionable users (participants + organization users)
  useEffect(() => {
    if (!conversationId || !companyId) return;

    const loadMentionUsers = async () => {
      try {
        // Load conversation participants
        const { data: participantsData } = await supabase
          .from('messaging_channel_members')
          .select(`
            user_id,
            profiles:user_id (
              id,
              full_name,
              email
            )
          `)
          .eq('channel_id', conversationId)
          .is('left_at', null);

        const participants: MentionUser[] = (participantsData || [])
          .map((m: any) => ({
            id: m.user_id,
            full_name: m.profiles?.full_name || null,
            email: m.profiles?.email || null,
            isParticipant: true,
          }))
          .filter((p: MentionUser) => p.id !== user?.id); // Exclude current user

        // Load organization users
        const { data: orgUsersData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('company_id', companyId)
          .order('full_name');

        const orgUsers: MentionUser[] = (orgUsersData || [])
          .map((p: any) => ({
            id: p.id,
            full_name: p.full_name || null,
            email: p.email || null,
            isParticipant: false,
          }))
          .filter((p: MentionUser) => 
            p.id !== user?.id && // Exclude current user
            !participants.some(part => part.id === p.id) // Don't duplicate participants
          );

        // Combine: participants first, then org users
        setMentionUsers([...participants, ...orgUsers]);
      } catch (error) {
        console.error('Error loading mention users:', error);
      }
    };

    loadMentionUsers();
  }, [conversationId, companyId, user?.id]);

  // Check if speech recognition is supported
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setDictationSupported(!!SpeechRecognition);
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!dictationSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Update content with final transcript (append to existing)
      if (finalTranscript) {
        setContent((prev) => {
          const newContent = (prev + finalTranscript).trim();
          return newContent;
        });
      }
      
      // Optionally show interim results (uncomment if you want real-time preview)
      // Note: This can cause flickering, so we'll only use final results
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsDictating(false);
      
      // Show user-friendly error messages
      if (event.error === 'no-speech') {
        console.log('No speech detected. Try again.');
      } else if (event.error === 'not-allowed') {
        console.error('Microphone permission denied. Please enable microphone access.');
      }
    };

    recognition.onend = () => {
      setIsDictating(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
      }
    };
  }, [dictationSupported]);

  const toggleDictation = () => {
    if (!recognitionRef.current) return;

    if (isDictating) {
      // Stop dictation
      try {
        recognitionRef.current.stop();
        setIsDictating(false);
      } catch (e) {
        console.error('Error stopping recognition:', e);
        setIsDictating(false);
      }
    } else {
      // Start dictation
      try {
        recognitionRef.current.start();
        setIsDictating(true);
      } catch (e) {
        console.error('Error starting recognition:', e);
        setIsDictating(false);
      }
    }
  };

  const handleSend = async () => {
    if (!content.trim() && !replyTo) return;

    // Stop dictation if active
    if (isDictating && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setIsDictating(false);
      } catch (e) {
        // Ignore errors
      }
    }

    await sendMessage(content.trim(), replyTo?.id);
    setContent('');
    setTyping(false);
    if (onCancelReply) onCancelReply();
  };


  // Handle mention detection
  const handleInputChange = (value: string) => {
    setContent(value);
    
    if (value.trim()) {
      setTyping(true);
    } else {
      setTyping(false);
    }

    // Check for @ mention
    const cursorPos = textareaRef.current?.selectionStart || value.length;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      // Check if @ is part of a word (not already in a mention)
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      const spaceAfterAt = textAfterAt.indexOf(' ');
      const newlineAfterAt = textAfterAt.indexOf('\n');
      
      // If no space/newline after @, we're in a mention
      if (spaceAfterAt === -1 && newlineAfterAt === -1) {
        setMentionStart(lastAtIndex);
        setMentionQuery(textAfterAt.toLowerCase());
        setShowMentions(true);
        setMentionIndex(-1);
        return;
      }
    }
    
    // Close mentions if @ is not active
    setShowMentions(false);
    setMentionQuery('');
    setMentionStart(-1);
  };

  // Filter users based on mention query
  const filteredMentionUsers = mentionUsers.filter((u) => {
    if (!mentionQuery) return true;
    const name = (u.full_name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    return name.includes(mentionQuery) || email.includes(mentionQuery);
  });

  // Handle mention selection
  const selectMention = useCallback((user: MentionUser) => {
    if (mentionStart === -1 || !textareaRef.current) return;

    const beforeMention = content.substring(0, mentionStart);
    const afterMention = content.substring(mentionStart + 1 + mentionQuery.length);
    const mentionText = `@${user.full_name || user.email?.split('@')[0] || 'User'}`;
    const newContent = beforeMention + mentionText + ' ' + afterMention;

    setContent(newContent);
    setShowMentions(false);
    setMentionQuery('');
    setMentionStart(-1);
    setMentionIndex(-1);

    // Focus textarea and set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionStart + mentionText.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [content, mentionStart, mentionQuery]);

  // Handle keyboard navigation for mentions
  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredMentionUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => 
          prev < filteredMentionUsers.length - 1 ? prev + 1 : 0
        );
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => 
          prev > 0 ? prev - 1 : filteredMentionUsers.length - 1
        );
        return;
      } else if (e.key === 'Enter' && mentionIndex >= 0) {
        e.preventDefault();
        selectMention(filteredMentionUsers[mentionIndex]);
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
        setMentionQuery('');
        setMentionStart(-1);
        return;
      }
    }

    // Original Enter key behavior
    if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
      e.preventDefault();
      handleSend();
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
    <div className="flex-shrink-0 border-t border-white/[0.1] bg-white/[0.03] p-2 sm:p-2 md:p-3">
      {/* Reply Preview - Fixed height to prevent layout shift */}
      <div className={`mb-3 transition-all duration-200 ${replyTo ? 'h-[60px] opacity-100' : 'h-0 opacity-0 overflow-hidden'}`}>
        {replyTo && (
          <div className="px-3 py-2 bg-white/[0.05] border-l-2 border-pink-500/50 rounded flex items-center justify-between h-full">
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="text-xs text-white/60 mb-1 truncate">Replying to {replyTo.senderName}</div>
              <div className="text-sm text-white/80 truncate break-words">{replyTo.content}</div>
            </div>
            <button
              onClick={onCancelReply}
              className="flex-shrink-0 ml-2 p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>
        )}
      </div>

      {/* Input Area - Fixed height */}
      <div className="flex items-center gap-2 h-[44px]">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-shrink-0 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          title="Attach file"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {dictationSupported && (
          <button
            onClick={toggleDictation}
            className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
              isDictating
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 animate-pulse'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title={isDictating ? 'Stop dictation' : 'Start voice dictation'}
          >
            {isDictating ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileUpload}
          accept="image/*,.pdf,.doc,.docx,.txt"
        />

        <div className="flex-1 relative h-full">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyPress}
            onBlur={() => {
              // Delay closing mentions to allow click events
              setTimeout(() => {
                setTyping(false);
                if (!mentionDropdownRef.current?.matches(':hover')) {
                  setShowMentions(false);
                }
              }, 200);
            }}
            placeholder="Type a message... (use @ to mention someone)"
            rows={1}
            className="w-full h-full px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder-white/40 resize-none focus:outline-none focus:ring-2 focus:ring-pink-500/50 text-sm leading-tight"
            style={{
              minHeight: '44px',
              maxHeight: '44px',
            }}
          />
          
          {/* Mention Dropdown */}
          {showMentions && filteredMentionUsers.length > 0 && (
            <div
              ref={mentionDropdownRef}
              className="absolute bottom-full left-0 mb-2 w-64 max-h-60 overflow-y-auto bg-[#0f1220] border border-white/[0.1] rounded-lg shadow-xl z-50"
              onMouseDown={(e) => e.preventDefault()} // Prevent textarea blur
            >
              {filteredMentionUsers.map((user, index) => (
                <button
                  key={user.id}
                  onClick={() => selectMention(user)}
                  className={`w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-white/[0.05] transition-colors ${
                    index === mentionIndex ? 'bg-white/[0.08]' : ''
                  } ${user.isParticipant ? 'border-l-2 border-pink-500/50' : ''}`}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-pink-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">
                      {user.full_name || user.email?.split('@')[0] || 'User'}
                    </div>
                    {user.full_name && user.email && (
                      <div className="text-xs text-white/50 truncate">
                        {user.email}
                      </div>
                    )}
                    {user.isParticipant && (
                      <div className="text-xs text-pink-400/70 mt-0.5">
                        In this conversation
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleSend}
          disabled={!content.trim() && !replyTo}
          className="flex-shrink-0 w-[44px] h-[44px] flex items-center justify-center bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* Status indicators - Fixed height to prevent layout shift */}
      <div className={`h-[20px] transition-all duration-200 flex items-center gap-3 ${(uploading || isDictating) ? 'opacity-100' : 'opacity-0 overflow-hidden'}`}>
        {uploading && (
          <div className="text-xs text-white/60">Uploading file...</div>
        )}
        {isDictating && (
          <div className="flex items-center gap-2 text-xs text-red-400">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
            <span>Listening...</span>
          </div>
        )}
      </div>
    </div>
  );
}

