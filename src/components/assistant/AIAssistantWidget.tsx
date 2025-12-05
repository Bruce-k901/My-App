'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  MessageCircle, 
  X, 
  Send, 
  Loader2, 
  Bot, 
  User, 
  ChevronDown,
  Sparkles,
  BookOpen,
  AlertCircle,
  Headphones,
  Mail,
  Phone
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { usePathname, useRouter } from 'next/navigation';

// ============================================================================
// TYPES
// ============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Array<{
    title: string;
    category: string;
    source: string | null;
  }>;
  isError?: boolean;
}

interface QuickAction {
  label: string;
  query: string;
  icon: React.ReactNode;
}

// ============================================================================
// QUICK ACTIONS (Suggested questions)
// ============================================================================

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Fridge temperatures',
    query: 'What temperature should my fridge be at?',
    icon: <span className="text-lg">🌡️</span>
  },
  {
    label: 'Task not showing',
    query: "My task isn't showing in Today's Tasks. How do I fix it?",
    icon: <span className="text-lg">❓</span>
  },
  {
    label: 'Create an SOP',
    query: 'How do I create a Standard Operating Procedure in Checkly?',
    icon: <span className="text-lg">📝</span>
  },
  {
    label: 'Fire alarm testing',
    query: 'How often do I need to test fire alarms and what should I check?',
    icon: <span className="text-lg">🔔</span>
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface AIAssistantWidgetProps {
  position?: 'bottom-right' | 'top-right';
  compact?: boolean;
}

export default function AIAssistantWidget({ position = 'bottom-right', compact = false }: AIAssistantWidgetProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showContactOptions, setShowContactOptions] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { profile, companyId, siteId } = useAppContext();
  const pathname = usePathname();
  const router = useRouter();
  
  // Generate session ID for conversation tracking (persist across remounts)
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  
  // Mount check for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  
  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);
  
  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);
  
  // Track scroll position to show/hide scroll button
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom && messages.length > 2);
  }, [messages.length]);
  
  // Send message to API
  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      // Build conversation history for context
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));
      
      // Build user context
      const userContext = {
        userId: profile?.id,
        companyId: companyId,
        siteId: siteId,
        role: profile?.app_role || 'Staff',
        siteName: profile?.site_id ? 'Current Site' : undefined, // Would need to fetch site name
        currentPage: pathname,
        sessionId: sessionIdRef.current
      };
      
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: content.trim(),
          conversationHistory,
          userContext
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get response');
      }
      
      const data = await response.json();
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        sources: data.sourcesUsed
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
    } catch (error: any) {
      console.error('Assistant error:', error);
      
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: error.message || 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };
  
  // Handle quick action click
  const handleQuickAction = (query: string) => {
    sendMessage(query);
  };
  
  // Handle contact human - show options or navigate to support
  const handleContactHuman = () => {
    setShowContactOptions(true);
    // Auto-scroll to bottom to show contact options
    setTimeout(() => scrollToBottom(), 100);
  };
  
  // Navigate to support page
  const goToSupportPage = () => {
    setIsOpen(false);
    router.push('/dashboard/support');
  };
  
  // Open email client
  const openEmailSupport = () => {
    window.location.href = 'mailto:support@checkly.com?subject=Support Request from AI Assistant';
  };
  
  // Format message content (basic markdown-like formatting)
  const formatContent = (content: string) => {
    // Bold text
    let formatted = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br />');
    // Bullet points
    formatted = formatted.replace(/^- (.+)$/gm, '• $1');
    
    return formatted;
  };
  
  // Don't render until mounted (prevents hydration issues)
  if (!mounted) return null;
  
  const widgetContent = (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`${position === 'top-right' 
            ? 'fixed top-[88px] right-4 lg:right-6 z-[10001]' 
            : 'fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[10000]'
          } flex items-center gap-2 ${compact ? 'px-2 py-2' : 'px-3 py-2.5 sm:px-4 sm:py-3'} rounded-full 
            bg-transparent text-[#EC4899] border border-[#EC4899] shadow-lg 
            hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] hover:scale-105 
            transition-all duration-200 ease-in-out`}
          aria-label="Open AI Assistant"
        >
          <Sparkles className={`${compact ? 'w-4 h-4' : 'w-4 h-4 sm:w-5 sm:h-5'}`} />
          {!compact && <span className="font-medium text-sm sm:text-base">Ask AI</span>}
        </button>
      )}
      
      {/* Chat Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9999]"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Chat Panel */}
          <div 
            className={`${position === 'top-right' 
              ? 'fixed inset-0 sm:inset-auto sm:top-20 sm:right-4' 
              : 'fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6'
            } z-[10000] 
              w-full sm:w-[400px] h-full sm:h-[600px] sm:max-h-[80vh] 
              bg-[#0f1220] border-0 sm:border border-white/[0.06] rounded-none sm:rounded-2xl shadow-2xl 
              flex flex-col overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 sm:py-3 border-b border-white/[0.06] bg-white/[0.03] flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="p-1.5 sm:p-2 bg-white/[0.06] rounded-lg border border-[#EC4899]/20 flex-shrink-0">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-[#EC4899]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-white text-sm sm:text-base truncate">Checkly Assistant</h3>
                <p className="text-xs text-white/60 hidden sm:block">Compliance & app support</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Contact Human Button */}
              <button
                onClick={handleContactHuman}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg 
                  bg-transparent text-[#EC4899] border border-[#EC4899] text-xs font-medium
                  hover:shadow-[0_0_8px_rgba(236,72,153,0.5)] hover:bg-[#EC4899]/10
                  transition-all duration-200 ease-in-out"
                aria-label="Contact Human Support"
                title="Speak to a human"
              >
                <Headphones className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Human</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-white/[0.06] text-white/60 hover:text-white transition-colors flex-shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Messages Area */}
          <div 
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 min-h-0"
          >
            {/* Welcome message if no messages */}
            {messages.length === 0 && (
              <div className="text-center py-4 sm:py-6">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/[0.03] border border-[#EC4899]/20 mb-3 sm:mb-4">
                  <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-[#EC4899]" />
                </div>
                <h4 className="text-base sm:text-lg font-semibold text-white mb-2">
                  How can I help?
                </h4>
                <p className="text-xs sm:text-sm text-white/60 mb-4 sm:mb-6 max-w-xs mx-auto px-2">
                  Ask me about UK compliance regulations, how to use Checkly, or creating SOPs and Risk Assessments.
                </p>
                
                {/* Quick Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {QUICK_ACTIONS.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickAction(action.query)}
                      className="flex items-center gap-2 p-2.5 sm:p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] 
                        hover:bg-white/[0.08] hover:border-white/[0.12] transition-colors text-left"
                    >
                      {action.icon}
                      <span className="text-xs sm:text-sm text-white/80">{action.label}</span>
                    </button>
                  ))}
                </div>
                
                {/* Contact Human Quick Action */}
                <button
                  onClick={handleContactHuman}
                  className="mt-3 sm:mt-4 w-full flex items-center justify-center gap-2 p-2.5 sm:p-3 rounded-lg 
                    bg-transparent border border-[#EC4899] text-[#EC4899]
                    hover:shadow-[0_0_12px_rgba(236,72,153,0.5)] hover:bg-[#EC4899]/10
                    transition-all duration-200 ease-in-out"
                >
                  <Headphones className="w-4 h-4" />
                  <span className="text-xs sm:text-sm font-medium">Speak to a Human</span>
                </button>
              </div>
            )}
            
            {/* Message List */}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center
                  ${message.role === 'user' 
                    ? 'bg-blue-500/20' 
                    : message.isError 
                      ? 'bg-red-500/20' 
                      : 'bg-white/[0.06] border border-[#EC4899]/20'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                  ) : message.isError ? (
                    <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#EC4899]" />
                  )}
                </div>
                
                {/* Message Content */}
                <div className={`flex-1 max-w-[85%] sm:max-w-[280px] ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div
                    className={`inline-block px-3 py-2 sm:px-4 sm:py-3 rounded-2xl text-xs sm:text-sm
                      ${message.role === 'user'
                        ? 'bg-blue-500/20 text-white rounded-br-md'
                        : message.isError
                          ? 'bg-red-500/10 border border-red-500/20 text-red-200 rounded-bl-md'
                          : 'bg-white/[0.06] text-white/90 rounded-bl-md'
                      }`}
                  >
                    <div 
                      className="whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
                    />
                  </div>
                  
                  {/* Sources (for assistant messages) */}
                  {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-white/40">
                      <BookOpen className="w-3 h-3" />
                      <span>Sources: {message.sources.map(s => s.title).join(', ').substring(0, 60)}...</span>
                    </div>
                  )}
                  
                  {/* Timestamp */}
                  <div className={`text-xs text-white/30 mt-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/[0.06] border border-[#EC4899]/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-[#EC4899]" />
                </div>
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl rounded-bl-md bg-white/[0.06]">
                  <Loader2 className="w-4 h-4 text-[#EC4899] animate-spin" />
                  <span className="text-sm text-white/60">Thinking...</span>
                </div>
              </div>
            )}
            
            {/* Contact Human Options */}
            {showContactOptions && (
              <div className="flex gap-3 mt-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/[0.06] border border-[#EC4899]/20 flex items-center justify-center">
                  <Headphones className="w-4 h-4 text-[#EC4899]" />
                </div>
                <div className="flex-1 max-w-[280px]">
                  <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white/[0.06] border border-[#EC4899]/20">
                    <p className="text-sm text-white/90 mb-3">
                      Need to speak with a human? We're here to help!
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={openEmailSupport}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg 
                          bg-transparent border border-[#EC4899] text-[#EC4899] text-xs font-medium
                          hover:shadow-[0_0_8px_rgba(236,72,153,0.5)] hover:bg-[#EC4899]/10
                          transition-all duration-200 ease-in-out"
                      >
                        <Mail className="w-4 h-4" />
                        <span>Email: support@checkly.com</span>
                      </button>
                      <button
                        onClick={goToSupportPage}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg 
                          bg-transparent border border-white/[0.2] text-white/80 text-xs font-medium
                          hover:bg-white/[0.08] hover:border-white/[0.3]
                          transition-all duration-200 ease-in-out"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>View All Support Options</span>
                      </button>
                    </div>
                    <button
                      onClick={() => setShowContactOptions(false)}
                      className="mt-2 text-xs text-white/40 hover:text-white/60 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                  <div className="text-xs text-white/30 mt-1">
                    Support available Mon-Fri, 9 AM - 6 PM EST
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Scroll to bottom button */}
          {showScrollButton && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 p-2 rounded-full 
                bg-transparent text-[#EC4899] border border-[#EC4899] shadow-lg 
                hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all duration-200 ease-in-out z-10"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
          
          {/* Input Area */}
          <form 
            onSubmit={handleSubmit}
            className="p-3 sm:p-4 border-t border-white/[0.06] bg-black/20 flex-shrink-0"
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about compliance, tasks, or Checkly..."
                disabled={isLoading}
                className="flex-1 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] 
                  text-white placeholder-white/40 text-xs sm:text-sm
                  focus:outline-none focus:ring-2 focus:ring-[#EC4899]/40 focus:border-[#EC4899]/40
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="p-2.5 sm:p-3 rounded-xl bg-transparent text-[#EC4899] border border-[#EC4899] flex-shrink-0
                  hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all duration-200 ease-in-out
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            </div>
            
            {/* Disclaimer */}
            <p className="text-xs text-white/30 text-center mt-2 hidden sm:block">
              AI responses are guidance only. Always verify critical compliance info.
            </p>
          </form>
          </div>
        </>
      )}
    </>
  );
  
  // Use portal to render outside normal DOM hierarchy for stability
  return createPortal(widgetContent, document.body);
}

