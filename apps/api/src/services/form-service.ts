import {
  db,
  forms,
  formSubmissions,
  contacts,
  activities,
  withOrgScope,
} from '@hararai/db';
import { eq, and, desc, count, sql, ilike } from 'drizzle-orm';
import { Errors } from '../middleware/error-handler.js';
import { logger } from '../middleware/logger.js';
import { contactService } from './contact-service.js';
import type { FormField, FormSettings } from '@hararai/shared';

export interface FormFilters {
  search?: string;
  status?: string;
  page: number;
  limit: number;
}

export interface SubmissionFilters {
  formId?: string;
  page: number;
  limit: number;
}

export const formService = {
  async list(orgId: string, filters: FormFilters) {
    const conditions = [withOrgScope(forms.orgId, orgId)];

    if (filters.search) {
      conditions.push(ilike(forms.name, `%${filters.search}%`));
    }

    if (filters.status) {
      conditions.push(
        eq(
          forms.status,
          filters.status as (typeof forms.status.enumValues)[number],
        ),
      );
    }

    const whereClause = and(...conditions);

    const [totalResult] = await db
      .select({ value: count() })
      .from(forms)
      .where(whereClause);

    const total = totalResult?.value ?? 0;
    const offset = (filters.page - 1) * filters.limit;

    const rows = await db
      .select()
      .from(forms)
      .where(whereClause)
      .orderBy(desc(forms.createdAt))
      .limit(filters.limit)
      .offset(offset);

    // Get submission counts per form
    const formIds = rows.map((r) => r.id);
    let submissionCounts: Record<string, number> = {};

    if (formIds.length > 0) {
      const countsResult = await db
        .select({
          formId: formSubmissions.formId,
          count: count(),
        })
        .from(formSubmissions)
        .where(
          and(
            withOrgScope(formSubmissions.orgId, orgId),
            sql`${formSubmissions.formId} IN ${formIds}`,
          ),
        )
        .groupBy(formSubmissions.formId);

      submissionCounts = Object.fromEntries(
        countsResult.map((r) => [r.formId, r.count]),
      );
    }

    const formsWithCounts = rows.map((form) => ({
      ...form,
      submissionCount: submissionCounts[form.id] ?? 0,
    }));

    return { forms: formsWithCounts, total };
  },

  async getById(orgId: string, formId: string) {
    const [form] = await db
      .select()
      .from(forms)
      .where(and(withOrgScope(forms.orgId, orgId), eq(forms.id, formId)));

    if (!form) {
      throw Errors.notFound('Form');
    }

    // Get recent submissions
    const recentSubmissions = await db
      .select()
      .from(formSubmissions)
      .where(
        and(
          withOrgScope(formSubmissions.orgId, orgId),
          eq(formSubmissions.formId, formId),
        ),
      )
      .orderBy(desc(formSubmissions.createdAt))
      .limit(5);

    const [countResult] = await db
      .select({ value: count() })
      .from(formSubmissions)
      .where(
        and(
          withOrgScope(formSubmissions.orgId, orgId),
          eq(formSubmissions.formId, formId),
        ),
      );

    return {
      form,
      submissionCount: countResult?.value ?? 0,
      recentSubmissions,
    };
  },

  async create(
    orgId: string,
    data: {
      name: string;
      description?: string;
      fields: FormField[];
      settings?: FormSettings;
      status?: 'active' | 'inactive';
    },
  ) {
    const [created] = await db
      .insert(forms)
      .values({
        orgId,
        name: data.name,
        description: data.description ?? null,
        fields: data.fields,
        settings: data.settings ?? {},
        status: data.status ?? 'active',
      })
      .returning();

    if (!created) {
      throw Errors.internal('Failed to create form');
    }

    logger.info('Form created', { orgId, formId: created.id });
    return created;
  },

  async update(
    orgId: string,
    formId: string,
    data: {
      name?: string;
      description?: string;
      fields?: FormField[];
      settings?: FormSettings;
      status?: 'active' | 'inactive';
    },
  ) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.fields !== undefined) updateData.fields = data.fields;
    if (data.settings !== undefined) updateData.settings = data.settings;
    if (data.status !== undefined) updateData.status = data.status;

    const [updated] = await db
      .update(forms)
      .set(updateData)
      .where(and(withOrgScope(forms.orgId, orgId), eq(forms.id, formId)))
      .returning();

    if (!updated) {
      throw Errors.notFound('Form');
    }

    logger.info('Form updated', { orgId, formId });
    return updated;
  },

  async remove(orgId: string, formId: string) {
    const result = await db
      .delete(forms)
      .where(and(withOrgScope(forms.orgId, orgId), eq(forms.id, formId)))
      .returning({ id: forms.id });

    if (result.length === 0) {
      throw Errors.notFound('Form');
    }

    logger.info('Form deleted', { orgId, formId });
  },

  async getPublicForm(formId: string) {
    const [form] = await db
      .select()
      .from(forms)
      .where(and(eq(forms.id, formId), eq(forms.status, 'active')));

    if (!form) {
      throw Errors.notFound('Form');
    }

    return form;
  },

  async submitPublicForm(
    formId: string,
    submissionData: { data: Record<string, string>; source?: string },
  ) {
    const form = await this.getPublicForm(formId);
    const orgId = form.orgId;
    const fields = form.fields as FormField[];
    const settings = form.settings as FormSettings;

    let contactId: string | null = null;

    if (settings.autoCreateContact !== false) {
      // Extract contact info by matching field types
      let email: string | null = null;
      let phone: string | null = null;
      let fullName = '';

      for (const field of fields) {
        const value = submissionData.data[field.label];
        if (!value) continue;

        if (field.type === 'email') email = value;
        else if (field.type === 'phone') phone = value;
        else if (
          field.type === 'text' &&
          field.label.toLowerCase().includes('name')
        ) {
          fullName = value;
        }
      }

      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || 'Unknown';

      // Dedup: check by email first, then phone
      let existingContact: (typeof contacts.$inferSelect) | undefined;

      if (email) {
        const [found] = await db
          .select()
          .from(contacts)
          .where(
            and(withOrgScope(contacts.orgId, orgId), eq(contacts.email, email)),
          );
        existingContact = found;
      }

      if (!existingContact && phone) {
        const [found] = await db
          .select()
          .from(contacts)
          .where(
            and(withOrgScope(contacts.orgId, orgId), eq(contacts.phone, phone)),
          );
        existingContact = found;
      }

      if (existingContact) {
        contactId = existingContact.id;
      } else {
        const tags =
          settings.autoAddTag ? [settings.autoAddTag] : [];
        const created = await contactService.create(orgId, {
          firstName,
          lastName,
          email,
          phone,
          source: 'webform',
          tags,
        });
        contactId = created.id;
      }
    }

    // Insert submission
    const [submission] = await db
      .insert(formSubmissions)
      .values({
        orgId,
        formId,
        contactId,
        data: submissionData.data,
        source: submissionData.source ?? 'website',
      })
      .returning();

    if (!submission) {
      throw Errors.internal('Failed to create form submission');
    }

    // Log activity
    if (contactId) {
      await db
        .insert(activities)
        .values({
          orgId,
          contactId,
          type: 'form_submission',
          title: `Form submitted: ${form.name}`,
          metadata: {
            formId: form.id,
            formName: form.name,
            submissionId: submission.id,
            data: submissionData.data,
          },
        })
        .catch((err: Error) => {
          logger.error('Failed to log form submission activity', {
            error: err.message,
          });
        });
    }

    logger.info('Public form submitted', {
      formId,
      orgId,
      contactId,
      submissionId: submission.id,
    });

    return { submission, contactId };
  },

  async listSubmissions(orgId: string, filters: SubmissionFilters) {
    const conditions = [withOrgScope(formSubmissions.orgId, orgId)];

    if (filters.formId) {
      conditions.push(eq(formSubmissions.formId, filters.formId));
    }

    const whereClause = and(...conditions);

    const [totalResult] = await db
      .select({ value: count() })
      .from(formSubmissions)
      .where(whereClause);

    const total = totalResult?.value ?? 0;
    const offset = (filters.page - 1) * filters.limit;

    const rows = await db
      .select({
        submission: formSubmissions,
        formName: forms.name,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        contactEmail: contacts.email,
      })
      .from(formSubmissions)
      .leftJoin(forms, eq(formSubmissions.formId, forms.id))
      .leftJoin(contacts, eq(formSubmissions.contactId, contacts.id))
      .where(whereClause)
      .orderBy(desc(formSubmissions.createdAt))
      .limit(filters.limit)
      .offset(offset);

    const submissions = rows.map((row) => ({
      ...row.submission,
      formName: row.formName,
      contactName:
        row.contactFirstName && row.contactLastName
          ? `${row.contactFirstName} ${row.contactLastName}`
          : null,
      contactEmail: row.contactEmail,
    }));

    return { submissions, total };
  },
};
