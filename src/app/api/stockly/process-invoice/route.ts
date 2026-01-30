import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const extractionPrompt = `You are an invoice data extraction system for a UK hospitality business.

IMPORTANT VAT RULES:
- Most raw food (meat, vegetables, dairy, flour) = 0% VAT
- Alcohol (beer, wine, spirits) = 20% VAT
- Soft drinks (cola, juice, NOT plain water) = 20% VAT
- Confectionery (crisps, chocolate, sweets) = 20% VAT
- Cleaning chemicals and disposables = 20% VAT
- If the invoice shows VAT per line, use those values
- If not shown per line, infer from item type

Extract from this invoice:
1. Invoice number
2. Invoice date (YYYY-MM-DD)
3. Delivery note number (if present)
4. Line items with VAT breakdown

Return ONLY valid JSON:
{
  "invoice_number": "INV-12345",
  "invoice_date": "2025-01-15",
  "delivery_note_number": "DN-6789",
  "line_items": [
    {
      "supplier_code": "ABC123",
      "description": "Chicken Breast 2.5kg",
      "quantity": 4,
      "unit": "case",
      "unit_price": 28.50,
      "line_total": 114.00,
      "vat_rate": 0,
      "vat_amount": 0,
      "line_total_inc_vat": 114.00
    },
    {
      "supplier_code": "BEV001",
      "description": "Coca Cola 330ml x24",
      "quantity": 2,
      "unit": "case",
      "unit_price": 12.00,
      "line_total": 24.00,
      "vat_rate": 20,
      "vat_amount": 4.80,
      "line_total_inc_vat": 28.80
    }
  ],
  "subtotal": 138.00,
  "tax": 4.80,
  "total": 142.80,
  "confidence": 0.95
}

If any field is not found, use null. Ensure all monetary values are numbers, not strings.`;

async function matchLineItems(
  lineItems: Array<{
    supplier_code?: string;
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    vat_rate?: number;
    vat_amount?: number;
    line_total_inc_vat?: number;
  }>,
  supplierId: string,
  companyId: string,
  supabase: any
) {
  const results = [];

  for (const item of lineItems) {
    let matchedVariant = null;
    let matchStatus: 'auto_matched' | 'manual_matched' | 'unmatched' | 'new_item' = 'unmatched';
    let matchConfidence = 0;

    // Try exact match on supplier_code
    if (item.supplier_code) {
      const { data: variants } = await supabase
        .from('product_variants')
        .select('*, stock_item:stock_items(id, name)')
        .eq('supplier_id', supplierId)
        .eq('supplier_code', item.supplier_code)
        .limit(1);

      if (variants && variants.length > 0) {
        matchedVariant = variants[0];
        matchStatus = 'auto_matched';
        matchConfidence = 1.0;
      }
    }

    // Try fuzzy match on description if no exact match
    if (!matchedVariant && item.description) {
      // Extract first few words from description for matching
      const searchTerms = item.description
        .split(' ')
        .slice(0, 3)
        .filter((w) => w.length > 2);

      if (searchTerms.length > 0) {
        const searchPattern = `%${searchTerms[0]}%`;
        const { data: fuzzyMatches } = await supabase
          .from('product_variants')
          .select('*, stock_item:stock_items(id, name)')
          .eq('supplier_id', supplierId)
          .ilike('product_name', searchPattern)
          .limit(3);

        if (fuzzyMatches && fuzzyMatches.length === 1) {
          matchedVariant = fuzzyMatches[0];
          matchStatus = 'auto_matched';
          matchConfidence = 0.8;
        } else if (fuzzyMatches && fuzzyMatches.length > 1) {
          // Multiple matches - lower confidence, needs review
          matchedVariant = fuzzyMatches[0]; // Use first match
          matchStatus = 'auto_matched';
          matchConfidence = 0.6;
        }
      }
    }

    // Determine VAT rate - use extracted value or infer from item
    let vatRate = item.vat_rate;
    if (vatRate === null || vatRate === undefined) {
      // Infer VAT rate from description if not provided
      const descLower = item.description.toLowerCase();
      if (
        descLower.includes('beer') ||
        descLower.includes('wine') ||
        descLower.includes('spirit') ||
        descLower.includes('cola') ||
        descLower.includes('soft drink') ||
        descLower.includes('juice') ||
        descLower.includes('crisp') ||
        descLower.includes('chocolate') ||
        descLower.includes('cleaning') ||
        descLower.includes('chemical')
      ) {
        vatRate = 20;
      } else {
        vatRate = 0; // Most food items
      }
    }

    // Calculate VAT amounts if not provided
    const vatAmount = item.vat_amount !== null && item.vat_amount !== undefined
      ? item.vat_amount
      : (item.line_total * vatRate) / 100;
    
    const lineTotalIncVat = item.line_total_inc_vat !== null && item.line_total_inc_vat !== undefined
      ? item.line_total_inc_vat
      : item.line_total + vatAmount;

    // Build result object
    const result: any = {
      description: item.description,
      supplier_code: item.supplier_code || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      line_total_inc_vat: lineTotalIncVat,
      matched_status: matchStatus,
      match_confidence: matchConfidence,
    };

    if (matchedVariant) {
      result.product_variant_id = matchedVariant.id;
      result.stock_item_id = matchedVariant.stock_item_id;
      
      // Calculate qty_base_units if we have conversion factor
      if (matchedVariant.conversion_factor) {
        result.qty_base_units = item.quantity * matchedVariant.conversion_factor;
      }
    } else {
      // Unmatched - suggest creating new stock item
      result.suggested_stock_item = {
        name: item.description,
        supplier_code: item.supplier_code,
      };
    }

    results.push(result);
  }

  return results;
}

