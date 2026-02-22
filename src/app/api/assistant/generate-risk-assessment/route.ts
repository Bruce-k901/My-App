import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// RISK ASSESSMENT GENERATOR API
// ============================================================================
// Generates Risk Assessments using Claude Sonnet with 5x5 risk matrix
// ============================================================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const RA_PROMPT_TEMPLATE = `You are an expert in UK health and safety compliance. Generate a professional Risk Assessment for: {activity_description}

Include the following sections:
1. **Activity/Task Description** - Clear description of what is being assessed
2. **Hazards Identified** - List each hazard separately with specific details
3. **Who Might Be Harmed and How** - Identify affected persons and potential injuries
4. **Existing Control Measures** - Current safety measures in place
5. **Risk Rating** - Use a 5x5 risk matrix:
   - Likelihood: 1 (Very Unlikely) to 5 (Almost Certain)
   - Severity: 1 (Negligible) to 5 (Catastrophic)
   - Risk Score = Likelihood × Severity
   - Present this as a table with columns: Hazard | Likelihood | Severity | Risk Score | Risk Level
6. **Additional Control Measures Required** - What additional steps should be taken
7. **Residual Risk Rating** - Risk level after implementing additional controls
8. **Review Date Recommendation** - When this assessment should be reviewed (typically 1-3 years)

{if_coshh}
Also include COSHH-specific fields:
- **Substance Name and Supplier** - Chemical name and where it's purchased
- **Hazard Symbols and Classifications** - Relevant hazard pictograms (e.g., corrosive, toxic, flammable)
- **Exposure Routes** - How exposure can occur (inhalation, skin contact, ingestion)
- **Maximum Exposure Limits** - UK workplace exposure limits (WELs) if applicable
- **Emergency Procedures** - What to do in case of exposure or spillage
{/if_coshh}

Format the output with clear headings using markdown (## for section headings, ** for bold). Use tables where appropriate for the risk matrix. Keep language clear and professional.

Risk Level Guide:
- 1-5: Low Risk (Green)
- 6-12: Medium Risk (Yellow)
- 13-20: High Risk (Orange)
- 21-25: Very High Risk (Red)`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { activity_description, is_coshh, company_id, site_id } = body;

    if (!activity_description) {
      return NextResponse.json(
        { error: 'activity_description is required' },
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
    let prompt = RA_PROMPT_TEMPLATE.replace('{activity_description}', activity_description);
    
    if (is_coshh) {
      prompt = prompt.replace('{if_coshh}', '').replace('{/if_coshh}', '');
    } else {
      // Remove COSHH section if not applicable
      prompt = prompt.replace(/{if_coshh}[\s\S]*?{\/if_coshh}/, '');
    }

    // Use Claude Sonnet for better quality (as specified in plan)
    // Try newer model first, fallback to haiku if not available
    let modelName = process.env.ANTHROPIC_MODEL_RA;
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
    const raContent = response.content
      .filter(block => block.type === 'text')
      .map(block => block.type === 'text' ? block.text : '')
      .join('\n');

    return NextResponse.json({
      riskAssessment: raContent,
      activity: activity_description,
      isCoshh: is_coshh || false
    });

  } catch (error: any) {
    console.error('Risk Assessment Generator API error:', error);
    
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
      { error: error.message || 'Failed to generate Risk Assessment' },
      { status: 500 }
    );
  }
}
