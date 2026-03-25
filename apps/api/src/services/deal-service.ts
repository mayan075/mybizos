import {
  db,
  deals,
  pipelines,
  pipelineStages,
  contacts,
  activities,
  withOrgScope,
} from '@mybizos/db';
import { eq, and, desc, asc, count, sum, sql } from 'drizzle-orm';
import { Errors } from '../middleware/error-handler.js';
import { logger } from '../middleware/logger.js';
import { sequenceTriggerService } from './sequence-trigger-service.js';

export const pipelineService = {
  async list(orgId: string) {
    const rows = await db
      .select()
      .from(pipelines)
      .where(withOrgScope(pipelines.orgId, orgId))
      .orderBy(asc(pipelines.createdAt));

    // Attach stages to each pipeline
    const result = await Promise.all(
      rows.map(async (pipeline) => {
        const stages = await db
          .select()
          .from(pipelineStages)
          .where(and(
            withOrgScope(pipelineStages.orgId, orgId),
            eq(pipelineStages.pipelineId, pipeline.id),
          ))
          .orderBy(asc(pipelineStages.position));

        return { ...pipeline, stages };
      }),
    );

    return result;
  },

  async getById(orgId: string, pipelineId: string) {
    const [pipeline] = await db
      .select()
      .from(pipelines)
      .where(and(
        withOrgScope(pipelines.orgId, orgId),
        eq(pipelines.id, pipelineId),
      ));

    if (!pipeline) {
      throw Errors.notFound('Pipeline');
    }

    const stages = await db
      .select()
      .from(pipelineStages)
      .where(and(
        withOrgScope(pipelineStages.orgId, orgId),
        eq(pipelineStages.pipelineId, pipelineId),
      ))
      .orderBy(asc(pipelineStages.position));

    const pipelineDeals = await db
      .select({
        deal: deals,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
      })
      .from(deals)
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .where(and(
        withOrgScope(deals.orgId, orgId),
        eq(deals.pipelineId, pipelineId),
      ))
      .orderBy(desc(deals.createdAt));

    return { pipeline: { ...pipeline, stages }, deals: pipelineDeals };
  },

  async create(
    orgId: string,
    data: {
      name: string;
      stages: Array<{ name: string; color: string; slug: typeof pipelineStages.slug.enumValues[number] }>;
    },
  ) {
    const [created] = await db
      .insert(pipelines)
      .values({
        orgId,
        name: data.name,
      })
      .returning();

    if (!created) {
      throw Errors.internal('Failed to create pipeline');
    }

    if (data.stages.length > 0) {
      await db.insert(pipelineStages).values(
        data.stages.map((s, i) => ({
          pipelineId: created.id,
          orgId,
          name: s.name,
          slug: s.slug,
          position: i,
          color: s.color,
        })),
      );
    }

    const stages = await db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.pipelineId, created.id))
      .orderBy(asc(pipelineStages.position));

    logger.info('Pipeline created', { orgId, pipelineId: created.id });
    return { ...created, stages };
  },

  async update(orgId: string, pipelineId: string, data: { name?: string }) {
    const [updated] = await db
      .update(pipelines)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        withOrgScope(pipelines.orgId, orgId),
        eq(pipelines.id, pipelineId),
      ))
      .returning();

    if (!updated) {
      throw Errors.notFound('Pipeline');
    }

    logger.info('Pipeline updated', { orgId, pipelineId });
    return updated;
  },
};

