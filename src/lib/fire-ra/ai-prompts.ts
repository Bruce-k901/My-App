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
- Keep responses concise and focused
- When asked for checklist items, return a JSON array of strings. Each string should be a single concise observation, control, or action item suitable for a checkbox list.`;

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
  const fieldLabel = field === 'finding' ? 'findings' : field === 'existing_controls' ? 'existing controls' : 'actions required';

  switch (mode) {
    case 'generate': {
      const extra = ctx.userInput ? `\nAdditional context from the assessor: "${ctx.userInput}"` : '';
      return `Suggest 4-6 additional checklist items for the "${fieldLabel}" of item ${ctx.itemNumber} (${ctx.itemName || field}) in a ${ctx.premisesType}.
${extra}
Each item should be a concise one-line ${field === 'finding' ? 'observation or hazard' : field === 'existing_controls' ? 'fire safety control or measure in place' : 'practical remedial action with timeframe if relevant'}.

Be specific to a ${ctx.premisesType} premises (${ctx.tier} tier, ${ctx.floorCount} floors, occupancy ${ctx.occupancy}).

Return ONLY a JSON array of strings, like: ["Item 1", "Item 2", "Item 3"]`;
    }

    case 'improve': {
      return `The assessor has already selected these items for "${fieldLabel}" of item ${ctx.itemNumber}:

${ctx.existingText}

Suggest 3-5 ADDITIONAL checklist items that are missing or would strengthen the assessment for a ${ctx.premisesType}. Do not repeat items already selected.

Return ONLY a JSON array of strings, like: ["Item 1", "Item 2", "Item 3"]`;
    }

    case 'suggest_actions': {
      return `Based on the findings for item ${ctx.itemNumber} in a ${ctx.premisesType}:

${ctx.existingText}

Suggest 3-5 specific, practical remedial actions. For each action:
- Be concise (one line per action)
- Include realistic timeframes where relevant
- Reference any applicable UK standards
- Prioritise safety-critical actions first

Return ONLY a JSON array of strings, like: ["Action 1", "Action 2", "Action 3"]`;
    }

    default:
      return ctx.existingText || `Help me assess item ${ctx.itemNumber} for a ${ctx.premisesType}.`;
  }
}
