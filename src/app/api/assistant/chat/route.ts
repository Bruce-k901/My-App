import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// CHECKLY AI ASSISTANT API
// ============================================================================
// RAG-based assistant that answers questions about:
// - UK compliance regulations (food safety, fire, H&S)
// - How to use Checkly
// - Creating SOPs and Risk Assessments
// - Troubleshooting common issues
// ============================================================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================================
// SYSTEM PROMPT
// ============================================================================
const SYSTEM_PROMPT = `You are the Opsly AI Assistant - a helpful, knowledgeable guide for UK hospitality compliance and the Opsly platform.

YOUR ROLE:
- Help users understand UK food safety, fire safety, and health & safety regulations
- Guide users on how to use Opsly features
- Assist with creating SOPs, Risk Assessments, and task templates
- Troubleshoot common issues
- Provide accurate, practical compliance advice

YOUR KNOWLEDGE SOURCES:
You have access to a knowledge base containing:
- UK compliance regulations (Food Safety Act, Fire Safety Order, HSWA, etc.)
- Opsly app documentation and how-to guides
- SOP and Risk Assessment creation guidance
- Troubleshooting guides

When answering, you MUST:
1. Base answers on the provided context documents when available
2. Be specific with temperatures, timeframes, and requirements
3. Reference relevant regulations when discussing compliance
4. Provide step-by-step instructions for app-related questions
5. Admit when you don't know something rather than guessing

FORMATTING:
- Use clear, simple language appropriate for busy hospitality staff
- Use bullet points for lists and steps
- Bold key numbers and requirements (e.g., **63°C**, **8°C**)
- Keep responses concise but complete
- For compliance topics, always mention the source regulation

LIMITATIONS - Be honest about these:
- You cannot access real-time data or the user's actual task status
- You cannot modify settings or complete tasks on behalf of users
- For complex equipment issues, always recommend contacting support or a contractor
- Medical/legal emergencies should be directed to appropriate services

TONE:
- Friendly but professional
- Supportive, not condescending
- Practical and action-oriented
- Reassuring when users are stressed about compliance`;

// ============================================================================
// SEARCH KNOWLEDGE BASE
// ============================================================================
async function searchKnowledgeBase(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  query: string,
  category?: string
): Promise<Array<{ title: string; content: string; category: string; source: string | null }>> {
  
  // Convert query to tsquery format
  // Split into words and join with & for AND matching
  const searchTerms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(term => term.length > 2) // Skip short words
    .slice(0, 6) // Limit terms
    .join(' & ');
  
  if (!searchTerms) {
    return [];
  }
  
  // Build the query
  let dbQuery = supabase
    .from('knowledge_base')
    .select('title, content, summary, category, source')
    .eq('is_active', true)
    .textSearch('search_vector', searchTerms, {
      type: 'websearch',
      config: 'english'
    })
    .limit(5);
  
  // Filter by category if specified
  if (category) {
    dbQuery = dbQuery.eq('category', category);
  }
  
  const { data, error } = await dbQuery;
  
  if (error) {
    console.error('Knowledge base search error:', error);
    return [];
  }
  
  return data || [];
}

// Also do a keyword/tag search as backup
async function searchByTags(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  query: string
): Promise<Array<{ title: string; content: string; category: string; source: string | null }>> {
  
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  if (words.length === 0) return [];
  
  const { data, error } = await supabase
    .from('knowledge_base')
    .select('title, content, summary, category, source')
    .eq('is_active', true)
    .overlaps('tags', words)
    .limit(3);
  
  if (error) {
    console.error('Tag search error:', error);
    return [];
  }
  
  return data || [];
}

// ============================================================================
// CATEGORISE THE QUESTION
// ============================================================================
function categoriseQuestion(message: string): string | undefined {
  const lowerMessage = message.toLowerCase();
  
  // Food safety keywords
  if (/temperature|fridge|freezer|cooking|hot.?holding|haccp|allergen|cross.?contam|food.?safety|sfbb/.test(lowerMessage)) {
    return 'food_safety';
  }
  
  // Fire safety keywords
  if (/fire|extinguisher|alarm|emergency.?light|evacuation|call.?point/.test(lowerMessage)) {
    return 'fire_safety';
  }
  
  // Health & safety keywords
  if (/first.?aid|coshh|chemical|manual.?handling|ppe|accident|hazard|h&s|health.?safety/.test(lowerMessage)) {
    return 'health_safety';
  }
  
  // SOP keywords
  if (/\bsop\b|standard.?operating|procedure|write.?an?.?sop|create.?procedure/.test(lowerMessage)) {
    return 'sop_guidance';
  }
  
  // Risk assessment keywords
  if (/risk.?assess|hazard.?analy|risk.?matrix|\bra\b/.test(lowerMessage)) {
    return 'ra_guidance';
  }
  
  // App help keywords
  if (/how.?do.?i|where.?is|can't.?find|not.?showing|task|template|clock.?in|complete|checkly/.test(lowerMessage)) {
    return 'app_help';
  }
  
  // Troubleshooting
  if (/not.?working|error|problem|issue|help|stuck|can't|cannot/.test(lowerMessage)) {
    return 'troubleshooting';
  }
  
  // Return undefined to search all categories
  return undefined;
}