export const dealService = {
  async list(orgId: string, pipelineId?: string) {
    const conditions = [withOrgScope(deals.orgId, orgId)];

    if (pipelineId) {
      conditions.push(eq(deals.pipelineId, pipelineId));
    }

    const rows = await db
      .select({
        deal: deals,
        stageName: pipelineStages.name,
        stageColor: pipelineStages.color,
        stagePosition: pipelineStages.position,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
      })
      .from(deals)
      .leftJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .where(and(...conditions))
      .orderBy(desc(deals.createdAt));

    return rows;
  },

  async getById(orgId: string, dealId: string) {
    const [result] = await db
      .select({
        deal: deals,
        stageName: pipelineStages.name,
        stageColor: pipelineStages.color,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        contactEmail: contacts.email,
        contactPhone: contacts.phone,
      })
      .from(deals)
      .leftJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .where(and(
        withOrgScope(deals.orgId, orgId),
        eq(deals.id, dealId),
      ));

    if (!result) {
      throw Errors.notFound('Deal');
    }

    return result;
  },

  async create(
    orgId: string,
    data: {
      pipelineId: string;
      stageId: string;
      contactId: string;
      title: string;
      value?: string;
      currency?: string;
      expectedCloseDate?: Date | null;
      assignedTo?: string | null;
      metadata?: Record<string, unknown>;
    },
  ) {
    const [created] = await db
      .insert(deals)
      .values({
        orgId,
        pipelineId: data.pipelineId,
        stageId: data.stageId,
        contactId: data.contactId,
        title: data.title,
        value: data.value ?? '0',
        currency: data.currency ?? 'USD',
        expectedCloseDate: data.expectedCloseDate ?? null,
        assignedTo: data.assignedTo ?? null,
        metadata: data.metadata ?? {},
      })
      .returning();

    if (!created) {
      throw Errors.internal('Failed to create deal');
    }

    // Log activity
    await db.insert(activities).values({
      orgId,
      contactId: data.contactId,
      dealId: created.id,
      type: 'deal_stage_change',
      title: `Deal created: ${data.title}`,
      description: `New deal created with value ${data.value ?? '0'} ${data.currency ?? 'USD'}`,
      metadata: {},
    });

    logger.info('Deal created', { orgId, dealId: created.id });
    return created;
  },

  async update(
    orgId: string,
    dealId: string,
    data: {
      title?: string;
      value?: string;
      currency?: string;
      expectedCloseDate?: Date | null;
      assignedTo?: string | null;
      metadata?: Record<string, unknown>;
      closedAt?: Date | null;
    },
  ) {
    const [updated] = await db
      .update(deals)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        withOrgScope(deals.orgId, orgId),
        eq(deals.id, dealId),
      ))
      .returning();

    if (!updated) {
      throw Errors.notFound('Deal');
    }

    logger.info('Deal updated', { orgId, dealId });
    return updated;
  },

  async moveStage(orgId: string, dealId: string, newStageId: string) {
    // Get current deal to log the change
    const [current] = await db
      .select()
      .from(deals)
      .where(and(
        withOrgScope(deals.orgId, orgId),
        eq(deals.id, dealId),
      ));

    if (!current) {
      throw Errors.notFound('Deal');
    }

    // Verify the new stage exists
    const [newStage] = await db
      .select()
      .from(pipelineStages)
      .where(and(
        withOrgScope(pipelineStages.orgId, orgId),
        eq(pipelineStages.id, newStageId),
      ));

    if (!newStage) {
      throw Errors.notFound('Pipeline stage');
    }

    const [updated] = await db
      .update(deals)
      .set({
        stageId: newStageId,
        updatedAt: new Date(),
        // If the new stage is won/lost, set closedAt
        closedAt: newStage.slug === 'won' || newStage.slug === 'lost'
          ? new Date()
          : null,
      })
      .where(and(
        withOrgScope(deals.orgId, orgId),
        eq(deals.id, dealId),
      ))
      .returning();

    if (!updated) {
      throw Errors.internal('Failed to move deal stage');
    }

    // Log activity for the stage change
    await db.insert(activities).values({
      orgId,
      contactId: current.contactId,
      dealId,
      type: 'deal_stage_change',
      title: `Deal moved to ${newStage.name}`,
      description: `Deal "${current.title}" moved to stage "${newStage.name}"`,
      metadata: {
        previousStageId: current.stageId,
        newStageId,
      },
    });

    logger.info('Deal stage changed', { orgId, dealId, newStageId });

    // Fire sequence trigger (async, non-blocking)
    sequenceTriggerService.onDealStageChanged(orgId, current.contactId, newStage.name).catch(() => {
      // Errors already logged inside the trigger service
    });

    return updated;
  },

  async getPipelineWithDeals(orgId: string, pipelineId: string) {
    const [pipeline] = await db
      .select()
      .from(pipelines)
      .where(and(
        withOrgScope(pipelines.orgId, orgId),
        eq(pipelines.id, pipelineId),
      ));

    if (!pipeline) {
      throw Errors.notFound('Pipeline');
    }

    const stages = await db
      .select()
      .from(pipelineStages)
      .where(and(
        withOrgScope(pipelineStages.orgId, orgId),
        eq(pipelineStages.pipelineId, pipelineId),
      ))
      .orderBy(asc(pipelineStages.position));

    const allDeals = await db
      .select({
        deal: deals,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
      })
      .from(deals)
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .where(and(
        withOrgScope(deals.orgId, orgId),
        eq(deals.pipelineId, pipelineId),
      ))
      .orderBy(desc(deals.createdAt));

    // Group deals by stage
    const stagesWithDeals = stages.map((stage) => ({
      ...stage,
      deals: allDeals.filter((d) => d.deal.stageId === stage.id),
    }));

    return {
      ...pipeline,
      stages: stagesWithDeals,
    };
  },

  async remove(orgId: string, dealId: string) {
    const result = await db
      .delete(deals)
      .where(and(
        withOrgScope(deals.orgId, orgId),
        eq(deals.id, dealId),
      ))
      .returning({ id: deals.id });

    if (result.length === 0) {
      throw Errors.notFound('Deal');
    }

    logger.info('Deal deleted', { orgId, dealId });
  },
};
