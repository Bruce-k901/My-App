import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const NUTRITION_PROMPT = `You are a UK food nutritionist. For each ingredient listed below, provide the standard nutritional values per 100g in the UK Big 7 format.

Return ONLY a valid JSON array, with no markdown or explanation. Each object must have:
- "id": the ingredient ID (passed to you)
- "energy_kcal": energy in kcal per 100g
- "fat_g": total fat in grams per 100g
- "saturated_fat_g": saturated fat in grams per 100g
- "carbohydrate_g": total carbohydrate in grams per 100g
- "sugars_g": of which sugars in grams per 100g
- "fibre_g": dietary fibre in grams per 100g
- "protein_g": protein in grams per 100g
- "salt_g": salt in grams per 100g

Use standard UK food composition data (McCance and Widdowson / CoFID). For raw/unprocessed ingredients use the raw values. Round to 1 decimal place (salt to 2).

If the ingredient is a non-food item (cleaning chemical, packaging, etc.) return null for all nutrition fields.

Ingredients:
`;

interface IngredientInput {
  id: string;
  name: string;
}

interface NutritionResult {
  id: string;
  energy_kcal: number | null;
  fat_g: number | null;
  saturated_fat_g: number | null;
  carbohydrate_g: number | null;
  sugars_g: number | null;
  fibre_g: number | null;
  protein_g: number | null;
  salt_g: number | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ingredients, company_id } = body as {
      ingredients: IngredientInput[];
      company_id: string;
    };

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: 'ingredients array is required' },
        { status: 400 }
      );
    }

    if (ingredients.length > 30) {
      return NextResponse.json(
        { error: 'Maximum 30 ingredients per request' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    // Build prompt with ingredient list
    const ingredientList = ingredients
      .map((ing) => `- ID: ${ing.id} | Name: ${ing.name}`)
      .join('\n');

    const prompt = NUTRITION_PROMPT + ingredientList;

    // Call Claude
    let modelName = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
    let response;

    try {
      response = await anthropic.messages.create({
        model: modelName,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });
    } catch (modelError: any) {
      if (modelError?.status === 404 || modelError?.error?.type === 'not_found_error') {
        console.warn(`Model ${modelName} not found, falling back to claude-3-haiku-20240307`);
        response = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        });
      } else {
        throw modelError;
      }
    }

    // Extract JSON from response
    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('');

    // Parse JSON - handle potential markdown code blocks
    let cleanJson = text.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    let results: NutritionResult[];
    try {
      results = JSON.parse(cleanJson);
    } catch {
      console.error('Failed to parse nutrition response:', text);
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      );
    }

    // Write results to ingredients_library
    const supabaseAdmin = getSupabaseAdmin();
    const updates: Array<{ id: string; success: boolean }> = [];

    for (const result of results) {
      if (result.energy_kcal === null) {
        updates.push({ id: result.id, success: true }); // non-food item, skip
        continue;
      }

      const { error } = await supabaseAdmin
        .from('ingredients_library')
        .update({
          nutrition_energy_kcal: result.energy_kcal,
          nutrition_fat_g: result.fat_g,
          nutrition_saturated_fat_g: result.saturated_fat_g,
          nutrition_carbohydrate_g: result.carbohydrate_g,
          nutrition_sugars_g: result.sugars_g,
          nutrition_fibre_g: result.fibre_g,
          nutrition_protein_g: result.protein_g,
          nutrition_salt_g: result.salt_g,
        })
        .eq('id', result.id)
        .eq('company_id', company_id);

      updates.push({ id: result.id, success: !error });
      if (error) {
        console.error(`Failed to update ingredient ${result.id}:`, error.message);
      }
    }

    return NextResponse.json({
      results,
      updates,
      total: results.length,
      updated: updates.filter((u) => u.success).length,
    });
  } catch (error: any) {
    console.error('Nutrition lookup API error:', error);

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
      { error: error.message || 'Failed to look up nutrition data' },
      { status: 500 }
    );
  }
}
