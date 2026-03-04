/**
 * Fire Risk Assessment — Constants
 * Section definitions, screening questions, default items, risk scales
 */

import type {
  FireRAScreeningAnswers,
  FireRAComplexityTier,
  RiskLevelInfo,
} from '@/types/fire-ra';

// ---------------------------------------------------------------------------
// Screening Questions (Brief section 2.1)
// ---------------------------------------------------------------------------

export interface ScreeningQuestion {
  id: keyof FireRAScreeningAnswers;
  question: string;
  options: { value: string; label: string }[];
}

export const SCREENING_QUESTIONS: ScreeningQuestion[] = [
  {
    id: 'premisesType',
    question: 'What type of premises is this?',
    options: [
      { value: 'restaurant_cafe', label: 'Restaurant / Cafe' },
      { value: 'pub_bar', label: 'Pub / Bar' },
      { value: 'hotel_bnb', label: 'Hotel / B&B' },
      { value: 'retail_shop', label: 'Retail Shop' },
      { value: 'warehouse', label: 'Warehouse' },
      { value: 'food_manufacturing', label: 'Food Manufacturing' },
      { value: 'office', label: 'Office' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    id: 'floorCount',
    question: 'How many floors does the premises have?',
    options: [
      { value: 'single', label: 'Single floor' },
      { value: 'two', label: '2 floors' },
      { value: 'three_plus', label: '3+ floors' },
      { value: 'split_level', label: 'Split level' },
    ],
  },
  {
    id: 'sleepingOnPremises',
    question: 'Does anyone sleep on the premises?',
    options: [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' },
    ],
  },
  {
    id: 'flammableMaterials',
    question: 'Are flammable/explosive materials stored on site?',
    options: [
      { value: 'none', label: 'None' },
      { value: 'small', label: 'Small quantities (cleaning products, cooking oils)' },
      { value: 'significant', label: 'Significant quantities (fuel, chemicals, large oil stores)' },
    ],
  },
  {
    id: 'occupancy',
    question: 'Maximum number of people on premises at any time (staff + public)?',
    options: [
      { value: 'under_25', label: 'Under 25' },
      { value: '25_50', label: '25 - 50' },
      { value: '50_100', label: '50 - 100' },
      { value: '100_300', label: '100 - 300' },
      { value: '300_plus', label: '300+' },
    ],
  },
  {
    id: 'disabilitiesOnSite',
    question: 'Are there people with disabilities or mobility issues regularly on site?',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
      { value: 'unknown', label: 'Unknown' },
    ],
  },
  {
    id: 'lastProfessionalAssessment',
    question: 'When was the last professional fire risk assessment? (if any)',
    options: [
      { value: 'never', label: 'Never' },
      { value: 'within_12_months', label: 'Within 12 months' },
      { value: '1_3_years', label: '1 - 3 years ago' },
      { value: '3_plus_years', label: '3+ years ago' },
      { value: 'dont_know', label: "Don't know" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Complexity Tier Descriptions
// ---------------------------------------------------------------------------

export const TIER_INFO: Record<FireRAComplexityTier, { label: string; description: string; color: string }> = {
  standard: {
    label: 'Standard',
    description: 'Full template with all core sections. AI assistance available on every section.',
    color: 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/40',
  },
  enhanced: {
    label: 'Enhanced',
    description: 'Full template plus additional sub-sections for vertical escape, sleeping risk, DSEAR considerations and PEEPs. Recommends periodic professional review.',
    color: 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/40',
  },
  specialist: {
    label: 'Specialist',
    description: 'Professional fire risk assessment is recommended. You may proceed with a preliminary self-assessment, but a competent professional should review your premises.',
    color: 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/40',
  },
};

// ---------------------------------------------------------------------------
// Section Definitions (Brief section 3.1)
// ---------------------------------------------------------------------------

export interface FireRASectionDef {
  number: number;
  name: string;
  description: string;
  enhancedOnly: boolean;
}

export const FIRE_RA_SECTIONS: FireRASectionDef[] = [
  { number: 1, name: 'General Information', description: 'Premises details, responsible person, assessment date, review date, assessor details', enhancedOnly: false },
  { number: 2, name: 'Fire Hazard Identification', description: 'Sources of ignition, fuel, oxygen, and hazardous processes', enhancedOnly: false },
  { number: 3, name: 'People at Risk', description: 'Staff, visitors, contractors, vulnerable persons, lone workers', enhancedOnly: false },
  { number: 4, name: 'Fire Prevention Measures', description: 'Housekeeping, electrical safety, heating, cooking equipment, smoking, arson prevention', enhancedOnly: false },
  { number: 5, name: 'Means of Escape', description: 'Escape routes, exit doors, travel distances, emergency lighting, signage, assembly points', enhancedOnly: false },
  { number: 6, name: 'Fire Detection & Warning', description: 'Fire alarm system, detectors, manual call points, alarm audibility, testing', enhancedOnly: false },
  { number: 7, name: 'Firefighting Equipment', description: 'Extinguisher types and locations, fire blankets, hose reels, suppression systems', enhancedOnly: false },
  { number: 8, name: 'Emergency Planning', description: 'Fire action plan, evacuation procedures, fire drills, fire wardens', enhancedOnly: false },
  { number: 9, name: 'Staff Training', description: 'Fire safety induction, ongoing training, fire warden training, records', enhancedOnly: false },
  { number: 10, name: 'Maintenance & Testing', description: 'Fire alarm testing, emergency lighting, extinguisher servicing, fire door maintenance', enhancedOnly: false },
  { number: 11, name: 'Dangerous Substances (DSEAR)', description: 'DSEAR assessment, storage, ventilation, ignition source control, COSHH crossover', enhancedOnly: true },
  { number: 12, name: 'Risk Rating Summary', description: 'Overall risk rating, section summary, priority actions, review schedule', enhancedOnly: false },
];

// ---------------------------------------------------------------------------
// Default Items per Section (Brief section 3.2)
// ---------------------------------------------------------------------------

export interface FireRAItemDef {
  itemNumber: string;
  itemName: string;
  isEnhancedOnly: boolean;
}

export const SECTION_ITEMS: Record<number, FireRAItemDef[]> = {
  // Section 1 is handled via GeneralInfo fields, not individual items
  1: [],

  2: [
    { itemNumber: '2.1', itemName: 'Sources of ignition: electrical equipment, heating systems, cooking equipment, naked flames, hot processes, smoking materials, lighting, arson potential', isEnhancedOnly: false },
    { itemNumber: '2.2', itemName: 'Sources of fuel: furnishings, waste materials, flammable liquids/gases, paper/cardboard, timber, textiles, foam/plastic, cooking oils', isEnhancedOnly: false },
    { itemNumber: '2.3', itemName: 'Sources of oxygen: natural ventilation, mechanical ventilation, air conditioning, oxidising materials, medical oxygen', isEnhancedOnly: false },
    { itemNumber: '2.4', itemName: 'Hazardous processes: hot work, deep fat frying, solvent use, spray painting, dust-producing processes', isEnhancedOnly: false },
  ],

  3: [
    { itemNumber: '3.1', itemName: 'Staff: number, locations, shift patterns, lone workers', isEnhancedOnly: false },
    { itemNumber: '3.2', itemName: 'Public/visitors: typical numbers, peak times, familiarity with premises', isEnhancedOnly: false },
    { itemNumber: '3.3', itemName: 'Contractors: frequency of visits, areas accessed, permit to work requirements', isEnhancedOnly: false },
    { itemNumber: '3.4', itemName: 'Vulnerable persons: elderly, disabled, young persons, non-English speakers', isEnhancedOnly: false },
    { itemNumber: '3.5', itemName: 'Sleeping occupants: number of beds, floor locations, alarm audibility, escape routes from sleeping areas', isEnhancedOnly: true },
  ],

  4: [
    { itemNumber: '4.1', itemName: 'General housekeeping and waste management', isEnhancedOnly: false },
    { itemNumber: '4.2', itemName: 'Electrical safety: PAT testing, fixed wiring inspection, plug socket loading', isEnhancedOnly: false },
    { itemNumber: '4.3', itemName: 'Heating systems: fixed heaters, portable heaters, clearance from combustibles', isEnhancedOnly: false },
    { itemNumber: '4.4', itemName: 'Cooking equipment: extract systems, filters, fire suppression, deep fat fryers', isEnhancedOnly: false },
    { itemNumber: '4.5', itemName: 'Smoking policy and smoking area arrangements', isEnhancedOnly: false },
    { itemNumber: '4.6', itemName: 'Contractor and hot work controls', isEnhancedOnly: false },
    { itemNumber: '4.7', itemName: 'Arson prevention: external bins, security, lighting, letter boxes', isEnhancedOnly: false },
  ],

  5: [
    { itemNumber: '5.1', itemName: 'Escape routes: number, width, condition, obstruction, dead ends', isEnhancedOnly: false },
    { itemNumber: '5.2', itemName: 'Travel distances: from any point to nearest exit', isEnhancedOnly: false },
    { itemNumber: '5.3', itemName: 'Exit doors: number, type, direction of opening, locking mechanisms, final exit doors', isEnhancedOnly: false },
    { itemNumber: '5.4', itemName: 'Emergency lighting: coverage, type, testing status', isEnhancedOnly: false },
    { itemNumber: '5.5', itemName: 'Fire safety signage: exit signs, directional signs, fire action notices', isEnhancedOnly: false },
    { itemNumber: '5.6', itemName: 'Assembly points: location, adequacy, signage', isEnhancedOnly: false },
    { itemNumber: '5.7', itemName: 'Vertical escape: protected staircases, staircase width, fire doors to stairs, smoke ventilation, refuge areas', isEnhancedOnly: true },
  ],

  6: [
    { itemNumber: '6.1', itemName: 'Fire alarm system: type and category (conventional/addressable/wireless, BS 5839 category)', isEnhancedOnly: false },
    { itemNumber: '6.2', itemName: 'Detector types and locations: smoke, heat, multi-sensor, beam, aspirating', isEnhancedOnly: false },
    { itemNumber: '6.3', itemName: 'Manual call points: locations, accessibility', isEnhancedOnly: false },
    { itemNumber: '6.4', itemName: 'Alarm sounders: audibility, visual alarms for hearing-impaired', isEnhancedOnly: false },
    { itemNumber: '6.5', itemName: 'Testing and maintenance: weekly test regime, quarterly/annual professional servicing', isEnhancedOnly: false },
  ],

  7: [
    { itemNumber: '7.1', itemName: 'Extinguishers: types (water, foam, CO2, powder, wet chemical), locations, suitability for hazards present', isEnhancedOnly: false },
    { itemNumber: '7.2', itemName: 'Fire blankets: locations (especially kitchens)', isEnhancedOnly: false },
    { itemNumber: '7.3', itemName: 'Hose reels: if present, testing status', isEnhancedOnly: false },
    { itemNumber: '7.4', itemName: 'Fixed suppression: sprinklers, kitchen suppression systems, gas suppression', isEnhancedOnly: false },
    { itemNumber: '7.5', itemName: 'Annual servicing records', isEnhancedOnly: false },
  ],

  8: [
    { itemNumber: '8.1', itemName: 'Fire action plan: documented, displayed, up to date', isEnhancedOnly: false },
    { itemNumber: '8.2', itemName: 'Evacuation procedure: simultaneous/phased/progressive, coordination with fire service', isEnhancedOnly: false },
    { itemNumber: '8.3', itemName: 'Fire drills: frequency, last drill date, outcomes, records', isEnhancedOnly: false },
    { itemNumber: '8.4', itemName: 'Fire wardens/marshals: number, coverage, identification (hi-vis)', isEnhancedOnly: false },
    { itemNumber: '8.5', itemName: 'Personal Emergency Evacuation Plans (PEEPs): for individuals requiring assistance, buddy system, refuge areas', isEnhancedOnly: true },
  ],

  9: [
    { itemNumber: '9.1', itemName: 'Fire safety induction: content, delivery method, completion tracking', isEnhancedOnly: false },
    { itemNumber: '9.2', itemName: 'Ongoing refresher training: frequency, content', isEnhancedOnly: false },
    { itemNumber: '9.3', itemName: 'Fire warden/marshal training: certification, refresher schedule', isEnhancedOnly: false },
    { itemNumber: '9.4', itemName: 'Records of training: maintained, accessible, up to date', isEnhancedOnly: false },
  ],

  10: [
    { itemNumber: '10.1', itemName: 'Fire alarm weekly testing: who tests, records', isEnhancedOnly: false },
    { itemNumber: '10.2', itemName: 'Emergency lighting monthly/annual testing', isEnhancedOnly: false },
    { itemNumber: '10.3', itemName: 'Fire extinguisher annual servicing', isEnhancedOnly: false },
    { itemNumber: '10.4', itemName: 'Fire door inspection: self-closers, seals, glazing, gaps', isEnhancedOnly: false },
    { itemNumber: '10.5', itemName: 'Sprinkler/suppression system maintenance', isEnhancedOnly: false },
    { itemNumber: '10.6', itemName: 'Record keeping for all maintenance activities', isEnhancedOnly: false },
  ],

  11: [
    { itemNumber: '11.1', itemName: 'Identification of dangerous substances on premises', isEnhancedOnly: true },
    { itemNumber: '11.2', itemName: 'Storage arrangements: bunded areas, ventilated stores, separation from ignition sources', isEnhancedOnly: true },
    { itemNumber: '11.3', itemName: 'Hazardous area classification (zones)', isEnhancedOnly: true },
    { itemNumber: '11.4', itemName: 'Control measures: ventilation, electrical equipment specification, signage', isEnhancedOnly: true },
    { itemNumber: '11.5', itemName: 'COSHH assessment cross-reference', isEnhancedOnly: true },
  ],

  // Section 12 is auto-generated summary, no manually-assessed items
  12: [],
};

// ---------------------------------------------------------------------------
// Risk Scales (Brief section 5)
// ---------------------------------------------------------------------------

export const LIKELIHOOD_OPTIONS = [
  { value: 1, label: '1 - Remote', description: 'Unlikely to occur under any foreseeable circumstances' },
  { value: 2, label: '2 - Unlikely', description: 'Could occur but only in unusual circumstances' },
  { value: 3, label: '3 - Possible', description: 'Could occur at some point based on current conditions' },
  { value: 4, label: '4 - Likely', description: 'Will probably occur unless changes are made' },
  { value: 5, label: '5 - Almost Certain', description: 'Expected to occur, may have already occurred' },
];

export const SEVERITY_OPTIONS = [
  { value: 1, label: '1 - Negligible', description: 'Minor inconvenience, no injuries or damage' },
  { value: 2, label: '2 - Minor', description: 'First aid injuries, minor property damage' },
  { value: 3, label: '3 - Moderate', description: 'Injuries requiring medical treatment, significant property damage' },
  { value: 4, label: '4 - Major', description: 'Serious injuries, major structural damage, business interruption' },
  { value: 5, label: '5 - Catastrophic', description: 'Death, total building loss, permanent business closure' },
];

export const PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

// ---------------------------------------------------------------------------
// Risk Level Thresholds (Brief section 5.3)
// ---------------------------------------------------------------------------

export function getRiskLevel(score: number): RiskLevelInfo {
  if (score <= 4) {
    return {
      level: 'Low',
      color: 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/40',
      description: 'Acceptable risk. Monitor and review. No immediate action required.',
    };
  }
  if (score <= 12) {
    return {
      level: 'Medium',
      color: 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/40',
      description: 'Tolerable risk with controls. Implement improvements within a reasonable timeframe.',
    };
  }
  return {
    level: 'High',
    color: 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/40',
    description: 'Intolerable risk. Immediate action required. Consider restricting activities until resolved.',
  };
}

// ---------------------------------------------------------------------------
// Premises type labels
// ---------------------------------------------------------------------------

export const PREMISES_TYPE_LABELS: Record<string, string> = {
  restaurant_cafe: 'Restaurant / Cafe',
  pub_bar: 'Pub / Bar',
  hotel_bnb: 'Hotel / B&B',
  retail_shop: 'Retail Shop',
  warehouse: 'Warehouse',
  food_manufacturing: 'Food Manufacturing',
  office: 'Office',
  other: 'Other',
};
