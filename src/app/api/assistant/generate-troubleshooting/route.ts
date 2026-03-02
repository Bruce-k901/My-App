import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// TROUBLESHOOTING GUIDE GENERATOR API
// ============================================================================
// Uses Claude with web search to find manufacturer troubleshooting docs
// and generate yes/no diagnostic questions for assets
// ============================================================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function buildPrompt(assetName: string, brand: string, model: string, category: string): string {
  const searchTerms = [brand, model].filter(Boolean).join(' ');
  const equipmentDesc = [assetName, brand, model].filter(Boolean).join(' ');

  return `You are an expert in commercial kitchen and hospitality equipment maintenance and diagnostics.

I need you to create a troubleshooting diagnostic guide for this equipment:
- Equipment: ${assetName}
- Brand: ${brand || 'Unknown'}
- Model: ${model || 'Unknown'}
- Category: ${category}

INSTRUCTIONS:
1. First, use web search to find the manufacturer's troubleshooting guide, service manual, or common fault documentation for this specific equipment. Search for "${searchTerms} troubleshooting guide" and "${searchTerms} common faults service manual".
2. Based on the search results and your knowledge of ${category} equipment, generate 8-15 yes/no diagnostic troubleshooting questions that a non-technical staff member can answer when the ${equipmentDesc} is faulty.
3. Questions MUST be answerable with only "Yes" or "No".
4. Questions should progress from simple checks (power, display, sounds) to more specific diagnostic indicators.
5. Questions should help a contractor understand the issue before arriving on site.
6. Make questions specific to this brand/model where possible, referencing known common faults.

QUESTION GUIDELINES:
- Start with basic power/display checks
- Then environmental checks (water, drainage, ventilation)
- Then performance symptoms (temperature, noise, output)
- Then specific component indicators (error codes, lights, leaks)
- Use plain language a kitchen porter or chef can understand

RESPONSE FORMAT:
You MUST respond with valid JSON only. No markdown, no explanation, no code fences, just the raw JSON object:
{"questions": ["question 1?", "question 2?"], "sources": [{"url": "https://...", "title": "Source title"}]}`;
}

function extractJSON(text: string): { questions: string[]; sources: Array<{ url: string; title: string }> } {
  // Strip markdown code fences if present
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

  // Try to find a JSON object in the text
  const jsonMatch = cleaned.match(/\{[\s\S]*"questions"[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new Error('No questions in response');
  }

  // Validate each question is a non-empty string
  const questions = parsed.questions
    .filter((q: unknown) => typeof q === 'string' && q.trim().length > 0)
    .map((q: string) => q.trim());

  const sources = Array.isArray(parsed.sources)
    ? parsed.sources.filter((s: any) => s?.url && s?.title)
    : [];

  return { questions, sources };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { asset_name, brand, model, category } = body;

    if (!asset_name) {
      return NextResponse.json(
        { error: 'asset_name is required' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    const prompt = buildPrompt(
      asset_name,
      brand || '',
      model || '',
      category || 'equipment'
    );

    let modelName = process.env.ANTHROPIC_MODEL_TROUBLESHOOT || 'claude-sonnet-4-5-20250929';

    let response;
    try {
      response = await anthropic.messages.create({
        model: modelName,
        max_tokens: 4096,
        tools: [
          {
            type: "web_search_20250305" as any,
            name: "web_search",
            max_uses: 5,
          } as any,
        ],
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });
    } catch (modelError: any) {
      // If model not found, try without web search as fallback
      if (modelError?.status === 404 || modelError?.error?.type === 'not_found_error') {
        console.warn(`Model ${modelName} not found, falling back to claude-3-haiku-20240307 without web search`);
        modelName = 'claude-3-haiku-20240307';
        response = await anthropic.messages.create({
          model: modelName,
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });
      } else {
        throw modelError;
      }
    }

    // Extract the final text block from the response
    const textBlocks = response.content.filter(
      (block) => block.type === 'text'
    );
    const lastText = textBlocks[textBlocks.length - 1];
    if (!lastText || lastText.type !== 'text') {
      return NextResponse.json(
        { error: 'No text response from AI' },
        { status: 500 }
      );
    }

    const result = extractJSON(lastText.text);

    return NextResponse.json({
      questions: result.questions,
      sources: result.sources,
      asset_name,
      model_used: modelName,
    });
  } catch (error: any) {
    console.error('Troubleshooting Generator API error:', error);

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
      { error: error.message || 'Failed to generate troubleshooting guide' },
      { status: 500 }
    );
  }
}
