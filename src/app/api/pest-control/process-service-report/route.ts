import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const extractionPrompt = `You are a pest control service report data extraction system for UK hospitality and food businesses.

Extract ALL available information from this pest control service report/visit sheet.

Return ONLY valid JSON matching this exact structure:
{
  "visit_date": "2025-01-15",
  "technician_name": "John Smith",
  "visit_duration_minutes": 45,
  "evidence_found": true,
  "evidence_type": ["droppings", "gnaw marks"],
  "affected_areas": ["kitchen store room", "rear external"],
  "pest_types": ["mice", "cockroaches"],
  "treatments_applied": ["rodenticide bait laid", "insecticidal gel applied"],
  "chemicals_used": [
    {
      "name": "Roban Cut Wheat",
      "quantity": "50g",
      "coshh_ref": "HSE 8888"
    }
  ],
  "devices_serviced": 12,
  "devices_replaced": 2,
  "baits_replenished": 8,
  "proofing_required": true,
  "proofing_details": "Gap under rear fire exit door needs brush strip",
  "hygiene_issues_noted": "Food debris under shelving in dry store",
  "follow_up_required": true,
  "follow_up_date": "2025-02-15",
  "visit_cost": 85.00,
  "materials_cost": 15.00,
  "total_cost": 100.00,
  "invoice_reference": "INV-PC-2025-001",
  "recommendations": "Improve cleaning schedule in dry store area. Seal gap around pipe entry in kitchen wall.",
  "overall_risk_level": "medium",
  "confidence": 0.92
}

IMPORTANT RULES:
- visit_date must be in YYYY-MM-DD format
- follow_up_date must be in YYYY-MM-DD format if present
- evidence_found and proofing_required and follow_up_required must be boolean (true/false)
- devices_serviced, devices_replaced, baits_replenished must be integers
- visit_duration_minutes must be an integer
- All monetary values must be numbers, not strings
- chemicals_used must be an array of objects with name, quantity, and coshh_ref fields
- evidence_type, affected_areas, pest_types, treatments_applied must be arrays of strings
- overall_risk_level should be one of: "low", "medium", "high" based on the report findings
- If any field is not found in the report, use null
- confidence should be a number between 0 and 1 indicating extraction confidence`;

export async function POST(request: NextRequest) {
  try {
    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { imageUrl, fileType, companyId, siteId } = body;

    // Input validation
    if (!imageUrl || !companyId || !siteId) {
      return NextResponse.json(
        { error: 'Missing required fields: imageUrl, companyId, siteId' },
        { status: 400 }
      );
    }

    if (typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
      return NextResponse.json(
        { error: 'imageUrl must be a valid URL' },
        { status: 400 }
      );
    }

    // Determine if this is a PDF based on file type or URL
    const isPdf =
      fileType === 'application/pdf' ||
      imageUrl.toLowerCase().endsWith('.pdf') ||
      imageUrl.toLowerCase().includes('.pdf?');

    // Call Claude Vision API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            isPdf
              ? {
                  type: 'document' as const,
                  source: {
                    type: 'url' as const,
                    url: imageUrl,
                  },
                }
              : {
                  type: 'image' as const,
                  source: {
                    type: 'url' as const,
                    url: imageUrl,
                  },
                },
            {
              type: 'text' as const,
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
      const jsonMatch =
        text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
      extraction = JSON.parse(jsonText);
    } catch (parseError) {
      console.error(
        'Failed to parse Claude response:',
        content.text
      );
      throw new Error('Failed to parse service report extraction result');
    }

    // Normalize and validate extracted data
    const extractedData = {
      visit_date: extraction.visit_date || null,
      technician_name: extraction.technician_name || null,
      visit_duration_minutes:
        typeof extraction.visit_duration_minutes === 'number'
          ? extraction.visit_duration_minutes
          : null,
      evidence_found:
        typeof extraction.evidence_found === 'boolean'
          ? extraction.evidence_found
          : null,
      evidence_type: Array.isArray(extraction.evidence_type)
        ? extraction.evidence_type
        : null,
      affected_areas: Array.isArray(extraction.affected_areas)
        ? extraction.affected_areas
        : null,
      pest_types: Array.isArray(extraction.pest_types)
        ? extraction.pest_types
        : null,
      treatments_applied: Array.isArray(extraction.treatments_applied)
        ? extraction.treatments_applied
        : null,
      chemicals_used: Array.isArray(extraction.chemicals_used)
        ? extraction.chemicals_used
        : null,
      devices_serviced:
        typeof extraction.devices_serviced === 'number'
          ? extraction.devices_serviced
          : null,
      devices_replaced:
        typeof extraction.devices_replaced === 'number'
          ? extraction.devices_replaced
          : null,
      baits_replenished:
        typeof extraction.baits_replenished === 'number'
          ? extraction.baits_replenished
          : null,
      proofing_required:
        typeof extraction.proofing_required === 'boolean'
          ? extraction.proofing_required
          : null,
      proofing_details: extraction.proofing_details || null,
      hygiene_issues_noted: extraction.hygiene_issues_noted || null,
      follow_up_required:
        typeof extraction.follow_up_required === 'boolean'
          ? extraction.follow_up_required
          : null,
      follow_up_date: extraction.follow_up_date || null,
      visit_cost:
        typeof extraction.visit_cost === 'number'
          ? extraction.visit_cost
          : null,
      materials_cost:
        typeof extraction.materials_cost === 'number'
          ? extraction.materials_cost
          : null,
      total_cost:
        typeof extraction.total_cost === 'number'
          ? extraction.total_cost
          : null,
      invoice_reference: extraction.invoice_reference || null,
      recommendations: extraction.recommendations || null,
      overall_risk_level: extraction.overall_risk_level || null,
      confidence: extraction.confidence || null,
    };

    return NextResponse.json({
      success: true,
      extractedData,
    });
  } catch (error: any) {
    console.error('Error processing pest control service report:', error);
    return NextResponse.json(
      {
        error:
          error.message || 'Failed to process pest control service report',
      },
      { status: 500 }
    );
  }
}
