import {
  db,
  dripSequences,
  sequenceEnrollments,
  withOrgScope,
  type SequenceTriggerConfig,
} from '@mybizos/db';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '../middleware/logger.js';

/**
 * Sequence Trigger Service
 *
 * Auto-enrolls contacts in drip sequences when certain events occur.
 * Called from contact-service, deal-service, and scheduling-service
 * after relevant mutations.
 */
export const sequenceTriggerService = {
  /**
   * Find active sequences matching the given trigger type and optional
   * trigger config predicate. Enroll the contact in each matching sequence.
   */
  async _enrollInMatchingSequences(
    orgId: string,
    contactId: string,
    triggerType: string,
    matchConfig?: (config: SequenceTriggerConfig) => boolean,
  ): Promise<number> {
    // Find active sequences with this trigger type
    const sequences = await db
      .select()
      .from(dripSequences)
      .where(and(
        withOrgScope(dripSequences.orgId, orgId),
        eq(dripSequences.isActive, true),
        eq(dripSequences.triggerType, triggerType as typeof dripSequences.triggerType.enumValues[number]),
      ));

    let enrolled = 0;

    for (const sequence of sequences) {
      // If a config matcher is provided, check it
      if (matchConfig && !matchConfig(sequence.triggerConfig)) {
        continue;
      }

      // Check if the contact is already enrolled (active or paused)
      const [existing] = await db
        .select({ id: sequenceEnrollments.id })
        .from(sequenceEnrollments)
        .where(and(
          eq(sequenceEnrollments.sequenceId, sequence.id),
          eq(sequenceEnrollments.contactId, contactId),
          sql`${sequenceEnrollments.status} IN ('active', 'paused')`,
        ));

      if (existing) {
        logger.debug('Contact already enrolled in sequence, skipping', {
          orgId,
          contactId,
          sequenceId: sequence.id,
        });
        continue;
      }

      // Determine initial nextStepAt
      let nextStepAt: Date = new Date();
      const firstStep = sequence.steps[0];
      if (firstStep && firstStep.type === 'wait') {
        const waitConfig = firstStep.config as { delay_hours: number };
        nextStepAt = new Date(Date.now() + waitConfig.delay_hours * 60 * 60 * 1000);
      }

      try {
        await db
          .insert(sequenceEnrollments)
          .values({
            sequenceId: sequence.id,
            contactId,
            orgId,
            currentStep: 0,
            status: 'active',
            nextStepAt,
          });

        // Increment enrollment count on the sequence
        await db
          .update(dripSequences)
          .set({
            enrollmentCount: sql`${dripSequences.enrollmentCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(dripSequences.id, sequence.id));

        enrolled++;
        logger.info('Contact auto-enrolled in sequence', {
          orgId,
          contactId,
          sequenceId: sequence.id,
          triggerType,
        });
      } catch (err) {
        logger.error('Failed to auto-enroll contact in sequence', {
          orgId,
          contactId,
          sequenceId: sequence.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return enrolled;
  },

  /**
   * Called after a new contact is created.
   * Enrolls the contact in any active sequences with trigger_type = 'contact_created'.
   */
  async onContactCreated(orgId: string, contactId: string): Promise<void> {
    try {
      const enrolled = await this._enrollInMatchingSequences(
        orgId,
        contactId,
        'contact_created',
      );
      if (enrolled > 0) {
        logger.info('onContactCreated: enrolled contact in sequences', {
          orgId,
          contactId,
          count: enrolled,
        });
      }
    } catch (err) {
      // Never let trigger failures break the parent operation
      logger.error('onContactCreated trigger failed', {
        orgId,
        contactId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  /**
   * Called after a tag is added to a contact.
   * Enrolls the contact in any active sequences with trigger_type = 'tag_added'
   * where trigger_config.tag matches.
   */
  async onTagAdded(orgId: string, contactId: string, tag: string): Promise<void> {
    try {
      const enrolled = await this._enrollInMatchingSequences(
        orgId,
        contactId,
        'tag_added',
        (config) => config.tag === tag,
      );
      if (enrolled > 0) {
        logger.info('onTagAdded: enrolled contact in sequences', {
          orgId,
          contactId,
          tag,
          count: enrolled,
        });
      }
    } catch (err) {
      logger.error('onTagAdded trigger failed', {
        orgId,
        contactId,
        tag,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  /**
   * Called after a deal moves to a new stage.
   * Enrolls the contact in any active sequences with trigger_type = 'deal_stage_changed'
   * where trigger_config.stage matches.
   */
  async onDealStageChanged(
    orgId: string,
    contactId: string,
    newStage: string,
  ): Promise<void> {
    try {
      const enrolled = await this._enrollInMatchingSequences(
        orgId,
        contactId,
        'deal_stage_changed',
        (config) => config.stage === newStage,
      );
      if (enrolled > 0) {
        logger.info('onDealStageChanged: enrolled contact in sequences', {
          orgId,
          contactId,
          newStage,
          count: enrolled,
        });
      }
    } catch (err) {
      logger.error('onDealStageChanged trigger failed', {
        orgId,
        contactId,
        newStage,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  /**
   * Called after an appointment is marked as completed.
   * Enrolls the contact in any active sequences with trigger_type = 'appointment_completed'.
   */
  async onAppointmentCompleted(orgId: string, contactId: string): Promise<void> {
    try {
      const enrolled = await this._enrollInMatchingSequences(
        orgId,
        contactId,
        'appointment_completed',
      );
      if (enrolled > 0) {
        logger.info('onAppointmentCompleted: enrolled contact in sequences', {
          orgId,
          contactId,
          count: enrolled,
        });
      }
    } catch (err) {
      logger.error('onAppointmentCompleted trigger failed', {
        orgId,
        contactId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
};
