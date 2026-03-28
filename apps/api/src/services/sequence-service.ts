import {
  db,
  dripSequences,
  sequenceEnrollments,
  contacts,
  withOrgScope,
  type SequenceStep,
  type SequenceTriggerConfig,
} from '@mybizos/db';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { Errors } from '../middleware/error-handler.js';
import { logger } from '../middleware/logger.js';

export const sequenceService = {
  /**
   * List all drip sequences for an organization.
   */
  async list(orgId: string) {
    const rows = await db
      .select()
      .from(dripSequences)
      .where(withOrgScope(dripSequences.orgId, orgId))
      .orderBy(desc(dripSequences.createdAt));

    return rows;
  },

  /**
   * Get a single sequence by ID.
   */
  async getById(orgId: string, sequenceId: string) {
    const [sequence] = await db
      .select()
      .from(dripSequences)
      .where(and(
        withOrgScope(dripSequences.orgId, orgId),
        eq(dripSequences.id, sequenceId),
      ));

    if (!sequence) {
      throw Errors.notFound('Sequence');
    }

    return sequence;
  },

  /**
   * Create a new drip sequence.
   */
  async create(
    orgId: string,
    data: {
      name: string;
      description?: string | null;
      triggerType?: typeof dripSequences.triggerType.enumValues[number];
      triggerConfig?: SequenceTriggerConfig;
      steps?: SequenceStep[];
    },
  ) {
    const [created] = await db
      .insert(dripSequences)
      .values({
        orgId,
        name: data.name,
        description: data.description ?? null,
        triggerType: data.triggerType ?? 'manual',
        triggerConfig: data.triggerConfig ?? {},
        steps: data.steps ?? [],
        isActive: false,
        enrollmentCount: 0,
      })
      .returning();

    if (!created) {
      throw Errors.internal('Failed to create sequence');
    }

    logger.info('Sequence created', { orgId, sequenceId: created.id });
    return created;
  },

  /**
   * Update an existing sequence.
   */
  async update(
    orgId: string,
    sequenceId: string,
    data: {
      name?: string;
      description?: string | null;
      triggerType?: typeof dripSequences.triggerType.enumValues[number];
      triggerConfig?: SequenceTriggerConfig;
      steps?: SequenceStep[];
    },
  ) {
    const [updated] = await db
      .update(dripSequences)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        withOrgScope(dripSequences.orgId, orgId),
        eq(dripSequences.id, sequenceId),
      ))
      .returning();

    if (!updated) {
      throw Errors.notFound('Sequence');
    }

    logger.info('Sequence updated', { orgId, sequenceId });
    return updated;
  },

  /**
   * Delete a sequence and all its enrollments.
   */
  async delete(orgId: string, sequenceId: string) {
    const result = await db
      .delete(dripSequences)
      .where(and(
        withOrgScope(dripSequences.orgId, orgId),
        eq(dripSequences.id, sequenceId),
      ))
      .returning({ id: dripSequences.id });

    if (result.length === 0) {
      throw Errors.notFound('Sequence');
    }

    logger.info('Sequence deleted', { orgId, sequenceId });
  },

  /**
   * Activate a sequence so it can accept enrollments and process steps.
   */
  async activate(orgId: string, sequenceId: string) {
    const sequence = await this.getById(orgId, sequenceId);

    if (sequence.steps.length === 0) {
      throw Errors.badRequest('Cannot activate a sequence with no steps');
    }

    const [updated] = await db
      .update(dripSequences)
      .set({ isActive: true, updatedAt: new Date() })
      .where(and(
        withOrgScope(dripSequences.orgId, orgId),
        eq(dripSequences.id, sequenceId),
      ))
      .returning();

    if (!updated) {
      throw Errors.notFound('Sequence');
    }

    logger.info('Sequence activated', { orgId, sequenceId });
    return updated;
  },

  /**
   * Deactivate a sequence. Active enrollments remain but no new steps will process.
   */
  async deactivate(orgId: string, sequenceId: string) {
    const [updated] = await db
      .update(dripSequences)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(
        withOrgScope(dripSequences.orgId, orgId),
        eq(dripSequences.id, sequenceId),
      ))
      .returning();

    if (!updated) {
      throw Errors.notFound('Sequence');
    }

    logger.info('Sequence deactivated', { orgId, sequenceId });
    return updated;
  },

  /**
   * Enroll a contact in a sequence.
   */
  async enroll(orgId: string, sequenceId: string, contactId: string) {
    // Verify sequence exists and is active
    const sequence = await this.getById(orgId, sequenceId);
    if (!sequence.isActive) {
      throw Errors.badRequest('Cannot enroll in an inactive sequence');
    }

    // Check if contact is already enrolled (active or paused)
    const [existing] = await db
      .select()
      .from(sequenceEnrollments)
      .where(and(
        withOrgScope(sequenceEnrollments.orgId, orgId),
        eq(sequenceEnrollments.sequenceId, sequenceId),
        eq(sequenceEnrollments.contactId, contactId),
        sql`${sequenceEnrollments.status} IN ('active', 'paused')`,
      ));

    if (existing) {
      throw Errors.conflict('Contact is already enrolled in this sequence');
    }

    // Determine the first step's wait time if applicable
    let nextStepAt: Date | null = new Date();
    const firstStep = sequence.steps[0];
    if (firstStep && firstStep.type === 'wait') {
      const waitConfig = firstStep.config as { delay_hours: number };
      nextStepAt = new Date(Date.now() + waitConfig.delay_hours * 60 * 60 * 1000);
    }

    const [enrollment] = await db
      .insert(sequenceEnrollments)
      .values({
        sequenceId,
        contactId,
        orgId,
        currentStep: 0,
        status: 'active',
        nextStepAt,
      })
      .returning();

    if (!enrollment) {
      throw Errors.internal('Failed to enroll contact');
    }

    // Increment enrollment count
    await db
      .update(dripSequences)
      .set({
        enrollmentCount: sql`${dripSequences.enrollmentCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(dripSequences.id, sequenceId));

    logger.info('Contact enrolled in sequence', { orgId, sequenceId, contactId });
    return enrollment;
  },

  /**
   * Cancel a specific enrollment by its ID.
   */
  async cancelEnrollment(orgId: string, sequenceId: string, enrollmentId: string) {
    const [updated] = await db
      .update(sequenceEnrollments)
      .set({
        status: 'cancelled',
        completedAt: new Date(),
      })
      .where(and(
        withOrgScope(sequenceEnrollments.orgId, orgId),
        eq(sequenceEnrollments.sequenceId, sequenceId),
        eq(sequenceEnrollments.id, enrollmentId),
        eq(sequenceEnrollments.status, 'active'),
      ))
      .returning();

    if (!updated) {
      throw Errors.notFound('Active enrollment');
    }

    // Decrement enrollment count
    await db
      .update(dripSequences)
      .set({
        enrollmentCount: sql`GREATEST(${dripSequences.enrollmentCount} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(dripSequences.id, sequenceId));

    logger.info('Enrollment cancelled', { orgId, sequenceId, enrollmentId });
    return updated;
  },

  /**
   * Unenroll a contact from a sequence (cancel their enrollment).
   */
  async unenroll(orgId: string, sequenceId: string, contactId: string) {
    const [updated] = await db
      .update(sequenceEnrollments)
      .set({
        status: 'cancelled',
        completedAt: new Date(),
      })
      .where(and(
        withOrgScope(sequenceEnrollments.orgId, orgId),
        eq(sequenceEnrollments.sequenceId, sequenceId),
        eq(sequenceEnrollments.contactId, contactId),
        eq(sequenceEnrollments.status, 'active'),
      ))
      .returning();

    if (!updated) {
      throw Errors.notFound('Active enrollment');
    }

    // Decrement enrollment count
    await db
      .update(dripSequences)
      .set({
        enrollmentCount: sql`GREATEST(${dripSequences.enrollmentCount} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(dripSequences.id, sequenceId));

    logger.info('Contact unenrolled from sequence', { orgId, sequenceId, contactId });
    return updated;
  },

  /**
   * Process the next step for an enrollment. Called by a BullMQ worker.
   */
  async processNextStep(orgId: string, enrollmentId: string) {
    const [enrollment] = await db
      .select()
      .from(sequenceEnrollments)
      .where(and(
        withOrgScope(sequenceEnrollments.orgId, orgId),
        eq(sequenceEnrollments.id, enrollmentId),
        eq(sequenceEnrollments.status, 'active'),
      ));

    if (!enrollment) {
      throw Errors.notFound('Active enrollment');
    }

    const sequence = await this.getById(orgId, enrollment.sequenceId);
    const step = sequence.steps[enrollment.currentStep];

    if (!step) {
      // No more steps — mark as completed
      await db
        .update(sequenceEnrollments)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(sequenceEnrollments.id, enrollmentId));

      logger.info('Enrollment completed', { orgId, enrollmentId });
      return { status: 'completed' as const };
    }

    // Execute the step based on type
    // In production, these would call the actual email/sms/tag services.
    // For now, we log and advance.
    logger.info('Processing sequence step', {
      orgId,
      enrollmentId,
      step: enrollment.currentStep,
      type: step.type,
    });

    const nextStepIndex = enrollment.currentStep + 1;
    const nextStep = sequence.steps[nextStepIndex];

    let nextStepAt: Date | null = null;
    if (nextStep) {
      if (nextStep.type === 'wait') {
        const waitConfig = nextStep.config as { delay_hours: number };
        nextStepAt = new Date(Date.now() + waitConfig.delay_hours * 60 * 60 * 1000);
      } else {
        // Process immediately
        nextStepAt = new Date();
      }
    }

    if (nextStep) {
      await db
        .update(sequenceEnrollments)
        .set({
          currentStep: nextStepIndex,
          nextStepAt,
        })
        .where(eq(sequenceEnrollments.id, enrollmentId));
    } else {
      // Final step — mark as completed
      await db
        .update(sequenceEnrollments)
        .set({
          currentStep: nextStepIndex,
          status: 'completed',
          completedAt: new Date(),
          nextStepAt: null,
        })
        .where(eq(sequenceEnrollments.id, enrollmentId));
    }

    return { status: 'processed' as const, stepType: step.type, nextStepAt };
  },

  /**
   * List enrollments for a sequence with contact info.
   */
  async getEnrollments(orgId: string, sequenceId: string) {
    const rows = await db
      .select({
        enrollment: sequenceEnrollments,
        contact: {
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          email: contacts.email,
          phone: contacts.phone,
        },
      })
      .from(sequenceEnrollments)
      .innerJoin(contacts, eq(sequenceEnrollments.contactId, contacts.id))
      .where(and(
        withOrgScope(sequenceEnrollments.orgId, orgId),
        eq(sequenceEnrollments.sequenceId, sequenceId),
      ))
      .orderBy(desc(sequenceEnrollments.enrolledAt));

    return rows;
  },
};