// ============================================================================
// BUILD CONTEXT FROM SEARCH RESULTS
// ============================================================================
function buildContext(
  results: Array<{ title: string; content: string; category: string; source: string | null }>
): string {
  if (results.length === 0) {
    return 'No specific documentation found for this query. Answer based on your general knowledge of UK hospitality compliance and the Opsly platform.';
  }
  
  let context = 'RELEVANT DOCUMENTATION:\n\n';
  
  results.forEach((doc, index) => {
    context += `--- Document ${index + 1}: ${doc.title} ---\n`;
    context += `Category: ${doc.category}\n`;
    if (doc.source) {
      context += `Source: ${doc.source}\n`;
    }
    context += `\n${doc.content}\n\n`;
  });
  
  context += '--- End of documentation ---\n\n';
  context += 'Use the above documentation to answer the user\'s question. If the documentation doesn\'t cover the question, say so and provide general guidance.';
  
  return context;
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationHistory = [], userContext = {} } = body;
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }
    
    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    // Test knowledge base connection (gracefully handle if table doesn't exist)
    let knowledgeBaseAvailable = true;
    try {
      const { error: testError } = await supabase
        .from('knowledge_base')
        .select('id')
        .limit(1);
      
      if (testError && testError.code === '42P01') {
        knowledgeBaseAvailable = false;
        console.warn('Knowledge base table does not exist. Run the migration first.');
      }
    } catch (testErr) {
      knowledgeBaseAvailable = false;
      console.warn('Could not connect to knowledge base:', testErr);
    }
    
    // 1. Categorise the question for targeted search
    const category = categoriseQuestion(message);
    
    // 2. Search knowledge base (only if available)
    let fullTextResults: Array<{ title: string; content: string; category: string; source: string | null }> = [];
    let tagResults: Array<{ title: string; content: string; category: string; source: string | null }> = [];
    
    if (knowledgeBaseAvailable) {
      [fullTextResults, tagResults] = await Promise.all([
        searchKnowledgeBase(supabase, message, category),
        searchByTags(supabase, message)
      ]);
    }
    
    // Combine and deduplicate results
    const allResults = [...fullTextResults];
    tagResults.forEach(tagResult => {
      if (!allResults.some(r => r.title === tagResult.title)) {
        allResults.push(tagResult);
      }
    });
    
    // Limit total results
    const results = allResults.slice(0, 5);
    
    // 3. Build context from search results
    const context = buildContext(results);
    
    // 4. Build user context string
    let userContextStr = '';
    if (userContext.role) {
      userContextStr += `User role: ${userContext.role}\n`;
    }
    if (userContext.siteName) {
      userContextStr += `Current site: ${userContext.siteName}\n`;
    }
    if (userContext.currentPage) {
      userContextStr += `User is currently on: ${userContext.currentPage}\n`;
    }
    
    // 5. Build messages array for Claude
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    
    // Add conversation history (last 10 messages for context)
    const recentHistory = conversationHistory.slice(-10);
    recentHistory.forEach((msg: { role: string; content: string }) => {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        });
      }
    });
    
    // Add current message with context
    const currentMessage = `${userContextStr ? `[User Context]\n${userContextStr}\n` : ''}${context}\n\n[User Question]\n${message}`;
    messages.push({
      role: 'user',
      content: currentMessage
    });
    
    // 6. Call Claude API
    // Use Haiku model by default - fastest and cheapest option
    // Available models: claude-3-5-sonnet-20240620, claude-3-opus-20240229, claude-3-sonnet-20240229, claude-3-haiku-20240307
    const modelName = process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307';
    
    const response = await anthropic.messages.create({
      model: modelName,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages
    });
    
    // Extract text response
    const assistantMessage = response.content
      .filter(block => block.type === 'text')
      .map(block => block.type === 'text' ? block.text : '')
      .join('\n');
    
    // 7. Optionally log the conversation (for improvement)
    // This is disabled by default but can be enabled for analytics
    /*
    if (userContext.userId && userContext.companyId) {
      await supabase.from('assistant_conversations').insert([
        {
          user_id: userContext.userId,
          company_id: userContext.companyId,
          session_id: userContext.sessionId || crypto.randomUUID(),
          role: 'user',
          content: message,
          knowledge_refs: results.map(r => r.id)
        },
        {
          user_id: userContext.userId,
          company_id: userContext.companyId,
          session_id: userContext.sessionId || crypto.randomUUID(),
          role: 'assistant',
          content: assistantMessage
        }
      ]);
    }
    */
    
    return NextResponse.json({
      message: assistantMessage,
      sourcesUsed: results.map(r => ({
        title: r.title,
        category: r.category,
        source: r.source
      }))
    });
    
  } catch (error: any) {
    console.error('Assistant API error:', {
      message: error?.message,
      status: error?.status,
      statusCode: error?.statusCode,
      code: error?.code,
      details: error?.details,
      error: error
    });
    
    // Handle specific error types
    if (error?.status === 401 || error?.statusCode === 401) {
      return NextResponse.json(
        { error: 'Invalid Anthropic API key. Please check your environment variables.' },
        { status: 500 }
      );
    }
    
    if (error?.status === 429 || error?.statusCode === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a moment.' },
        { status: 429 }
      );
    }
    
    // Check for Anthropic API errors
    if (error?.message?.includes('model')) {
      return NextResponse.json(
        { error: `Model error: ${error.message}. Please check the model name in the API route.` },
        { status: 500 }
      );
    }
    
    // Check for Supabase/Knowledge base errors
    if (error?.message?.includes('knowledge_base') || error?.message?.includes('relation') || error?.code === '42P01') {
      return NextResponse.json(
        { error: 'Knowledge base table not found. Please run the migration to create the knowledge_base table.' },
        { status: 500 }
      );
    }
    
    // Return detailed error in development, generic in production
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error?.message || 'Failed to process request'
      : 'Failed to process request. Please try again.';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

