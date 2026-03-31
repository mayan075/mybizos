import type { AgentService } from '../types/index';

export interface IndustryTemplate {
  knowledge: string;
  defaultServices: AgentService[];
  defaultAgentName: string;
  defaultEmergencyKeywords: string[];
}

/** @deprecated Use IndustryTemplate instead */
export type VerticalTemplate = IndustryTemplate;

/**
 * Industry-specific AI agent templates.
 * Keyed by industry slug. Includes a `general` fallback for unknown industries.
 */
export const INDUSTRY_TEMPLATES: Record<string, IndustryTemplate> = {
  general: {
    defaultAgentName: 'Alex',
    defaultEmergencyKeywords: ['emergency', 'urgent', 'fire', 'flooding', 'gas leak', 'smoke'],
    defaultServices: [],
    knowledge: `GENERAL BUSINESS KNOWLEDGE:
- Ask the customer what service or product they're interested in
- Collect their name, phone number, and preferred contact method
- Ask about their timeline and any specific requirements
- Offer to schedule a consultation or appointment
- If unsure about pricing, offer to have someone follow up with a detailed quote
- Be helpful, professional, and focus on understanding the customer's needs`,
  },
  plumbing: {
    defaultAgentName: 'Alex',
    defaultEmergencyKeywords: ['flooding', 'flood', 'gas leak', 'gas smell', 'burst pipe', 'sewage', 'no hot water', 'water damage'],
    defaultServices: [
      { name: 'Drain cleaning', priceLow: 150, priceHigh: 350, pricingMode: 'range', pricingUnit: 'job' },
      { name: 'Water heater repair', priceLow: 200, priceHigh: 500, pricingMode: 'range', pricingUnit: 'job' },
      { name: 'Leak repair', priceLow: 150, priceHigh: 400, pricingMode: 'range', pricingUnit: 'job' },
      { name: 'Toilet repair', priceLow: 100, priceHigh: 300, pricingMode: 'range', pricingUnit: 'job' },
      { name: 'Faucet installation', priceLow: 150, priceHigh: 350, pricingMode: 'range', pricingUnit: 'job' },
    ],
    knowledge: `PLUMBING KNOWLEDGE:
- Common services: drain cleaning, water heater repair/replacement, leak repair, toilet repair, faucet installation, sewer line inspection, garbage disposal
- Emergency services available 24/7 with premium rate
- Always ask: What's the issue? How long has it been happening? Is there active water damage?
- For water heater issues: ask tank vs tankless, age of unit, gas vs electric
- For drain issues: ask which drain, previous issues, solutions already tried
- Service call/diagnostic fee typically applies, credited toward repair
- Licensed and insured, all work guaranteed`,
  },
  hvac: {
    defaultAgentName: 'Jordan',
    defaultEmergencyKeywords: ['no heat', 'no cooling', 'no AC', 'gas smell', 'gas leak', 'carbon monoxide', 'co detector', 'smoke', 'burning smell'],
    defaultServices: [
      { name: 'AC repair', priceLow: 150, priceHigh: 600, pricingMode: 'range', pricingUnit: 'job' },
      { name: 'AC tune-up', priceLow: 80, priceHigh: 150, pricingMode: 'fixed', pricingUnit: 'job' },
      { name: 'Furnace repair', priceLow: 150, priceHigh: 500, pricingMode: 'range', pricingUnit: 'job' },
      { name: 'Duct cleaning', priceLow: 300, priceHigh: 600, pricingMode: 'range', pricingUnit: 'job' },
      { name: 'System replacement', priceLow: 5000, priceHigh: 15000, pricingMode: 'from', pricingUnit: 'job' },
    ],
    knowledge: `HVAC KNOWLEDGE:
- Common services: AC repair, AC tune-up, furnace repair, furnace tune-up, full system replacement, duct cleaning, thermostat installation
- Seasonal maintenance plans available
- Emergency services available 24/7 for no heat/no AC
- Always ask: Heating or cooling? Symptoms (no air, weak air, noise, smell)? Age of system? When last serviced?
- Ask about home size for replacement quotes`,
  },
  rubbish_removals: {
    defaultAgentName: 'Sam',
    defaultEmergencyKeywords: ['hazardous', 'asbestos', 'chemical', 'biohazard'],
    defaultServices: [
      { name: 'General rubbish removal', priceLow: 150, priceHigh: 400, pricingMode: 'range', pricingUnit: 'unit' },
      { name: 'Green waste removal', priceLow: 100, priceHigh: 300, pricingMode: 'range', pricingUnit: 'unit' },
      { name: 'Furniture removal', priceLow: 100, priceHigh: 350, pricingMode: 'range', pricingUnit: 'unit' },
      { name: 'Construction waste', priceLow: 200, priceHigh: 500, pricingMode: 'range', pricingUnit: 'unit' },
      { name: 'House cleanout', priceLow: 500, priceHigh: 2000, pricingMode: 'from', pricingUnit: 'job' },
    ],
    knowledge: `RUBBISH REMOVAL KNOWLEDGE:
- Common services: general rubbish, green waste, furniture, construction waste, full house cleanouts, deceased estate clearance
- Always ask: What type of rubbish? How much (cubic meters or truck loads)? Access to property? Stairs involved? Any hazardous materials?
- Same-day service may be available depending on schedule
- Free quotes for larger jobs
- We recycle and donate where possible
- Pricing depends on volume and type — offer to send someone for a free assessment`,
  },
  electrical: {
    defaultAgentName: 'Morgan',
    defaultEmergencyKeywords: ['electrical fire', 'sparking', 'smoke', 'burning smell', 'power outage', 'exposed wires', 'shock'],
    defaultServices: [
      { name: 'Outlet/switch repair', priceLow: 100, priceHigh: 250, pricingMode: 'range', pricingUnit: 'job' },
      { name: 'Lighting installation', priceLow: 150, priceHigh: 400, pricingMode: 'range', pricingUnit: 'job' },
      { name: 'Panel upgrade', priceLow: 1500, priceHigh: 3500, pricingMode: 'range', pricingUnit: 'job' },
      { name: 'Ceiling fan install', priceLow: 200, priceHigh: 450, pricingMode: 'range', pricingUnit: 'job' },
      { name: 'EV charger install', priceLow: 500, priceHigh: 1500, pricingMode: 'range', pricingUnit: 'job' },
    ],
    knowledge: `ELECTRICAL KNOWLEDGE:
- Common services: outlet/switch repair, panel upgrades, lighting installation, ceiling fan install, smoke detector install, whole-home rewiring, EV charger install
- Emergency services for outages, sparking, burning smells
- Always ask: What's happening? How old is the home's wiring? Any recent renovations?
- All work must be done by licensed electrician — emphasize safety
- Permit may be required for panel upgrades and rewiring`,
  },
  general_contractor: {
    defaultAgentName: 'Jamie',
    defaultEmergencyKeywords: ['flooding', 'fire', 'structural damage', 'gas leak', 'collapse'],
    defaultServices: [],
    knowledge: `GENERAL KNOWLEDGE:
- We handle a variety of home services and projects
- Always ask: What kind of work do you need? What's the scope? Any timeline or budget in mind?
- We can schedule a free on-site estimate for larger projects
- Licensed and insured`,
  },
  moving_company: {
    defaultAgentName: 'Taylor',
    defaultEmergencyKeywords: [],
    defaultServices: [
      { name: 'Local move (1-2 bedroom)', priceLow: 300, priceHigh: 800, pricingMode: 'range', pricingUnit: 'job' },
      { name: 'Local move (3-4 bedroom)', priceLow: 600, priceHigh: 1500, pricingMode: 'range', pricingUnit: 'job' },
      { name: 'Packing service', priceLow: 200, priceHigh: 600, pricingMode: 'range', pricingUnit: 'job' },
      { name: 'Furniture assembly', priceLow: 100, priceHigh: 300, pricingMode: 'range', pricingUnit: 'job' },
    ],
    knowledge: `MOVING COMPANY KNOWLEDGE:
- Common services: local moves, interstate moves, packing, furniture assembly/disassembly, storage
- Always ask: Moving from where to where? How many bedrooms? Any heavy/specialty items (piano, pool table)? What date? Need packing help?
- Provide hourly rates for local moves, fixed quotes for interstate
- Insurance coverage available for high-value items`,
  },
  landscaping: {
    defaultAgentName: 'Riley',
    defaultEmergencyKeywords: ['fallen tree', 'tree on house', 'flooding', 'storm damage'],
    defaultServices: [
      { name: 'Lawn mowing', priceLow: 40, priceHigh: 120, pricingMode: 'range', pricingUnit: 'visit' },
      { name: 'Garden maintenance', priceLow: 80, priceHigh: 250, pricingMode: 'range', pricingUnit: 'visit' },
      { name: 'Tree trimming', priceLow: 200, priceHigh: 800, pricingMode: 'range', pricingUnit: 'job' },
      { name: 'Landscaping design', priceLow: 500, priceHigh: 3000, pricingMode: 'from', pricingUnit: 'job' },
    ],
    knowledge: `LANDSCAPING KNOWLEDGE:
- Common services: lawn mowing, garden maintenance, tree trimming/removal, landscaping design, irrigation, retaining walls, turf laying
- Always ask: What work is needed? Property size? Any specific plants or features? Regular maintenance or one-off?
- Seasonal work may affect scheduling
- Free on-site quotes for larger projects`,
  },
  pest_control: {
    defaultAgentName: 'Casey',
    defaultEmergencyKeywords: ['snake', 'wasp nest', 'bee swarm', 'termite damage', 'rodent infestation'],
    defaultServices: [
      { name: 'General pest treatment', priceLow: 100, priceHigh: 300, pricingMode: 'range', pricingUnit: 'visit' },
      { name: 'Termite inspection', priceLow: 200, priceHigh: 400, pricingMode: 'fixed', pricingUnit: 'job' },
      { name: 'Rodent control', priceLow: 150, priceHigh: 400, pricingMode: 'range', pricingUnit: 'visit' },
      { name: 'Termite barrier', priceLow: 1500, priceHigh: 4000, pricingMode: 'from', pricingUnit: 'job' },
    ],
    knowledge: `PEST CONTROL KNOWLEDGE:
- Common services: general pest treatment, termite inspection/treatment, rodent control, ant/cockroach treatment, wasp/bee removal, possum removal
- Always ask: What pest? Where are you seeing them? How long has it been an issue? Any children or pets in the home?
- Treatments may require vacating the home temporarily
- Warranty periods vary by treatment type`,
  },
  cleaning: {
    defaultAgentName: 'Avery',
    defaultEmergencyKeywords: ['biohazard', 'sewage', 'mold', 'fire damage'],
    defaultServices: [
      { name: 'Regular house clean', priceLow: 100, priceHigh: 250, pricingMode: 'range', pricingUnit: 'visit' },
      { name: 'Deep clean', priceLow: 200, priceHigh: 500, pricingMode: 'range', pricingUnit: 'visit' },
      { name: 'End of lease clean', priceLow: 250, priceHigh: 600, pricingMode: 'range', pricingUnit: 'job' },
      { name: 'Carpet cleaning', priceLow: 3, priceHigh: 5, pricingMode: 'range', pricingUnit: 'sqm' },
    ],
    knowledge: `CLEANING KNOWLEDGE:
- Common services: regular house cleaning, deep cleaning, end of lease cleaning, carpet/upholstery cleaning, window cleaning, office cleaning
- Always ask: What type of clean? How many bedrooms/bathrooms? Any specific requirements? One-off or regular?
- End of lease cleans can include bond-back guarantee
- We bring all supplies and equipment`,
  },
  roofing: {
    defaultAgentName: 'Blake',
    defaultEmergencyKeywords: ['roof leak', 'storm damage', 'tree on roof', 'missing tiles', 'water coming in'],
    defaultServices: [
      { name: 'Roof inspection', priceLow: 150, priceHigh: 350, pricingMode: 'fixed', pricingUnit: 'job' },
      { name: 'Leak repair', priceLow: 200, priceHigh: 600, pricingMode: 'range', pricingUnit: 'job' },
      { name: 'Tile replacement', priceLow: 300, priceHigh: 800, pricingMode: 'range', pricingUnit: 'job' },
      { name: 'Full roof replacement', priceLow: 5000, priceHigh: 20000, pricingMode: 'from', pricingUnit: 'job' },
      { name: 'Gutter cleaning', priceLow: 100, priceHigh: 300, pricingMode: 'range', pricingUnit: 'visit' },
    ],
    knowledge: `ROOFING KNOWLEDGE:
- Common services: roof inspections, leak repair, tile/shingle replacement, full roof replacement, gutter cleaning/installation, flashing repair
- Emergency services for storm damage and active leaks
- Always ask: What's the issue? How old is the roof? What material? Any visible damage? Is water currently coming in?
- Free inspections and quotes for most jobs
- All work comes with warranty`,
  },
};

