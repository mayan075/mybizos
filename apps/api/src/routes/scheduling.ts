import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { getMockAppointments, getMockAvailability, getFrontendAppointments } from '../services/mock-service.js';
import { logger } from '../middleware/logger.js';

const scheduling = new Hono();

// ── Validation Schemas ──

const createAppointmentSchema = z.object({
  contactId: z.string().min(1, 'Contact ID is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  title: z.string().min(1, 'Appointment title is required'),
  description: z.string().default(''),
  startTime: z.string().datetime({ message: 'Start time must be a valid ISO 8601 datetime' }),
  endTime: z.string().datetime({ message: 'End time must be a valid ISO 8601 datetime' }),
  assignedTo: z.string().nullable().optional().default(null),
  location: z.string().default(''),
  bookedBy: z.enum(['ai_phone', 'ai_sms', 'manual', 'public_booking']).default('manual'),
});

const updateAppointmentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']).optional(),
  assignedTo: z.string().nullable().optional(),
  location: z.string().optional(),
});

const publicBookingSchema = z.object({
  contactName: z.string().min(1, 'Name is required'),
  contactEmail: z.string().email('Valid email is required'),
  contactPhone: z.string().min(1, 'Phone number is required'),
  title: z.string().min(1, 'Service type is required'),
  startTime: z.string().datetime({ message: 'Start time must be a valid ISO 8601 datetime' }),
  endTime: z.string().datetime({ message: 'End time must be a valid ISO 8601 datetime' }),
});

const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  userId: z.string().optional(),
});

// ── Authenticated routes ──

const authenticatedScheduling = new Hono();
authenticatedScheduling.use('*', authMiddleware, orgScopeMiddleware);

/**
 * GET /orgs/:orgId/appointments — list appointments
 */
authenticatedScheduling.get('/appointments', async (c) => {
  try {
    const { schedulingService } = await import('../services/scheduling-service.js');
    const orgId = c.get('orgId');
    const appointments = await schedulingService.listAppointments(orgId);
    logger.info('Appointments list served from REAL DATABASE', { orgId, count: appointments.length });
    return c.json({ data: appointments, _source: 'database' });
  } catch (err) {
    logger.warn('DB unavailable for appointments list, using MOCK data', {
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json({ data: getFrontendAppointments(), _source: 'mock' });
  }
});

authenticatedScheduling.post('/appointments', async (c) => {
  const body = await c.req.json();
  const parsed = createAppointmentSchema.parse(body);
  try {
    const { schedulingService } = await import('../services/scheduling-service.js');
    const orgId = c.get('orgId');
    const appointment = await schedulingService.createAppointment(orgId, {
      contactId: parsed.contactId,
      title: parsed.title,
      description: parsed.description,
      startTime: new Date(parsed.startTime),
      endTime: new Date(parsed.endTime),
      assignedTo: parsed.assignedTo,
      location: parsed.location,
      status: 'scheduled',
    });
    logger.info('Appointment created in REAL DATABASE', { orgId, appointmentId: appointment.id });
    return c.json({ data: appointment }, 201);
  } catch (err) {
    logger.warn('DB unavailable for appointment create, returning MOCK', {
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json({ data: { id: `apt_${Date.now()}`, ...parsed, status: 'scheduled', createdAt: new Date().toISOString() } }, 201);
  }
});

authenticatedScheduling.patch('/appointments/:id', async (c) => {
  const appointmentId = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateAppointmentSchema.parse(body);
  try {
    const { schedulingService } = await import('../services/scheduling-service.js');
    const orgId = c.get('orgId');
    const appointment = await schedulingService.updateAppointment(orgId, appointmentId, {
      ...parsed,
      startTime: parsed.startTime ? new Date(parsed.startTime) : undefined,
      endTime: parsed.endTime ? new Date(parsed.endTime) : undefined,
    });
    return c.json({ data: appointment });
  } catch {
    logger.warn('DB unavailable for appointment update, returning mock');
    return c.json({ data: { id: appointmentId, ...parsed, updatedAt: new Date().toISOString() } });
  }
});

authenticatedScheduling.get('/availability', async (c) => {
  const query = availabilityQuerySchema.parse({
    date: c.req.query('date'),
    userId: c.req.query('userId'),
  });
  try {
    const { schedulingService } = await import('../services/scheduling-service.js');
    const orgId = c.get('orgId');
    const userId = query.userId ?? '';
    const slots = await schedulingService.getAvailability(orgId, userId, query.date);
    return c.json({ data: slots });
  } catch {
    logger.warn('DB unavailable for availability, using mock data');
    return c.json({ data: getMockAvailability(query.date) });
  }
});

scheduling.post('/public/book/:orgSlug', async (c) => {
  const orgSlug = c.req.param('orgSlug');
  const body = await c.req.json();
  const parsed = publicBookingSchema.parse(body);
  try {
    const { schedulingService } = await import('../services/scheduling-service.js');
    const appointment = await schedulingService.publicBook(orgSlug, parsed);
    return c.json({ data: appointment }, 201);
  } catch {
    logger.warn('DB unavailable for public booking, returning mock');
    return c.json({ data: { id: `apt_${Date.now()}`, orgSlug, ...parsed, status: 'scheduled', createdAt: new Date().toISOString() } }, 201);
  }
});

// Mount authenticated routes under /orgs/:orgId
scheduling.route('/orgs/:orgId', authenticatedScheduling);

export { scheduling as schedulingRoutes };
