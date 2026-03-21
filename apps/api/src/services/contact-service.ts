import { withOrgScope } from '../middleware/org-scope.js';
import { AppError, Errors } from '../middleware/error-handler.js';
import { logger } from '../middleware/logger.js';

export interface Contact {
  id: string;
  orgId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string;
  status: 'active' | 'inactive' | 'archived';
  tags: string[];
  customFields: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEvent {
  id: string;
  contactId: string;
  type: 'call' | 'sms' | 'email' | 'note' | 'deal_created' | 'appointment' | 'status_change';
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ContactFilters {
  search?: string;
  status?: string;
  source?: string;
  tag?: string;
  page: number;
  limit: number;
}

// ── Mock data store (replaced by Drizzle when @mybizos/db is ready) ──
const mockContacts: Contact[] = [
  {
    id: 'cnt_01',
    orgId: 'org_01',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@example.com',
    phone: '+15551234567',
    company: 'Johnson Plumbing',
    source: 'phone_call',
    status: 'active',
    tags: ['hvac', 'residential'],
    customFields: { preferredTime: 'morning' },
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-15T14:30:00Z',
  },
  {
    id: 'cnt_02',
    orgId: 'org_01',
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'mike.chen@example.com',
    phone: '+15559876543',
    company: null,
    source: 'website',
    status: 'active',
    tags: ['plumbing', 'commercial'],
    customFields: {},
    createdAt: '2026-03-10T08:00:00Z',
    updatedAt: '2026-03-10T08:00:00Z',
  },
];

const mockTimeline: TimelineEvent[] = [
  {
    id: 'evt_01',
    contactId: 'cnt_01',
    type: 'call',
    description: 'Inbound call — AI agent qualified lead for furnace repair',
    metadata: { duration: 180, aiHandled: true },
    createdAt: '2026-03-15T14:30:00Z',
  },
  {
    id: 'evt_02',
    contactId: 'cnt_01',
    type: 'appointment',
    description: 'Furnace inspection scheduled for March 20',
    metadata: { appointmentId: 'apt_01' },
    createdAt: '2026-03-15T14:35:00Z',
  },
];

export const contactService = {
  async list(orgId: string, filters: ContactFilters): Promise<{ contacts: Contact[]; total: number }> {
    const scope = withOrgScope(orgId);
    logger.debug('Listing contacts', { orgId, filters });

    let filtered = mockContacts.filter((c) => c.orgId === scope.orgId);

    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.firstName.toLowerCase().includes(q) ||
          c.lastName.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.includes(q),
      );
    }

    if (filters.status) {
      filtered = filtered.filter((c) => c.status === filters.status);
    }

    if (filters.source) {
      filtered = filtered.filter((c) => c.source === filters.source);
    }

    if (filters.tag) {
      filtered = filtered.filter((c) => c.tags.includes(filters.tag as string));
    }

    const total = filtered.length;
    const start = (filters.page - 1) * filters.limit;
    const paged = filtered.slice(start, start + filters.limit);

    return { contacts: paged, total };
  },

  async getById(orgId: string, contactId: string): Promise<{ contact: Contact; timeline: TimelineEvent[] }> {
    const scope = withOrgScope(orgId);
    const contact = mockContacts.find((c) => c.id === contactId && c.orgId === scope.orgId);

    if (!contact) {
      throw Errors.notFound('Contact');
    }

    const timeline = mockTimeline.filter((e) => e.contactId === contactId);
    return { contact, timeline };
  },

  async create(orgId: string, data: Omit<Contact, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
    const scope = withOrgScope(orgId);
    const now = new Date().toISOString();
    const contact: Contact = {
      id: `cnt_${Date.now()}`,
      orgId: scope.orgId,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    mockContacts.push(contact);
    logger.info('Contact created', { orgId, contactId: contact.id });
    return contact;
  },

  async update(orgId: string, contactId: string, data: Partial<Omit<Contact, 'id' | 'orgId' | 'createdAt'>>): Promise<Contact> {
    const scope = withOrgScope(orgId);
    const idx = mockContacts.findIndex((c) => c.id === contactId && c.orgId === scope.orgId);

    if (idx === -1) {
      throw Errors.notFound('Contact');
    }

    const existing = mockContacts[idx] as Contact;
    const updated: Contact = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    mockContacts[idx] = updated;
    logger.info('Contact updated', { orgId, contactId });
    return updated;
  },

  async softDelete(orgId: string, contactId: string): Promise<void> {
    const scope = withOrgScope(orgId);
    const idx = mockContacts.findIndex((c) => c.id === contactId && c.orgId === scope.orgId);

    if (idx === -1) {
      throw Errors.notFound('Contact');
    }

    const existing = mockContacts[idx] as Contact;
    mockContacts[idx] = { ...existing, status: 'archived', updatedAt: new Date().toISOString() };
    logger.info('Contact soft-deleted', { orgId, contactId });
  },

  async importCsv(orgId: string, csvRows: Array<Record<string, string>>): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const scope = withOrgScope(orgId);
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of csvRows) {
      const firstName = row['first_name'] || row['firstName'];
      const lastName = row['last_name'] || row['lastName'];

      if (!firstName || !lastName) {
        skipped++;
        errors.push(`Row missing first_name or last_name: ${JSON.stringify(row)}`);
        continue;
      }

      const now = new Date().toISOString();
      const contact: Contact = {
        id: `cnt_${Date.now()}_${imported}`,
        orgId: scope.orgId,
        firstName,
        lastName,
        email: row['email'] || null,
        phone: row['phone'] || null,
        company: row['company'] || null,
        source: 'csv_import',
        status: 'active',
        tags: row['tags'] ? row['tags'].split(',').map((t) => t.trim()) : [],
        customFields: {},
        createdAt: now,
        updatedAt: now,
      };
      mockContacts.push(contact);
      imported++;
    }

    logger.info('CSV import completed', { orgId, imported, skipped });
    return { imported, skipped, errors };
  },
};
