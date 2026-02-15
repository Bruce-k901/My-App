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
  Phone,
  RotateCcw,
  Plus,
  History,
  Thermometer,
  FileText,
  Bell,
  AlertTriangle,
  Receipt,
  ClipboardList,
  Calculator,
  TrendingUp,
  Calendar,
  Clock,
  DollarSign,
  GraduationCap,
  Factory,
  ShoppingCart,
  Truck,
  Wrench,
  Package,
  Megaphone,
  Users,
  Paperclip,
  HelpCircle,
  Lightbulb
} from '@/components/ui/icons';
import { useAppContext } from '@/context/AppContext';
import { usePathname, useRouter } from 'next/navigation';
import { captureScreenshot, blobToDataURL } from './ScreenshotCapture';
import { Camera, Save } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { usePanelStore } from '@/lib/stores/panel-store';
import { useTheme } from '@/hooks/useTheme';
import { TicketCreationModal } from './TicketCreationModal';

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
// MODULE DETECTION
// ============================================================================

function detectModule(pathname: string): string {
  if (pathname?.startsWith('/dashboard/todays_tasks') ||
      pathname?.startsWith('/dashboard/tasks') ||
      pathname?.startsWith('/dashboard/checklists') ||
      pathname?.startsWith('/dashboard/incidents') ||
      pathname?.startsWith('/dashboard/sops') ||
      pathname?.startsWith('/dashboard/risk-assessments') ||
      pathname?.startsWith('/dashboard/logs')) {
    return 'checkly';
  }
  if (pathname?.startsWith('/dashboard/stockly')) return 'stockly';
  if (pathname?.startsWith('/dashboard/people') || pathname?.startsWith('/dashboard/courses')) return 'teamly';
  if (pathname?.startsWith('/dashboard/planly')) return 'planly';
  if (pathname?.startsWith('/dashboard/assets') || pathname?.startsWith('/dashboard/ppm')) return 'assetly';
  if (pathname?.startsWith('/dashboard/messaging')) return 'msgly';
  // Return 'general' for dashboard home and other non-module-specific pages
  return 'general';
}

// ============================================================================
// QUICK ACTIONS (Module-specific)
// ============================================================================

const MODULE_QUICK_ACTIONS: Record<string, QuickAction[]> = {
  checkly: [
    { label: 'Fridge temperatures', query: 'How do I log fridge temperatures?', icon: <Thermometer className="w-4 h-4" /> },
    { label: 'Create an SOP', query: 'Help me create an SOP', icon: <FileText className="w-4 h-4" /> },
    { label: 'Fire alarm testing', query: 'What are the fire alarm testing requirements?', icon: <Bell className="w-4 h-4" /> },
    { label: 'Report an issue', query: 'I need to report an issue', icon: <AlertTriangle className="w-4 h-4" /> }
  ],
  stockly: [
    { label: 'Process an invoice', query: 'How do I process an invoice?', icon: <Receipt className="w-4 h-4" /> },
    { label: 'Stock count help', query: 'Help with stock counts', icon: <ClipboardList className="w-4 h-4" /> },
    { label: 'Recipe costing', query: 'How does recipe costing work?', icon: <Calculator className="w-4 h-4" /> },
    { label: 'GP calculation', query: 'Explain GP calculations', icon: <TrendingUp className="w-4 h-4" /> }
  ],
  teamly: [
    { label: 'Rota help', query: 'Help me with the rota', icon: <Calendar className="w-4 h-4" /> },
    { label: 'Leave request', query: 'How do leave requests work?', icon: <Clock className="w-4 h-4" /> },
    { label: 'Payroll query', query: 'I have a payroll question', icon: <DollarSign className="w-4 h-4" /> },
    { label: 'Training courses', query: 'How do training courses work?', icon: <GraduationCap className="w-4 h-4" /> }
  ],
  planly: [
    { label: 'Production planning', query: 'Help with production planning', icon: <Factory className="w-4 h-4" /> },
    { label: 'Order management', query: 'How do I manage orders?', icon: <ShoppingCart className="w-4 h-4" /> },
    { label: 'Delivery scheduling', query: 'Help with delivery scheduling', icon: <Truck className="w-4 h-4" /> },
    { label: 'Cutoff rules', query: 'Explain cutoff rules', icon: <Clock className="w-4 h-4" /> }
  ],
  assetly: [
    { label: 'Log an issue', query: 'I need to log an asset issue', icon: <AlertTriangle className="w-4 h-4" /> },
    { label: 'PPM scheduling', query: 'How does PPM scheduling work?', icon: <Wrench className="w-4 h-4" /> },
    { label: 'Asset tracking', query: 'Help with asset tracking', icon: <Package className="w-4 h-4" /> },
    { label: 'Contractor callout', query: 'How do I request a contractor?', icon: <Phone className="w-4 h-4" /> }
  ],
  msgly: [
    { label: 'Send announcement', query: 'How do I send an announcement?', icon: <Megaphone className="w-4 h-4" /> },
    { label: 'Create group', query: 'How do I create a group chat?', icon: <Users className="w-4 h-4" /> },
    { label: 'File sharing', query: 'How does file sharing work?', icon: <Paperclip className="w-4 h-4" /> },
    { label: 'Team communication', query: 'Tips for team communication', icon: <MessageCircle className="w-4 h-4" /> }
  ],
  dashboard: [
    { label: 'Create an SOP', query: 'Help me create an SOP', icon: <FileText className="w-4 h-4" /> },
    { label: 'Report an issue', query: 'I need to report an issue', icon: <AlertTriangle className="w-4 h-4" /> },
    { label: 'Platform help', query: 'How do I use Opsly?', icon: <HelpCircle className="w-4 h-4" /> },
    { label: 'Submit an idea', query: 'I have an idea for improvement', icon: <Lightbulb className="w-4 h-4" /> }
  ]
};

