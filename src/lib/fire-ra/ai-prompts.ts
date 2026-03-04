/**
 * Fire Risk Assessment — AI Prompt Templates
 * Section-specific prompts for Claude API integration
 */

import type { FireRAComplexityTier, FireRAAIMode } from '@/types/fire-ra';
import { FIRE_RA_SECTIONS } from './constants';

interface PromptContext {
  premisesType: string;
  premisesAddress: string;
  tier: FireRAComplexityTier;
  floorCount: string;
  occupancy: string;
  sleepingOnPremises: boolean;
  flammableMaterials: string;
  sectionNumber: number;
  itemNumber: string;
  itemName?: string;
  existingText: string;
  userInput?: string;
}

const SYSTEM_PROMPT_BASE = `You are a UK fire safety assistant helping complete a fire risk assessment under the Regulatory Reform (Fire Safety) Order 2005.

Key references you should be aware of:
- Regulatory Reform (Fire Safety) Order 2005 (the primary legislation)
- PAS 79-1:2020 (fire risk assessment guidance for commercial premises)
- BS 9999:2017 (code of practice for fire safety in the design, management and use of buildings)
- BS 5839 (fire detection and alarm systems)
- BS 5266 (emergency lighting)

Guidelines for your responses:
- Use plain English, not technical jargon
- Be specific to the premises type described
- Reference relevant UK standards/guidance where appropriate
- If suggesting actions, make them practical and achievable
- Keep findings factual and observation-based
- Flag anything that requires professional assessment
- Do NOT auto-fill risk ratings - those are the user's judgement
- Keep responses concise and focused`;

function buildPremisesContext(ctx: PromptContext): string {
  const section = FIRE_RA_SECTIONS.find(s => s.number === ctx.sectionNumber);
  return `
Premises: ${ctx.premisesType}${ctx.premisesAddress ? ` at ${ctx.premisesAddress}` : ''}
Complexity tier: ${ctx.tier}
Floors: ${ctx.floorCount}
Occupancy: ${ctx.occupancy}
Sleeping accommodation: ${ctx.sleepingOnPremises ? 'Yes' : 'No'}
Flammable materials: ${ctx.flammableMaterials}

Section being assessed: ${ctx.sectionNumber} - ${section?.name || 'Unknown'}
Item: ${ctx.itemNumber}${ctx.itemName ? ` - ${ctx.itemName}` : ''}`.trim();
}

export function buildSystemPrompt(ctx: PromptContext): string {
  return `${SYSTEM_PROMPT_BASE}

${buildPremisesContext(ctx)}`;
}

export function buildUserPrompt(ctx: PromptContext, mode: FireRAAIMode, field: string): string {
  switch (mode) {
    case 'generate': {
      if (ctx.userInput) {
        return `Based on this information about the premises: "${ctx.userInput}"

Generate a clear, specific finding for item ${ctx.itemNumber} (${ctx.itemName || field}).

Write 2-4 sentences covering what should be observed and assessed for this item in a ${ctx.premisesType}. Be specific to this premises type.`;
      }
      return `Generate a finding for item ${ctx.itemNumber} (${ctx.itemName || field}) in a ${ctx.premisesType}.

Write 2-4 sentences covering what should typically be observed and assessed for this item. Be specific to this premises type and consider the ${ctx.tier} complexity tier.`;
    }

    case 'improve': {
      return `Review and improve this ${field === 'finding' ? 'finding' : field === 'existing_controls' ? 'existing controls description' : 'action recommendation'}:

"${ctx.existingText}"

Suggest improvements to make it more specific, comprehensive, or better aligned with UK fire safety standards. Maintain the user's intent but enhance clarity and completeness. Return the improved text directly (not as suggestions or bullet points).`;
    }

    case 'suggest_actions': {
      return `Based on this assessment item (${ctx.itemNumber}):

Finding: "${ctx.existingText}"

Suggest specific, practical remedial actions for a ${ctx.premisesType}. For each action:
- State what needs to be done clearly
- Include realistic timeframes where relevant
- Reference any applicable UK standards
- Prioritise safety-critical actions first

Write as a concise paragraph of recommended actions, not as bullet points.`;
    }

    default:
      return ctx.existingText || `Help me assess item ${ctx.itemNumber} for a ${ctx.premisesType}.`;
  }
}
