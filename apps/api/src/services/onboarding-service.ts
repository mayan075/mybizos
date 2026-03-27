import { logger } from '../middleware/logger.js';

interface BusinessHoursEntry {
  open: boolean;
  start: string;
  end: string;
}

interface OnboardingData {
  businessName?: string;
  vertical?: string;
  role?: string;
  country?: string;
  city?: string;
  serviceArea?: string;
  timezone?: string;
  services?: Array<{ name: string; enabled: boolean }>;
  hours?: Record<string, BusinessHoursEntry>;
  aiGreeting?: string;
  transferEmergency?: boolean;
  transferHuman?: boolean;
  transferHighValue?: boolean;
  personalPhone?: string;
  phoneMode?: string;
  phoneCountry?: string;
  numberType?: string;
  existingNumber?: string;
}

const DAY_MAP: Record<string, string> = {
  monday: 'monday',
  tuesday: 'tuesday',
  wednesday: 'wednesday',
  thursday: 'thursday',
  friday: 'friday',
  saturday: 'saturday',
  sunday: 'sunday',
};

const DEFAULT_STAGES = [
  { name: 'New Lead', slug: 'new_lead', position: 0, color: '#3b82f6' },
  { name: 'Contacted', slug: 'contacted', position: 1, color: '#8b5cf6' },
  { name: 'Qualified', slug: 'qualified', position: 2, color: '#f59e0b' },
  { name: 'Quote Sent', slug: 'quote_sent', position: 3, color: '#f97316' },
  { name: 'Scheduled', slug: 'scheduled', position: 4, color: '#6366f1' },
  { name: 'Won', slug: 'won', position: 5, color: '#22c55e' },
  { name: 'Lost', slug: 'lost', position: 6, color: '#ef4444' },
];

/**
 * Process onboarding data into real system configuration.
 * Creates default pipeline, availability rules, and stores AI settings.
 */
export async function processOnboardingData(
  orgId: string,
  data: OnboardingData,
): Promise<void> {
  const {
    db,
    organizations,
    orgMembers,
    pipelines,
    pipelineStages,
    availabilityRules,
  } = await import('@mybizos/db');
  const { eq, and } = await import('drizzle-orm');

  // 1. Update org name and vertical if provided
  if (data.businessName || data.vertical) {
    const updateFields: Record<string, unknown> = { updatedAt: new Date() };
    if (data.businessName) updateFields['name'] = data.businessName;
    if (data.vertical) updateFields['vertical'] = data.vertical;

    await db
      .update(organizations)
      .set(updateFields)
      .where(eq(organizations.id, orgId));

    logger.info('Org updated from onboarding', { orgId, name: data.businessName, vertical: data.vertical });
  }

  // 2. Create default pipeline if none exists
  try {
    const existingPipelines = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.orgId, orgId))
      .limit(1);

    if (existingPipelines.length === 0) {
      const [newPipeline] = await db
        .insert(pipelines)
        .values({
          orgId,
          name: 'Sales Pipeline',
          isDefault: true,
        })
        .returning();

      if (newPipeline) {
        // Create default stages
        await db.insert(pipelineStages).values(
          DEFAULT_STAGES.map((stage) => ({
            pipelineId: newPipeline.id,
            orgId,
            name: stage.name,
            slug: stage.slug,
            position: stage.position,
            color: stage.color,
          })),
        );
        logger.info('Default pipeline created', { orgId, pipelineId: newPipeline.id });
      }
    }
  } catch (err) {
    logger.warn('Failed to create default pipeline', {
      orgId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 3. Create availability rules from business hours
  if (data.hours) {
    try {
      // Get org owner's userId for availability rules
      const [owner] = await db
        .select()
        .from(orgMembers)
        .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.role, 'owner')))
        .limit(1);

      if (owner) {
        // Delete existing availability rules for this org to avoid duplicates
        await db
          .delete(availabilityRules)
          .where(eq(availabilityRules.orgId, orgId));

        const rulesToInsert = Object.entries(data.hours)
          .filter(([, entry]) => entry.open && entry.start && entry.end)
          .map(([day, entry]) => ({
            orgId,
            userId: owner.userId,
            dayOfWeek: DAY_MAP[day] as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
            startTime: entry.start,
            endTime: entry.end,
            isActive: true,
          }));

        if (rulesToInsert.length > 0) {
          await db.insert(availabilityRules).values(rulesToInsert);
          logger.info('Availability rules created from onboarding', {
            orgId,
            days: rulesToInsert.length,
          });
        }
      }
    } catch (err) {
      logger.warn('Failed to create availability rules', {
        orgId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  logger.info('Onboarding data processed', { orgId, businessName: data.businessName });
}
