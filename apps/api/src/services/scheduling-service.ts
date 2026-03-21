import { withOrgScope } from '../middleware/org-scope.js';
import { Errors } from '../middleware/error-handler.js';
import { logger } from '../middleware/logger.js';

export interface Appointment {
  id: string;
  orgId: string;
  contactId: string;
  contactName: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  assignedTo: string | null;
  location: string;
  bookedBy: 'ai_phone' | 'ai_sms' | 'manual' | 'public_booking';
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilitySlot {
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

// ── Mock data ──
const mockAppointments: Appointment[] = [
  {
    id: 'apt_01',
    orgId: 'org_01',
    contactId: 'cnt_01',
    contactName: 'Sarah Johnson',
    title: 'Furnace Inspection',
    description: 'Customer reports furnace making unusual noise. Check heat exchanger and blower motor.',
    startTime: '2026-03-22T09:00:00Z',
    endTime: '2026-03-22T10:30:00Z',
    status: 'confirmed',
    assignedTo: null,
    location: '123 Oak Street, Springfield',
    bookedBy: 'ai_phone',
    createdAt: '2026-03-15T14:35:00Z',
    updatedAt: '2026-03-15T14:35:00Z',
  },
  {
    id: 'apt_02',
    orgId: 'org_01',
    contactId: 'cnt_02',
    contactName: 'Michael Chen',
    title: 'Commercial Plumbing Inspection',
    description: 'Quarterly plumbing inspection for office building.',
    startTime: '2026-03-25T13:00:00Z',
    endTime: '2026-03-25T15:00:00Z',
    status: 'scheduled',
    assignedTo: null,
    location: '456 Business Blvd, Suite 200',
    bookedBy: 'manual',
    createdAt: '2026-03-10T08:00:00Z',
    updatedAt: '2026-03-10T08:00:00Z',
  },
];

// Mock org data for public booking
const mockOrgs: Record<string, { id: string; slug: string; name: string; timezone: string }> = {
  'acme-hvac': { id: 'org_01', slug: 'acme-hvac', name: 'Acme HVAC & Plumbing', timezone: 'America/Chicago' },
};

export const schedulingService = {
  async listAppointments(orgId: string): Promise<Appointment[]> {
    const scope = withOrgScope(orgId);
    return mockAppointments
      .filter((a) => a.orgId === scope.orgId)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  },

  async createAppointment(
    orgId: string,
    data: Omit<Appointment, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>,
  ): Promise<Appointment> {
    const scope = withOrgScope(orgId);
    const now = new Date().toISOString();

    const appointment: Appointment = {
      id: `apt_${Date.now()}`,
      orgId: scope.orgId,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    mockAppointments.push(appointment);
    logger.info('Appointment created', { orgId, appointmentId: appointment.id, bookedBy: data.bookedBy });
    return appointment;
  },

  async updateAppointment(
    orgId: string,
    appointmentId: string,
    data: Partial<Pick<Appointment, 'title' | 'description' | 'startTime' | 'endTime' | 'status' | 'assignedTo' | 'location'>>,
  ): Promise<Appointment> {
    const scope = withOrgScope(orgId);
    const idx = mockAppointments.findIndex((a) => a.id === appointmentId && a.orgId === scope.orgId);

    if (idx === -1) {
      throw Errors.notFound('Appointment');
    }

    const existing = mockAppointments[idx] as Appointment;
    const updated: Appointment = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    mockAppointments[idx] = updated;

    logger.info('Appointment updated', { orgId, appointmentId, status: updated.status });
    return updated;
  },

  async getAvailability(orgId: string, date: string): Promise<AvailabilitySlot[]> {
    withOrgScope(orgId);

    // Generate mock availability slots for the given date (8 AM to 5 PM, 90-min blocks)
    const slots: AvailabilitySlot[] = [];
    const hours = [8, 9.5, 11, 12.5, 14, 15.5];

    for (const hour of hours) {
      const h = Math.floor(hour);
      const m = (hour % 1) * 60;
      const startTime = `${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
      const endH = Math.floor(hour + 1.5);
      const endM = ((hour + 1.5) % 1) * 60;
      const endTime = `${date}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;

      // Randomly mark some slots as unavailable for realism
      const booked = mockAppointments.some(
        (a) => a.startTime.startsWith(date) && a.startTime <= startTime && a.endTime > startTime,
      );

      slots.push({
        date,
        startTime,
        endTime,
        available: !booked,
      });
    }

    return slots;
  },

  async publicBook(
    orgSlug: string,
    data: {
      contactName: string;
      contactEmail: string;
      contactPhone: string;
      title: string;
      startTime: string;
      endTime: string;
    },
  ): Promise<Appointment> {
    const org = mockOrgs[orgSlug];
    if (!org) {
      throw Errors.notFound('Organization');
    }

    const now = new Date().toISOString();
    const appointment: Appointment = {
      id: `apt_${Date.now()}`,
      orgId: org.id,
      contactId: `cnt_public_${Date.now()}`,
      contactName: data.contactName,
      title: data.title,
      description: `Public booking by ${data.contactName} (${data.contactEmail})`,
      startTime: data.startTime,
      endTime: data.endTime,
      status: 'scheduled',
      assignedTo: null,
      location: 'TBD',
      bookedBy: 'public_booking',
      createdAt: now,
      updatedAt: now,
    };

    mockAppointments.push(appointment);
    logger.info('Public booking created', { orgSlug, appointmentId: appointment.id });
    return appointment;
  },
};
