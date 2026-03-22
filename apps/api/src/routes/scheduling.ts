import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { orgScopeMiddleware } from '../middleware/org-scope.js';
import { schedulingService } from '../services/scheduling-service.js';

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
  const orgId = c.get('orgId');
  const appointments = await schedulingService.listAppointments(orgId);
  return c.json({ data: appointments });
});

/**
 * POST /orgs/:orgId/appointments — create an appointment
 */
authenticatedScheduling.post('/appointments', async (c) => {
  const orgId = c.get('orgId');
  const body = await c.req.json();
  const parsed = createAppointmentSchema.parse(body);

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

  return c.json({ data: appointment }, 201);
});

/**
 * PATCH /orgs/:orgId/appointments/:id — update appointment (reschedule, cancel, complete)
 */
authenticatedScheduling.patch('/appointments/:id', async (c) => {
  const orgId = c.get('orgId');
  const appointmentId = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateAppointmentSchema.parse(body);

  const appointment = await schedulingService.updateAppointment(orgId, appointmentId, {
    ...parsed,
    startTime: parsed.startTime ? new Date(parsed.startTime) : undefined,
    endTime: parsed.endTime ? new Date(parsed.endTime) : undefined,
  });
  return c.json({ data: appointment });
});

/**
 * GET /orgs/:orgId/availability — get availability slots for a date
 */
authenticatedScheduling.get('/availability', async (c) => {
  const orgId = c.get('orgId');
  const query = availabilityQuerySchema.parse({
    date: c.req.query('date'),
    userId: c.req.query('userId'),
  });

  const userId = query.userId ?? '';
  const slots = await schedulingService.getAvailability(orgId, userId, query.date);
  return c.json({ data: slots });
});

// ── Public booking route (no auth) ──

/**
 * POST /public/book/:orgSlug — public booking endpoint
 */
scheduling.post('/public/book/:orgSlug', async (c) => {
  const orgSlug = c.req.param('orgSlug');
  const body = await c.req.json();
  const parsed = publicBookingSchema.parse(body);

  const appointment = await schedulingService.publicBook(orgSlug, parsed);
  return c.json({ data: appointment }, 201);
});

// Mount authenticated routes under /orgs/:orgId
scheduling.route('/orgs/:orgId', authenticatedScheduling);

export { scheduling as schedulingRoutes };