export async function POST(request: NextRequest) {
  try {
    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    const { imageUrl, supplierId, companyId, siteId } = await request.json();

    if (!imageUrl || !supplierId || !companyId || !siteId) {
      return NextResponse.json(
        { error: 'Missing required fields: imageUrl, supplierId, companyId, siteId' },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabase = await createServerSupabaseClient();

    // Call Claude Vision API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: imageUrl,
              },
            },
            {
              type: 'text',
              text: extractionPrompt,
            },
          ],
        },
      ],
    });

    // Parse extraction result
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    let extraction;
    try {
      // Extract JSON from response (may have markdown code blocks)
      const text = content.text.trim();
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
      extraction = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', content.text);
      throw new Error('Failed to parse invoice extraction result');
    }

    // Match line items to product variants
    const matchedLines = await matchLineItems(
      extraction.line_items || [],
      supplierId,
      companyId,
      supabase
    );

    // Determine if review is required
    const requiresReview = matchedLines.some(
      (l) => l.matched_status !== 'auto_matched' || (l.match_confidence && l.match_confidence < 0.8)
    );

    // Create delivery record
    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .insert({
        company_id: companyId,
        site_id: siteId,
        supplier_id: supplierId,
        delivery_date: extraction.invoice_date
          ? new Date(extraction.invoice_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        invoice_number: extraction.invoice_number || null,
        invoice_date: extraction.invoice_date || null,
        delivery_note_number: extraction.delivery_note_number || null,
        subtotal: extraction.subtotal || null,
        tax: extraction.tax || null,
        total: extraction.total || null,
        ai_processed: true,
        ai_confidence: extraction.confidence || null,
        ai_extraction: extraction,
        requires_review: requiresReview,
        status: requiresReview ? 'pending_review' : 'draft',
        document_urls: [imageUrl],
      })
      .select()
      .single();

    if (deliveryError) {
      console.error('Error creating delivery:', deliveryError);
      throw new Error('Failed to create delivery record');
    }

    // Create delivery lines
    if (matchedLines.length > 0) {
      const linesToInsert = matchedLines.map((line) => ({
        delivery_id: delivery.id,
        product_variant_id: line.product_variant_id || null,
        stock_item_id: line.stock_item_id || null,
        description: line.description,
        supplier_code: line.supplier_code,
        quantity: line.quantity,
        unit_price: line.unit_price,
        line_total: line.line_total,
        vat_rate: line.vat_rate || 0,
        vat_amount: line.vat_amount || 0,
        line_total_inc_vat: line.line_total_inc_vat || line.line_total,
        qty_base_units: line.qty_base_units || null,
        matched_status: line.matched_status,
        match_confidence: line.match_confidence,
        suggested_stock_item: line.suggested_stock_item || null,
      }));

      const { error: linesError } = await supabase
        .from('delivery_lines')
        .insert(linesToInsert);

      if (linesError) {
        console.error('Error creating delivery lines:', linesError);
        // Don't fail the whole request - delivery is created
        console.warn('Delivery created but lines failed:', linesError);
      }
    }

    return NextResponse.json({ deliveryId: delivery.id });
  } catch (error: any) {
    console.error('Error processing invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process invoice' },
      { status: 500 }
    );
  }
}