/** @deprecated Use INDUSTRY_TEMPLATES instead */
export const VERTICAL_TEMPLATES = INDUSTRY_TEMPLATES;

/**
 * Find the best matching industry template for a given industry string.
 * 1. Exact match
 * 2. Partial match (e.g., "plumber" matches "plumbing")
 * 3. Falls back to "general"
 */
export function findBestTemplate(industry: string): IndustryTemplate {
  const normalized = industry.toLowerCase().replace(/[\s-]/g, '_');

  // general is always defined in the INDUSTRY_TEMPLATES literal above
  const fallback = INDUSTRY_TEMPLATES.general!;

  // Exact match
  const exactMatch = INDUSTRY_TEMPLATES[normalized];
  if (exactMatch) {
    return exactMatch;
  }

  // Partial / fuzzy match
  const keys = Object.keys(INDUSTRY_TEMPLATES);
  for (const key of keys) {
    if (key === 'general') continue;
    if (normalized.includes(key) || key.includes(normalized)) {
      return INDUSTRY_TEMPLATES[key] ?? fallback;
    }
  }

  // Stem-based matching (e.g., "plumber" → "plumbing", "electrician" → "electrical")
  const stemMap: Record<string, string> = {
    plumber: 'plumbing',
    electrician: 'electrical',
    roofer: 'roofing',
    landscaper: 'landscaping',
    cleaner: 'cleaning',
    mover: 'moving_company',
    contractor: 'general_contractor',
    exterminator: 'pest_control',
  };
  for (const [stem, key] of Object.entries(stemMap)) {
    if (normalized.includes(stem)) {
      return INDUSTRY_TEMPLATES[key] ?? fallback;
    }
  }

  return fallback;
}