function getQuickActionsForModule(pathname: string): QuickAction[] {
  const module = detectModule(pathname);
  return MODULE_QUICK_ACTIONS[module] || MODULE_QUICK_ACTIONS.dashboard;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface AIAssistantWidgetProps {
  position?: 'bottom-right' | 'top-right';
  compact?: boolean;
}

export default function AIAssistantWidget({ position = 'bottom-right', compact = false }: AIAssistantWidgetProps = {}) {
  const { aiAssistantOpen: isOpen, setAiAssistantOpen: setIsOpen } = usePanelStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showContactOptions, setShowContactOptions] = useState(false);
  const [capturingScreenshot, setCapturingScreenshot] = useState(false);
  const [generationMode, setGenerationMode] = useState<'none' | 'sop' | 'risk-assessment' | null>(null);
  const [generationData, setGenerationData] = useState<{procedure?: string, activity?: string, requirements?: string, isCoshh?: boolean, content?: string, type: 'sop' | 'risk-assessment'} | null>(null);
  const [pendingSave, setPendingSave] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<Array<{id: string, title: string | null, updated_at: string, last_message?: string}>>([]);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [pendingTicket, setPendingTicket] = useState<{
    title: string;
    type: 'issue' | 'idea' | 'question';
    screenshot?: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { profile, companyId, siteId } = useAppContext();
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
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

  // Debug: Log current module when pathname changes
  useEffect(() => {
    if (isOpen && pathname) {
      const currentModule = detectModule(pathname);
      console.log('[Opsly Assistant] Current module:', currentModule, 'Pathname:', pathname);
    }
  }, [pathname, isOpen]);
  
  // Track scroll position to show/hide scroll button
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom && messages.length > 2);
  }, [messages.length]);
  
  // Check if message is ticket-related
  const isTicketQuery = (content: string): {isTicket: boolean, type?: 'issue' | 'idea' | 'question'} => {
    const lower = content.toLowerCase();
    if (lower.includes('report an issue') || lower.includes('report issue') || lower.includes('i need to report') || lower.includes('i want to report')) {
      return { isTicket: true, type: 'issue' };
    }
    if (lower.includes('submit an idea') || lower.includes('submit idea') || lower.includes('i have an idea') || lower.includes('idea for')) {
      return { isTicket: true, type: 'idea' };
    }
    if (lower.includes('i have a question') || lower.includes('question about')) {
      return { isTicket: true, type: 'question' };
    }
    return { isTicket: false };
  };

  // Check if message is SOP/RA generation request
  const isGenerationQuery = (content: string): {isGeneration: boolean, type?: 'sop' | 'risk-assessment'} => {
    const lower = content.toLowerCase();
    if (lower.includes('create an sop') || lower.includes('create a sop') || lower.includes('i need an sop') || lower.includes('generate an sop') || lower.includes('sop for') || lower.includes('need to create a standard operating procedure')) {
      return { isGeneration: true, type: 'sop' };
    }
    if (lower.includes('create a risk assessment') || lower.includes('create risk assessment') || lower.includes('i need a risk assessment') || lower.includes('generate a risk assessment') || lower.includes('risk assessment for')) {
      return { isGeneration: true, type: 'risk-assessment' };
    }
    return { isGeneration: false };
  };

  // Generate SOP
  const generateSOP = async (procedure: string, requirements?: string) => {
    try {
      const response = await fetch('/api/assistant/generate-sop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          procedure_description: procedure,
          requirements: requirements || '',
          company_id: companyId,
          site_id: siteId || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate SOP');
      }

      const data = await response.json();
      return data.sop;
    } catch (error: any) {
      console.error('Error generating SOP:', error);
      throw error;
    }
  };

  // Generate Risk Assessment
  const generateRiskAssessment = async (activity: string, isCoshh?: boolean) => {
    try {
      const response = await fetch('/api/assistant/generate-risk-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          activity_description: activity,
          is_coshh: isCoshh || false,
          company_id: companyId,
          site_id: siteId || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate Risk Assessment');
      }

      const data = await response.json();
      return { content: data.riskAssessment, isCoshh: data.isCoshh };
    } catch (error: any) {
      console.error('Error generating Risk Assessment:', error);
      throw error;
    }
  };

  // Save SOP to database
  const saveSOP = async (title: string, content: string) => {
    if (!companyId || !profile?.id || !profile?.full_name) {
      throw new Error('Missing required information');
    }

    // Generate ref code (SOP-YYYY-XXX format)
    const year = new Date().getFullYear();
    const { data: existingSOPs } = await supabase
      .from('sop_entries')
      .select('ref_code')
      .eq('company_id', companyId)
      .like('ref_code', `SOP-${year}-%`)
      .order('ref_code', { ascending: false })
      .limit(1);

    let refCode = `SOP-${year}-001`;
    if (existingSOPs && existingSOPs.length > 0) {
      const lastRef = existingSOPs[0].ref_code;
      const match = lastRef.match(/SOP-\d{4}-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10) + 1;
        refCode = `SOP-${year}-${num.toString().padStart(3, '0')}`;
      }
    }

    // Determine category based on title/content (simplified - could be enhanced with AI)
    let category = 'Cleaning'; // Default
    const lowerTitle = title.toLowerCase();
    const lowerContent = content.toLowerCase();
    const combined = `${lowerTitle} ${lowerContent}`;
    
    if (combined.includes('food prep') || combined.includes('prep') || combined.includes('prepare') || combined.includes('ingredient')) {
      category = 'Food Prep';
    } else if (combined.includes('cook') || combined.includes('cooking') || combined.includes('kitchen')) {
      category = 'Food Prep';
    } else if (combined.includes('service') || combined.includes('foh') || combined.includes('front of house') || combined.includes('serving')) {
      category = 'Service (FOH)';
    } else if (combined.includes('drink') || combined.includes('beverage') || combined.includes('cocktail') || combined.includes('bar')) {
      category = 'Drinks';
    } else if (combined.includes('hot beverage') || combined.includes('coffee') || combined.includes('tea') || combined.includes('hot drink')) {
      category = 'Hot Beverages';
    } else if (combined.includes('cold beverage') || combined.includes('cold drink') || combined.includes('juice') || combined.includes('soft drink')) {
      category = 'Cold Beverages';
    } else if (combined.includes('opening') || combined.includes('open') || combined.includes('start of day')) {
      category = 'Opening';
    } else if (combined.includes('closing') || combined.includes('close') || combined.includes('end of day') || combined.includes('shut down')) {
      category = 'Closing';
    } else if (combined.includes('clean') || combined.includes('cleaning') || combined.includes('sanitize')) {
      category = 'Cleaning';
    }

    const { error } = await supabase
      .from('sop_entries')
      .insert({
        company_id: companyId,
        title,
        ref_code: refCode,
        version: '1.0',
        status: 'Draft',
        author: profile.full_name,
        category,
        sop_data: { content },
        created_by: profile.id
      });

    if (error) {
      throw new Error(error.message);
    }

    return refCode;
  };

  // Save Risk Assessment to database
  const saveRiskAssessment = async (title: string, content: string, isCoshh: boolean) => {
    if (!companyId || !profile?.id) {
      throw new Error('Missing required information');
    }

    // Generate ref code (RA-YYYY-XXX format)
    const year = new Date().getFullYear();
    const { data: existingRAs } = await supabase
      .from('risk_assessments')
      .select('ref_code')
      .eq('company_id', companyId)
      .like('ref_code', `RA-${year}-%`)
      .order('ref_code', { ascending: false })
      .limit(1);

    let refCode = `RA-${year}-001`;
    if (existingRAs && existingRAs.length > 0) {
      const lastRef = existingRAs[0].ref_code;
      const match = lastRef.match(/RA-\d{4}-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10) + 1;
        refCode = `RA-${year}-${num.toString().padStart(3, '0')}`;
      }
    }

    const { error } = await supabase
      .from('risk_assessments')
      .insert({
        company_id: companyId,
        site_id: siteId || null,
        template_type: isCoshh ? 'coshh' : 'general',
        title,
        ref_code: refCode,
        assessment_date: new Date().toISOString().split('T')[0],
        assessor_name: profile.full_name || 'Unknown',
        status: 'Draft',
        assessment_data: { content },
        created_by: profile.id
      });

    if (error) {
      throw new Error(error.message);
    }

    return refCode;
  };

  // Extract ticket title using AI
  const extractTicketTitle = async (description: string): Promise<string> => {
    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Extract a concise title (max 60 characters) for this support request: "${description}"`,
          conversationHistory: [],
          userContext: {
            userId: profile?.id,
            companyId: companyId,
            siteId: siteId,
            role: profile?.app_role || 'Staff',
            currentPage: pathname
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Extract title from response (remove quotes if present)
        let title = data.message.trim();
        title = title.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
        if (title.length > 60) {
          title = title.substring(0, 57) + '...';
        }
        return title || description.substring(0, 60);
      }
    } catch (error) {
      console.error('Error extracting title:', error);
    }
    // Fallback to first 60 chars of description
    return description.substring(0, 60);
  };

  // Create ticket
  const createTicket = async (title: string, description: string, type: string, screenshot?: string) => {
    if (!companyId) {
      throw new Error('Missing company information');
    }

    const module = detectModule(pathname);

    const response = await fetch('/api/assistant/tickets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type,
        module,
        title,
        description,
        page_url: pathname,
        screenshot,
        company_id: companyId,
        site_id: siteId || null
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create ticket');
    }

    return await response.json();
  };

  // Handle screenshot capture
  const handleScreenshotCapture = async () => {
    setCapturingScreenshot(true);
    try {
      const blob = await captureScreenshot();
      const dataURL = await blobToDataURL(blob);
      return dataURL;
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      throw error;
    } finally {
      setCapturingScreenshot(false);
    }
  };

  // Handle ticket modal submission
  const handleTicketModalSubmit = async (description: string, screenshot?: string) => {
    if (!pendingTicket) return;

    setShowTicketModal(false);
    setIsLoading(true);

    try {
      const result = await createTicket(
        pendingTicket.title,
        description,
        pendingTicket.type,
        screenshot
      );

      const successMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `✅ Ticket ${result.ticketNumber} created successfully${screenshot ? ' with screenshot' : ''}! Assigned to ${result.assignedTo}. We'll get back to you soon.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, successMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Sorry, I couldn't create the ticket: ${error.message}. Please try again or contact support directly at support@opsly.app`,
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setPendingTicket(null);
      setIsLoading(false);
    }
  };

  // Handle ticket modal close
  const handleTicketModalClose = () => {
    setShowTicketModal(false);
    setPendingTicket(null);

    const cancelMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Ticket creation cancelled. Let me know if you need help with anything else!',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, cancelMessage]);
  };

  // Send message to API
  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    
    // Ensure we have a conversation before proceeding
    let conversationId = currentConversationId;
    if (!conversationId && profile?.id && companyId) {
      conversationId = await createNewConversation();
      if (!conversationId) {
        setIsLoading(false);
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, I couldn\'t start a new conversation. Please try again.',
          timestamp: new Date(),
          isError: true
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }
      // Update currentConversationId state (will be used in saveMessagesAfterResponse)
      setCurrentConversationId(conversationId);
    }
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentInput = content.trim();
    setInputValue('');
    setIsLoading(true);
    
    // Use the conversation ID we have (either existing or newly created)
    const activeConversationId = conversationId || currentConversationId;
    
    try {
      // Check if this is a ticket query
      const ticketCheck = isTicketQuery(currentInput);

      if (ticketCheck.isTicket && ticketCheck.type) {
        // Show ticket creation modal
        setIsLoading(true);

        try {
          // Extract title from the message
          const title = await extractTicketTitle(currentInput);

          // Automatically capture screenshot
          let screenshot: string | undefined;
          try {
            setCapturingScreenshot(true);
            screenshot = await handleScreenshotCapture();
          } catch (screenshotError) {
            console.error('Screenshot capture failed:', screenshotError);
            // Continue without screenshot if capture fails
          } finally {
            setCapturingScreenshot(false);
          }

          // Store pending ticket data and show modal
          setPendingTicket({
            title,
            type: ticketCheck.type,
            screenshot
          });
          setShowTicketModal(true);

          // Show message indicating modal is open
          const modalMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '📝 Please provide additional details and review the screenshot in the ticket form.',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, modalMessage]);
        } catch (error: any) {
          const errorMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Sorry, I couldn't prepare the ticket form: ${error.message}. Please try again.`,
            timestamp: new Date(),
            isError: true
          };
          setMessages(prev => [...prev, errorMessage]);
        } finally {
          setIsLoading(false);
        }

        return;
      }

      // Check if this is a generation query
      const generationCheck = isGenerationQuery(currentInput);
      
      if (generationCheck.isGeneration && generationCheck.type) {
        // Start generation flow
        setGenerationMode(generationCheck.type);
        
        if (generationCheck.type === 'sop') {
          // Extract procedure from query or ask
          const procedureMatch = currentInput.match(/sop (?:for )?(.+)/i) || currentInput.match(/create (?:an? )?sop (?:for )?(.+)/i);
          if (procedureMatch && procedureMatch[1]) {
            const procedure = procedureMatch[1].trim();
            setGenerationData({ procedure, type: 'sop' });
            
            const assistantMessage: Message = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `I'll create an SOP for "${procedure}". Any specific requirements or hazards to include?`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
            setIsLoading(false);
            return;
          } else {
            const assistantMessage: Message = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `What procedure do you need an SOP for?`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
            setIsLoading(false);
            return;
          }
        } else if (generationCheck.type === 'risk-assessment') {
          // Extract activity from query or ask
          const activityMatch = currentInput.match(/risk assessment (?:for )?(.+)/i) || currentInput.match(/create (?:a )?risk assessment (?:for )?(.+)/i);
          if (activityMatch && activityMatch[1]) {
            const activity = activityMatch[1].trim();
            setGenerationData({ activity, type: 'risk-assessment' });
            
            const assistantMessage: Message = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `I'll create a risk assessment for "${activity}". Is this a COSHH assessment (chemical/substance)?`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
            setIsLoading(false);
            return;
          } else {
            const assistantMessage: Message = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `What activity or hazard do you need a risk assessment for?`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
            setIsLoading(false);
            return;
          }
        }
      }

      // If in generation mode, collect details and generate
      if (generationMode && generationMode !== 'none') {
        if (generationMode === 'sop') {
          if (!generationData?.procedure) {
            // User provided procedure
            setGenerationData({ procedure: currentInput, type: 'sop' });
            const assistantMessage: Message = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `Any specific requirements or hazards to include?`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
            setIsLoading(false);
            return;
          } else if (!generationData.requirements) {
            // User provided requirements (or none)
            const requirements = currentInput.toLowerCase().includes('no') || currentInput.toLowerCase().includes('none') ? '' : currentInput;
            setGenerationData({ ...generationData, requirements });
            
            // Generate SOP
            setIsLoading(true);
            try {
              const sopContent = await generateSOP(generationData.procedure, requirements);
              setGenerationData({ ...generationData, requirements, content: sopContent });
              
              const assistantMessage: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: `Here's your SOP:\n\n${sopContent}\n\nWould you like me to save this to your SOP library?`,
                timestamp: new Date()
              };
              setMessages(prev => [...prev, assistantMessage]);
              setPendingSave(true);
            } catch (error: any) {
              const errorMessage: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: `Sorry, I couldn't generate the SOP: ${error.message}. Please try again.`,
                timestamp: new Date(),
                isError: true
              };
              setMessages(prev => [...prev, errorMessage]);
              setGenerationMode(null);
              setGenerationData(null);
            } finally {
              setIsLoading(false);
            }
            return;
          }
        } else if (generationMode === 'risk-assessment') {
          if (!generationData?.activity) {
            // User provided activity
            setGenerationData({ activity: currentInput, type: 'risk-assessment' });
            const assistantMessage: Message = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `Is this a COSHH assessment (chemical/substance)?`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
            setIsLoading(false);
            return;
          } else if (generationData.isCoshh === undefined) {
            // User answered COSHH question
            const isCoshh = currentInput.toLowerCase().includes('yes') || currentInput.toLowerCase().includes('yep') || currentInput.toLowerCase().includes('yeah');
            setGenerationData({ ...generationData, isCoshh });
            
            // Generate Risk Assessment
            setIsLoading(true);
            try {
              const raResult = await generateRiskAssessment(generationData.activity, isCoshh);
              setGenerationData({ ...generationData, isCoshh, content: raResult.content });
              
              const assistantMessage: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: `Here's your Risk Assessment:\n\n${raResult.content}\n\nWould you like me to save this to your Risk Assessments?`,
                timestamp: new Date()
              };
              setMessages(prev => [...prev, assistantMessage]);
              setPendingSave(true);
            } catch (error: any) {
              const errorMessage: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: `Sorry, I couldn't generate the Risk Assessment: ${error.message}. Please try again.`,
                timestamp: new Date(),
                isError: true
              };
              setMessages(prev => [...prev, errorMessage]);
              setGenerationMode(null);
              setGenerationData(null);
            } finally {
              setIsLoading(false);
            }
            return;
          }
        }
      }
      
      // Normal chat flow
      // Build conversation history for context (last 10 messages as per brief)
      const conversationHistory = messages.slice(-10).map(m => ({
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
          message: currentInput,
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
      
      // Save messages to database (non-blocking)
      const convId = activeConversationId;
      if (convId) {
        saveMessagesAfterResponse(currentInput, data.message, convId);
      }
      
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

  // Old handleCreateTicket function removed - tickets now created automatically in sendMessage

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

  // Create new conversation
  const createNewConversation = async () => {
    if (!companyId || !profile?.id) return null;

    try {
      const { data, error } = await supabase
        .from('assistant_conversations')
        .insert({
          user_id: profile.id,
          company_id: companyId,
          title: null // Will be auto-generated after first exchange
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentConversationId(data.id);
      setMessages([]);
      setGenerationMode(null);
      setGenerationData(null);
      setPendingSave(false);
      setShowContactOptions(false);
      setInputValue('');
      sessionIdRef.current = crypto.randomUUID();
      setShowHistory(false);
      
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  };

  // Load conversation history
  const loadConversations = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('assistant_conversations')
        .select('id, title, updated_at')
        .eq('user_id', profile.id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Get last message for each conversation
      const conversationsWithMessages = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: lastMessage } = await supabase
            .from('assistant_messages')
            .select('content')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...conv,
            last_message: lastMessage?.content?.substring(0, 60) || ''
          };
        })
      );

      setConversations(conversationsWithMessages);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  // Load a specific conversation
  const loadConversation = async (conversationId: string) => {
    if (!profile?.id) return;

    try {
      // Load messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('assistant_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Convert to Message format
      const loadedMessages: Message[] = (messagesData || []).map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at)
      }));

      setMessages(loadedMessages);
      setCurrentConversationId(conversationId);
      setGenerationMode(null);
      setGenerationData(null);
      setPendingSave(false);
      setShowContactOptions(false);
      setShowHistory(false);
      sessionIdRef.current = crypto.randomUUID();
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  // Archive a conversation
  const archiveConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent loading the conversation
    
    try {
      const { error } = await supabase
        .from('assistant_conversations')
        .update({ is_archived: true })
        .eq('id', conversationId);

      if (error) throw error;

      // Reload conversations list
      loadConversations();
      
      // If this was the current conversation, create a new one
      if (currentConversationId === conversationId) {
        createNewConversation();
      }
    } catch (error) {
      console.error('Error archiving conversation:', error);
    }
  };

  // Save messages after assistant responds (called separately to avoid blocking)
  const saveMessagesAfterResponse = async (userMessage: string, assistantMessage: string, conversationId?: string) => {
    const convId = conversationId || currentConversationId;
    if (!convId) return;
    
    // Save both messages
    await Promise.all([
      saveMessageToConversation('user', userMessage, convId),
      saveMessageToConversation('assistant', assistantMessage, convId)
    ]);

    // Generate title after first exchange if conversation has no title
    const { data: conv } = await supabase
      .from('assistant_conversations')
      .select('title')
      .eq('id', convId)
      .single();

    if (conv && !conv.title) {
      await generateConversationTitle(userMessage, assistantMessage, convId);
      // Reload conversations to update title in history
      loadConversations();
    }
  };

  // Save message to specific conversation
  const saveMessageToConversation = async (role: 'user' | 'assistant', content: string, conversationId: string) => {
    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from('assistant_messages')
        .insert({
          conversation_id: conversationId,
          role,
          content
        });

      if (error) {
        console.error('Error saving message:', error);
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  // Generate conversation title
  const generateConversationTitle = async (userMessage: string, assistantResponse: string, conversationId?: string): Promise<string | null> => {
    const convId = conversationId || currentConversationId;
    if (!convId) return null;

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Generate a 3-5 word title for this conversation. Just the title, nothing else.

User: "${userMessage.slice(0, 200)}"
Assistant: "${assistantResponse.slice(0, 200)}"

Examples: Stock count reassignment, Fridge temperature logging, Adding new team member, SOP for fryer cleaning`,
          conversationHistory: [],
          userContext: {
            userId: profile?.id,
            companyId: companyId,
            siteId: siteId
          }
        })
      });

      if (!response.ok) return null;

      const data = await response.json();
      const title = data.message.trim().replace(/^["']|["']$/g, ''); // Remove quotes

      // Update conversation with title
      await supabase
        .from('assistant_conversations')
        .update({ title })
        .eq('id', convId);

      return title;
    } catch (error) {
      console.error('Error generating title:', error);
      return null;
    }
  };

  // Reset chat - clear messages and state (creates new conversation)
  const handleResetChat = () => {
    createNewConversation();
  };

  // Load conversations when history panel opens
  useEffect(() => {
    if (showHistory) {
      loadConversations();
    }
  }, [showHistory, profile?.id]);

  // Create conversation on mount if none exists (only once)
  useEffect(() => {
    if (isOpen && !currentConversationId && profile?.id && companyId && messages.length === 0) {
      createNewConversation();
    }
  }, [isOpen]);
  
  // Navigate to support page
  const goToSupportPage = () => {
    setIsOpen(false);
    router.push('/dashboard/support');
  };
  
  // Open email client
  const openEmailSupport = () => {
    window.location.href = 'mailto:support@opsly.app?subject=Support Request from Opsly Assistant';
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
      {/* Chat Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 backdrop-blur-sm z-[9999] ${
              isDark ? 'bg-black/20' : 'bg-black/10'
            }`}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Chat Panel */}
          <div
            data-assistant-widget
            className={`${position === 'top-right'
              ? 'fixed inset-0 sm:inset-auto sm:top-20 sm:right-4'
              : 'fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6'
            } z-[10000]
              w-full sm:w-[440px] h-full sm:h-[700px] sm:max-h-[85vh]
              ${isDark ? 'bg-[#0f1220] border-[#1e2340]' : 'bg-white border-gray-200'}
              border-0 sm:border rounded-none sm:rounded-2xl shadow-2xl
              flex flex-col overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <div className={`relative flex items-center justify-between px-4 py-3 sm:py-3 border-b flex-shrink-0 ${
            isDark ? 'border-[#1e2340] bg-[#131729]' : 'border-gray-200 bg-theme-surface-elevated'
          }`}>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                isDark ? 'bg-[#161b2e] border border-[#252b42]' : 'bg-[#D37E91]/10 border border-[#D37E91]/20'
              }`}>
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-[#D37E91]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={`font-semibold text-sm sm:text-base truncate ${
                  isDark ? 'text-theme-primary' : 'text-theme-primary'
                }`}>Opsly Assistant</h3>
                <p className={`text-xs hidden sm:block ${
                  isDark ? 'text-theme-tertiary' : 'text-theme-tertiary'
                }`}>Your operations copilot</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* New Chat Button */}
              <button
                onClick={createNewConversation}
                className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                  isDark
                    ? 'hover:bg-white/[0.06] text-theme-tertiary hover:text-white'
                    : 'hover:bg-gray-100 text-theme-secondary hover:text-theme-primary'
                }`}
                aria-label="New Chat"
                title="Start new chat"
              >
                <Plus className="w-4 h-4" />
              </button>
              {/* History Button */}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                  isDark
                    ? 'hover:bg-white/[0.06] text-theme-tertiary hover:text-white'
                    : 'hover:bg-gray-100 text-theme-secondary hover:text-theme-primary'
                }`}
                aria-label="Chat History"
                title="View chat history"
              >
                <History className="w-4 h-4" />
              </button>
              {/* Contact Human Button */}
              <button
                onClick={handleContactHuman}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg
                  text-xs font-medium transition-all duration-200 ease-in-out ${
                    isDark
                      ? 'bg-[#161b2e] border border-[#252b42] text-[#D37E91] hover:bg-[#1c2238] hover:border-[#303754]'
                      : 'bg-transparent border border-[#D37E91] text-[#D37E91] hover:bg-[#D37E91]/10 hover:shadow-module-glow'
                  }`}
                aria-label="Contact Human Support"
                title="Speak to a human"
              >
                <Headphones className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Human</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                  isDark
                    ? 'hover:bg-white/[0.06] text-theme-tertiary hover:text-white'
                    : 'hover:bg-gray-100 text-theme-secondary hover:text-theme-primary'
                }`}
                aria-label="Close"
                title="Close assistant"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* History Panel */}
          {showHistory && (
            <div className={`absolute top-full left-0 right-0 border-b z-[10001] max-h-[300px] overflow-y-auto shadow-2xl ${
              isDark ? 'bg-[#0f1220] border-[#1e2340]' : 'bg-white border-gray-200'
            }`}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`text-sm font-semibold ${
                    isDark ? 'text-theme-primary' : 'text-theme-primary'
                  }`}>Chat History</h4>
                  <button
                    onClick={() => setShowHistory(false)}
                    className={`p-1 rounded ${
                      isDark
                        ? 'hover:bg-white/[0.06] text-theme-tertiary hover:text-white'
                        : 'hover:bg-gray-100 text-theme-secondary hover:text-theme-primary'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {conversations.length === 0 ? (
                  <p className={`text-xs text-center py-4 ${
                    isDark ? 'text-theme-tertiary' : 'text-theme-tertiary'
                  }`}>No previous conversations</p>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={`group relative w-full text-left p-3 rounded-lg border transition-colors ${
                          currentConversationId === conv.id
                            ? isDark
                              ? 'bg-[#D37E91]/10 border-[#D37E91]/40'
                              : 'bg-[#D37E91]/10 border-[#D37E91]/30'
                            : isDark
                              ? 'bg-[#131729] border-[#1e2340] hover:bg-[#161b2e]'
                              : 'bg-theme-surface-elevated border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <button
                          onClick={() => loadConversation(conv.id)}
                          className="w-full text-left"
                        >
                          <div className={`font-medium text-sm mb-1 ${
                            isDark ? 'text-theme-primary' : 'text-theme-primary'
                          }`}>
                            {conv.title || 'New conversation'}
                          </div>
                          {conv.last_message && (
                            <div className={`text-xs truncate ${
                              isDark ? 'text-theme-tertiary' : 'text-theme-tertiary'
                            }`}>
                              {conv.last_message}
                            </div>
                          )}
                          <div className={`text-xs mt-1 ${
                            isDark ? 'text-theme-tertiary' : 'text-theme-tertiary'
                          }`}>
                            {new Date(conv.updated_at).toLocaleDateString()} {new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </button>
                        <button
                          onClick={(e) => archiveConversation(conv.id, e)}
                          className={`absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                            isDark
                              ? 'hover:bg-white/[0.1] text-theme-tertiary hover:text-white'
                              : 'hover:bg-gray-200 text-theme-tertiary hover:text-theme-primary'
                          }`}
                          title="Archive conversation"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Messages Area */}
          <div 
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 min-h-0 assistant-scrollbar"
          >
            {/* Welcome message if no messages */}
            {messages.length === 0 && (
              <div className="text-center py-4 sm:py-6">
                <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full mb-3 sm:mb-4 ${
                  isDark ? 'bg-[#161b2e] border border-[#252b42]' : 'bg-[#D37E91]/10 border border-[#D37E91]/20'
                }`}>
                  <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-[#D37E91]/60" />
                </div>
                <h4 className={`text-base sm:text-lg font-semibold mb-2 ${
                  isDark ? 'text-theme-primary' : 'text-theme-primary'
                }`}>
                  How can I help?
                </h4>
                <p className={`text-xs sm:text-sm mb-4 sm:mb-6 max-w-xs mx-auto px-2 ${
                  isDark ? 'text-theme-tertiary' : 'text-theme-secondary'
                }`}>
                  Ask me about any module - compliance, inventory, staffing, production, assets, or messaging.
                </p>

                {/* Module indicator */}
                {pathname && (
                  <div className="mb-3 text-center">
                    <span className={`inline-block px-2 py-1 rounded text-xs border ${
                      isDark
                        ? 'bg-[#161b2e] border-[#252b42] text-white/40'
                        : 'bg-gray-100 border-gray-200 text-theme-secondary'
                    }`}>
                      {detectModule(pathname).charAt(0).toUpperCase() + detectModule(pathname).slice(1)} Module
                    </span>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {getQuickActionsForModule(pathname || '').map((action, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickAction(action.query)}
                      className={`flex items-center gap-2 p-2.5 sm:p-3 rounded-lg border transition-colors text-left ${
                        isDark
                          ? 'bg-[#131729] border-[#1e2340] hover:bg-[#1a1f35] hover:border-[#252b42] text-white/70'
                          : 'bg-theme-surface-elevated border-gray-200 hover:bg-gray-100 hover:border-gray-300 text-theme-secondary'
                      }`}
                    >
                      {action.icon}
                      <span className="text-xs sm:text-sm">{action.label}</span>
                    </button>
                  ))}
                </div>

                {/* Contact Human Quick Action */}
                <button
                  onClick={handleContactHuman}
                  className={`mt-3 sm:mt-4 w-full flex items-center justify-center gap-2 p-2.5 sm:p-3 rounded-lg
                    transition-all duration-200 ease-in-out ${
                      isDark
                        ? 'bg-[#161b2e] border border-[#252b42] text-[#D37E91] hover:bg-[#1c2238] hover:border-[#303754]'
                        : 'bg-transparent border border-[#D37E91] text-[#D37E91] hover:bg-[#D37E91]/10 hover:shadow-module-glow'
                    }`}
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
                    ? isDark ? 'bg-blue-500/20' : 'bg-blue-100'
                    : message.isError
                      ? isDark ? 'bg-red-500/20' : 'bg-red-100'
                      : isDark
                        ? 'bg-[#161b2e] border border-[#252b42]'
                        : 'bg-[#D37E91]/10 border border-[#D37E91]/20'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                  ) : message.isError ? (
                    <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D37E91]" />
                  )}
                </div>

                {/* Message Content */}
                <div className={`flex-1 max-w-[85%] sm:max-w-[280px] ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div
                    className={`inline-block px-3 py-2 sm:px-4 sm:py-3 rounded-2xl text-xs sm:text-sm
                      ${message.role === 'user'
                        ? isDark
                          ? 'bg-blue-500/20 text-white rounded-br-md'
                          : 'bg-blue-100 text-blue-900 rounded-br-md'
                        : message.isError
                          ? isDark
                            ? 'bg-red-500/10 border border-red-500/20 text-red-200 rounded-bl-md'
                            : 'bg-red-50 border border-red-200 text-red-800 rounded-bl-md'
                          : isDark
                            ? 'bg-[#161b2e] text-white/90 rounded-bl-md'
                            : 'bg-gray-100 text-theme-primary rounded-bl-md'
                      }`}
                  >
                    <div
                      className="whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
                    />
                  </div>

                  {/* Sources (for assistant messages) */}
                  {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                    <div className={`mt-2 flex items-center gap-1 text-xs ${
                      isDark ? 'text-theme-tertiary' : 'text-theme-tertiary'
                    }`}>
                      <BookOpen className="w-3 h-3" />
                      <span>Sources: {message.sources.map(s => s.title).join(', ').substring(0, 60)}...</span>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className={`text-xs mt-1 ${message.role === 'user' ? 'text-right' : ''} ${
                    isDark ? 'text-theme-disabled' : 'text-theme-tertiary'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center ${
                  isDark ? 'bg-[#161b2e] border-[#252b42]' : 'bg-[#D37E91]/10 border-[#D37E91]/20'
                }`}>
                  <Bot className="w-4 h-4 text-[#D37E91]" />
                </div>
                <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl rounded-bl-md ${
                  isDark ? 'bg-[#161b2e]' : 'bg-gray-100'
                }`}>
                  <Loader2 className="w-4 h-4 text-[#D37E91] animate-spin" />
                  <span className={`text-sm ${
                    isDark ? 'text-theme-tertiary' : 'text-theme-secondary'
                  }`}>
                    {capturingScreenshot ? 'Capturing screenshot...' : 'Thinking...'}
                  </span>
                </div>
              </div>
            )}

            {/* Ticket creation prompt removed - now automatic with screenshot */}

            {/* Save SOP/RA prompt */}
            {pendingSave && generationData && !isLoading && (
              <div className="flex gap-3 mt-4">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center ${
                  isDark ? 'bg-[#161b2e] border-[#252b42]' : 'bg-[#D37E91]/10 border-[#D37E91]/20'
                }`}>
                  <Bot className="w-4 h-4 text-[#D37E91]" />
                </div>
                <div className="flex-1 max-w-[280px]">
                  <div className={`px-4 py-3 rounded-2xl rounded-bl-md border ${
                    isDark ? 'bg-[#161b2e] border-[#252b42]' : 'bg-[#D37E91]/10 border-[#D37E91]/20'
                  }`}>
                    <p className={`text-sm mb-3 ${
                      isDark ? 'text-white/90' : 'text-theme-primary'
                    }`}>
                      Would you like me to save this to your {generationData.type === 'sop' ? 'SOP library' : 'Risk Assessments'}?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (!generationData.content) return;
                          setIsLoading(true);
                          try {
                            let refCode: string;
                            const title = generationData.type === 'sop'
                              ? (generationData.procedure || 'SOP')
                              : (generationData.activity || 'Risk Assessment');

                            if (generationData.type === 'sop') {
                              refCode = await saveSOP(title, generationData.content);
                            } else {
                              refCode = await saveRiskAssessment(title, generationData.content, generationData.isCoshh || false);
                            }

                            const successMessage: Message = {
                              id: crypto.randomUUID(),
                              role: 'assistant',
                              content: `✅ Saved! Reference code: ${refCode}. You can find it in your ${generationData.type === 'sop' ? 'SOPs' : 'Risk Assessments'} page.`,
                              timestamp: new Date()
                            };
                            setMessages(prev => [...prev, successMessage]);

                            // Reset state
                            setGenerationMode(null);
                            setGenerationData(null);
                            setPendingSave(false);
                          } catch (error: any) {
                            const errorMessage: Message = {
                              id: crypto.randomUUID(),
                              role: 'assistant',
                              content: `Sorry, I couldn't save it: ${error.message}. Please try again.`,
                              timestamp: new Date(),
                              isError: true
                            };
                            setMessages(prev => [...prev, errorMessage]);
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                        disabled={isLoading}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                          text-[#D37E91] text-xs font-medium
                          transition-all duration-200 ease-in-out disabled:opacity-50 ${
                            isDark
                              ? 'bg-[#161b2e] border border-[#252b42] hover:bg-[#1c2238]'
                              : 'bg-transparent border border-[#D37E91] hover:bg-[#D37E91]/10 hover:shadow-module-glow'
                          }`}
                      >
                        <Save className="w-4 h-4" />
                        <span>Yes, save it</span>
                      </button>
                      <button
                        onClick={() => {
                          setPendingSave(false);
                          setGenerationMode(null);
                          setGenerationData(null);
                        }}
                        disabled={isLoading}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                          border text-xs font-medium
                          transition-all duration-200 ease-in-out disabled:opacity-50 ${
                            isDark
                              ? 'bg-[#0f1220] border-[#252b42] text-white/50 hover:bg-[#161b2e] hover:border-[#303754]'
                              : 'bg-transparent border-gray-300 text-theme-secondary hover:bg-gray-100 hover:border-gray-400'
                          }`}
                      >
                        <span>No, thanks</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Contact Human Options */}
            {showContactOptions && (
              <div className="flex gap-3 mt-4">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center ${
                  isDark ? 'bg-[#161b2e] border-[#252b42]' : 'bg-[#D37E91]/10 border-[#D37E91]/20'
                }`}>
                  <Headphones className="w-4 h-4 text-[#D37E91]" />
                </div>
                <div className="flex-1 max-w-[280px]">
                  <div className={`px-4 py-3 rounded-2xl rounded-bl-md border ${
                    isDark ? 'bg-[#161b2e] border-[#252b42]' : 'bg-[#D37E91]/10 border-[#D37E91]/20'
                  }`}>
                    <p className={`text-sm mb-3 ${
                      isDark ? 'text-white/90' : 'text-theme-primary'
                    }`}>
                      Need to speak with a human? We're here to help!
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={openEmailSupport}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg
                          text-[#D37E91] text-xs font-medium
                          transition-all duration-200 ease-in-out ${
                            isDark
                              ? 'bg-[#1a1f35] border border-[#252b42] hover:bg-[#1c2238]'
                              : 'bg-transparent border border-[#D37E91] hover:bg-[#D37E91]/10 hover:shadow-module-glow'
                          }`}
                      >
                        <Mail className="w-4 h-4" />
                        <span>Email: support@opsly.app</span>
                      </button>
                      <button
                        onClick={goToSupportPage}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg
                          border text-xs font-medium
                          transition-all duration-200 ease-in-out ${
                            isDark
                              ? 'bg-[#0f1220] border-[#252b42] text-white/50 hover:bg-[#161b2e] hover:border-[#303754]'
                              : 'bg-transparent border-gray-300 text-theme-secondary hover:bg-gray-100 hover:border-gray-400'
                          }`}
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>View All Support Options</span>
                      </button>
                    </div>
                    <button
                      onClick={() => setShowContactOptions(false)}
                      className={`mt-2 text-xs transition-colors ${
                        isDark ? 'text-theme-tertiary hover:text-theme-tertiary' : 'text-theme-tertiary hover:text-theme-secondary'
                      }`}
                    >
                      Close
                    </button>
                  </div>
                  <div className={`text-xs mt-1 ${
                    isDark ? 'text-theme-disabled' : 'text-theme-tertiary'
                  }`}>
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
              className={`absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 p-2 rounded-full
                shadow-lg transition-all duration-200 ease-in-out z-10 ${
                  isDark
                    ? 'bg-[#0f1220] border border-white/[0.15] text-[#D37E91] hover:bg-white/[0.08]'
                    : 'bg-white border border-[#D37E91] text-[#D37E91] hover:bg-[#D37E91]/10 hover:shadow-module-glow'
                }`}
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
          
          {/* Input Area */}
          <form
            onSubmit={handleSubmit}
            className={`p-3 sm:p-4 border-t flex-shrink-0 ${
              isDark ? 'border-[#1e2340] bg-[#0c1019]' : 'border-gray-200 bg-theme-surface-elevated'
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about any module or feature..."
                disabled={isLoading}
                className={`flex-1 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border text-xs sm:text-sm
                  focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark
                      ? 'bg-[#161b2e] border-[#252b42] text-white/90 placeholder-white/30 focus:ring-[#303754] focus:border-[#303754]'
                      : 'bg-white border-gray-300 text-theme-primary placeholder-gray-400 focus:ring-[#D37E91]/40 focus:border-[#D37E91]/40'
                  }`}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className={`p-2.5 sm:p-3 rounded-xl flex-shrink-0
                  transition-all duration-200 ease-in-out
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none ${
                    isDark
                      ? 'bg-[#161b2e] border border-[#252b42] text-[#D37E91] hover:bg-[#1c2238] hover:border-[#303754]'
                      : 'bg-transparent border border-[#D37E91] text-[#D37E91] hover:bg-[#D37E91]/10 hover:shadow-module-glow'
                  }`}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            </div>

            {/* Disclaimer */}
            <p className={`text-xs text-center mt-2 hidden sm:block ${
              isDark ? 'text-white/20' : 'text-theme-tertiary'
            }`}>
              AI responses are guidance only. Always verify critical compliance info.
            </p>
          </form>
          </div>
        </>
      )}

      {/* Ticket Creation Modal */}
      {pendingTicket && (
        <TicketCreationModal
          isOpen={showTicketModal}
          onClose={handleTicketModalClose}
          onSubmit={handleTicketModalSubmit}
          initialTitle={pendingTicket.title}
          type={pendingTicket.type}
          screenshot={pendingTicket.screenshot}
        />
      )}
    </>
  );

  // Use portal to render outside normal DOM hierarchy for stability
  return createPortal(widgetContent, document.body);
}

