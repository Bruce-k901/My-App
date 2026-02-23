import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// EQUIPMENT SEARCH API
// ============================================================================
// Uses Claude with web search to find equipment by approximate name/model
// Helps when asset model names are entered incorrectly
// ============================================================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { search_query, category } = body;

    if (!search_query) {
      return NextResponse.json(
        { error: 'search_query is required' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    const prompt = `You are a commercial kitchen and hospitality equipment specialist.

A user is trying to find equipment details. They may have misspelled the brand or model name.
Search query: "${search_query}"
${category ? `Equipment category: ${category}` : ''}

INSTRUCTIONS:
1. Use web search to find commercial/hospitality equipment matching this description.
2. Search for the brand name, model number, and product type on supplier and manufacturer websites.
3. Return up to 5 matching products with their correct details.

RESPONSE FORMAT:
Respond with valid JSON only. No markdown, no code fences, just the raw JSON:
{"results": [{"brand": "Williams", "model": "HJ1SA", "name": "Single Door Upright Refrigerator", "category": "refrigeration", "url": "https://..."}]}

If no results found, return: {"results": []}`;

    let modelName = process.env.ANTHROPIC_MODEL_TROUBLESHOOT || 'claude-sonnet-4-5-20250929';

    let response;
    try {
      response = await anthropic.messages.create({
        model: modelName,
        max_tokens: 2048,
        tools: [
          {
            type: 'web_search_20250305' as any,
            name: 'web_search',
            max_uses: 3,
          } as any,
        ],
        messages: [{ role: 'user', content: prompt }],
      });
    } catch (modelError: any) {
      if (modelError?.status === 404 || modelError?.error?.type === 'not_found_error') {
        modelName = 'claude-3-haiku-20240307';
        response = await anthropic.messages.create({
          model: modelName,
          max_tokens: 2048,
          messages: [{ role: 'user', content: prompt }],
        });
      } else {
        throw modelError;
      }
    }

    // Extract the final text block
    const textBlocks = response.content.filter((b) => b.type === 'text');
    const lastText = textBlocks[textBlocks.length - 1];
    if (!lastText || lastText.type !== 'text') {
      return NextResponse.json({ results: [] });
    }

    // Parse JSON from response
    let cleaned = lastText.text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*"results"[\s\S]*\}/);
    if (jsonMatch) cleaned = jsonMatch[0];

    const parsed = JSON.parse(cleaned);
    const results = Array.isArray(parsed.results)
      ? parsed.results
          .filter((r: any) => r?.brand || r?.model || r?.name)
          .slice(0, 5)
      : [];

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Equipment Search API error:', error);

    if (error?.status === 401 || error?.statusCode === 401) {
      return NextResponse.json(
        { error: 'Invalid Anthropic API key.' },
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
      { error: error.message || 'Failed to search equipment' },
      { status: 500 }
    );
  }
}
