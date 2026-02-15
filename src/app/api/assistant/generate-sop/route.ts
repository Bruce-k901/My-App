import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// SOP GENERATOR API
// ============================================================================
// Generates Standard Operating Procedures using Claude Sonnet
// ============================================================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SOP_PROMPT_TEMPLATE = `You are an expert in UK hospitality compliance and operational procedures. Generate a professional Standard Operating Procedure (SOP) for: {procedure_description}

{requirements}

Include the following sections:
1. **Purpose and Scope** - Clear statement of what this procedure covers and why it's important
2. **Required PPE and Equipment** - List all personal protective equipment and tools needed
3. **Step-by-Step Instructions** - Numbered, clear instructions that are easy to follow
4. **Safety Warnings and Precautions** - Important safety considerations and hazards
5. **Cleaning/Maintenance Requirements** - How to clean equipment and maintain standards
6. **Frequency of Procedure** - How often this should be performed
7. **Sign-off Requirements** - Who needs to verify completion

Format the output with clear headings using markdown (## for section headings, ** for bold). Keep language simple and actionable. Consider UK food safety regulations (Food Safety Act 1990, HACCP principles) where relevant.

Make the SOP practical and suitable for busy hospitality staff.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { procedure_description, requirements, company_id, site_id } = body;

    if (!procedure_description) {
      return NextResponse.json(
        { error: 'procedure_description is required' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    // Build the prompt
    let prompt = SOP_PROMPT_TEMPLATE.replace('{procedure_description}', procedure_description);
    
    if (requirements && requirements.trim()) {
      prompt = prompt.replace('{requirements}', `Additional requirements or considerations:\n${requirements}\n\n`);
    } else {
      prompt = prompt.replace('{requirements}', '');
    }

    // Use Claude Sonnet for better quality (as specified in plan)
    // Try newer model first, fallback to haiku if not available
    let modelName = process.env.ANTHROPIC_MODEL_SOP;
    if (!modelName) {
      // Try newer sonnet model, fallback to haiku
      modelName = 'claude-3-5-sonnet-20241022';
    }

    let response;
    try {
      response = await anthropic.messages.create({
        model: modelName,
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });
    } catch (modelError: any) {
      // If model not found, try haiku as fallback
      if (modelError?.status === 404 || modelError?.error?.type === 'not_found_error') {
        console.warn(`Model ${modelName} not found, falling back to claude-3-haiku-20240307`);
        response = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 2048,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        });
      } else {
        throw modelError;
      }
    }

    // Extract text response
    const sopContent = response.content
      .filter(block => block.type === 'text')
      .map(block => block.type === 'text' ? block.text : '')
      .join('\n');

    return NextResponse.json({
      sop: sopContent,
      procedure: procedure_description
    });

  } catch (error: any) {
    console.error('SOP Generator API error:', error);
    
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

    return NextResponse.json(
      { error: error.message || 'Failed to generate SOP' },
      { status: 500 }
    );
  }
}
