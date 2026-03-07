import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/fire-ra/ai-prompts';
import type { FireRAAIAssistRequest, FireRAAIAssistResponse, FireRAAIMode } from '@/types/fire-ra';

// ============================================================================
// FIRE RA AI ASSIST API
// ============================================================================
// Section-by-section AI assistance for Fire Risk Assessments
// Follows the same pattern as /api/assistant/generate-risk-assessment
// ============================================================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body: FireRAAIAssistRequest = await request.json();
    const {
      sectionNumber,
      itemNumber,
      field,
      existingText,
      premisesContext,
      mode,
      userInput,
    } = body;

    if (!sectionNumber || !itemNumber || !field) {
      return NextResponse.json(
        { error: 'sectionNumber, itemNumber, and field are required' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    // Determine mode from field content
    const effectiveMode: FireRAAIMode = mode || (existingText?.trim()
      ? (field === 'action_required' ? 'suggest_actions' : 'improve')
      : 'generate');

    // Build prompts
    const promptContext = {
      premisesType: premisesContext?.premisesType || 'commercial premises',
      premisesAddress: premisesContext?.premisesAddress || '',
      tier: premisesContext?.tier || 'standard',
      floorCount: premisesContext?.floorCount || 'unknown',
      occupancy: premisesContext?.occupancy || 'unknown',
      sleepingOnPremises: premisesContext?.sleepingOnPremises || false,
      flammableMaterials: premisesContext?.flammableMaterials || 'unknown',
      sectionNumber,
      itemNumber,
      existingText: existingText || '',
      userInput,
    };

    const systemPrompt = buildSystemPrompt(promptContext);
    const userPrompt = buildUserPrompt(promptContext, effectiveMode, field);

    // Use model from env or fallback
    let modelName = process.env.ANTHROPIC_MODEL_RA;
    if (!modelName) {
      modelName = 'claude-3-5-sonnet-20241022';
    }

    let response;
    try {
      response = await anthropic.messages.create({
        model: modelName,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });
    } catch (modelError: any) {
      // Fallback to haiku if model not found
      if (modelError?.status === 404 || modelError?.error?.type === 'not_found_error') {
        console.warn(`Model ${modelName} not found, falling back to claude-3-haiku-20240307`);
        response = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 2048,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userPrompt,
            },
          ],
        });
      } else {
        throw modelError;
      }
    }

    // Extract text response
    const suggestion = response.content
      .filter(block => block.type === 'text')
      .map(block => (block.type === 'text' ? block.text : ''))
      .join('\n')
      .trim();

    // Try to parse as JSON array for checklist mode
    let suggestedChecklist;
    try {
      // Extract JSON array even if surrounded by markdown code fences
      const jsonMatch = suggestion.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
          suggestedChecklist = parsed.map((label: string, idx: number) => ({
            id: `ai_${Date.now()}_${idx}`,
            label: label.trim(),
            checked: false,
            isCustom: false,
            aiSuggested: true,
          }));
        }
      }
    } catch {
      // Not valid JSON - keep suggestion as plain text fallback
    }

    const result: FireRAAIAssistResponse = {
      suggestion,
      mode: effectiveMode,
      ...(suggestedChecklist ? { suggestedChecklist } : {}),
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Fire RA AI Assist error:', error);

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
      { error: error.message || 'Failed to generate AI suggestion' },
      { status: 500 }
    );
  }
}
