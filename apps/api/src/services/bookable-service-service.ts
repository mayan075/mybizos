import {
  db,
  bookableServices,
  serviceTeamMembers,
  users,
  withOrgScope,
} from '@hararai/db';
import { eq, and, asc } from 'drizzle-orm';
import { Errors } from '../middleware/error-handler.js';
import { logger } from '../middleware/logger.js';

export const bookableServiceService = {
  async list(orgId: string) {
    const rows = await db
      .select()
      .from(bookableServices)
      .where(withOrgScope(bookableServices.orgId, orgId))
      .orderBy(asc(bookableServices.name));

    return rows;
  },

  async getWithTeamMembers(orgId: string, serviceId: string) {
    const [service] = await db
      .select()
      .from(bookableServices)
      .where(and(
        withOrgScope(bookableServices.orgId, orgId),
        eq(bookableServices.id, serviceId),
      ));

    if (!service) {
      throw Errors.notFound('BookableService');
    }

    const members = await db
      .select({
        id: serviceTeamMembers.id,
        userId: serviceTeamMembers.userId,
        userName: users.name,
        userEmail: users.email,
        createdAt: serviceTeamMembers.createdAt,
      })
      .from(serviceTeamMembers)
      .leftJoin(users, eq(serviceTeamMembers.userId, users.id))
      .where(and(
        withOrgScope(serviceTeamMembers.orgId, orgId),
        eq(serviceTeamMembers.serviceId, serviceId),
      ));

    return { ...service, teamMembers: members };
  },

  async create(
    orgId: string,
    data: {
      name: string;
      description?: string | null;
      durationMinutes?: number;
      bufferMinutes?: number;
      qualifyingQuestions?: unknown[];
      isActive?: boolean;
    },
  ) {
    const [created] = await db
      .insert(bookableServices)
      .values({
        orgId,
        name: data.name,
        description: data.description ?? null,
        durationMinutes: data.durationMinutes ?? 60,
        bufferMinutes: data.bufferMinutes ?? 0,
        qualifyingQuestions: data.qualifyingQuestions ?? [],
        isActive: data.isActive ?? true,
      })
      .returning();

    if (!created) {
      throw Errors.internal('Failed to create bookable service');
    }

    logger.info('Bookable service created', { orgId, serviceId: created.id });
    return created;
  },

  async update(
    orgId: string,
    serviceId: string,
    data: {
      name?: string;
      description?: string | null;
      durationMinutes?: number;
      bufferMinutes?: number;
      qualifyingQuestions?: unknown[];
      isActive?: boolean;
    },
  ) {
    const [updated] = await db
      .update(bookableServices)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        withOrgScope(bookableServices.orgId, orgId),
        eq(bookableServices.id, serviceId),
      ))
      .returning();

    if (!updated) {
      throw Errors.notFound('BookableService');
    }

    logger.info('Bookable service updated', { orgId, serviceId });
    return updated;
  },

  async remove(orgId: string, serviceId: string) {
    const [deleted] = await db
      .delete(bookableServices)
      .where(and(
        withOrgScope(bookableServices.orgId, orgId),
        eq(bookableServices.id, serviceId),
      ))
      .returning();

    if (!deleted) {
      throw Errors.notFound('BookableService');
    }

    logger.info('Bookable service deleted', { orgId, serviceId });
    return deleted;
  },

  async addTeamMember(orgId: string, serviceId: string, userId: string) {
    // Verify service exists within org
    const [service] = await db
      .select({ id: bookableServices.id })
      .from(bookableServices)
      .where(and(
        withOrgScope(bookableServices.orgId, orgId),
        eq(bookableServices.id, serviceId),
      ));

    if (!service) {
      throw Errors.notFound('BookableService');
    }

    const [member] = await db
      .insert(serviceTeamMembers)
      .values({
        orgId,
        serviceId,
        userId,
      })
      .onConflictDoNothing()
      .returning();

    logger.info('Team member added to bookable service', { orgId, serviceId, userId });
    return member ?? null;
  },

  async removeTeamMember(orgId: string, serviceId: string, userId: string) {
    const [deleted] = await db
      .delete(serviceTeamMembers)
      .where(and(
        withOrgScope(serviceTeamMembers.orgId, orgId),
        eq(serviceTeamMembers.serviceId, serviceId),
        eq(serviceTeamMembers.userId, userId),
      ))
      .returning();

    if (!deleted) {
      throw Errors.notFound('ServiceTeamMember');
    }

    logger.info('Team member removed from bookable service', { orgId, serviceId, userId });
    return deleted;
  },
};
