import {
  db,
  organizations,
  deals,
  pipelineStages,
  contacts,
  withOrgScope,
} from '@mybizos/db';
import { and, eq, lte, sql } from 'drizzle-orm';
import { logger } from '../middleware/logger.js';
import { notificationService } from '../services/notification-service.js';

// ═════════════════════════════════════════════════════════════════════════════════
//  Stale Deal Alerts Job
//
//  Runs daily at 7am AEST. Finds deals where the stage hasn't changed in > 7 days
//  (deals not in won/lost stages). For each stale deal, sends the org owner
//  a notification suggesting follow-up.
// ═════════════════════════════════════════════════════════════════════════════════

export async function runStaleDealAlerts(): Promise<{
  orgsChecked: number;
  staleDealsFound: number;
  notificationsSent: number;
  errors: number;
}> {
  logger.info('Running stale deal alerts job');

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get all active organizations
  const activeOrgs = await db
    .select({
      orgId: organizations.id,
      orgName: organizations.name,
    })
    .from(organizations)
    .where(sql`${organizations.phone} IS NOT NULL AND ${organizations.phone} != ''`);

  let orgsChecked = 0;
  let staleDealsFound = 0;
  let notificationsSent = 0;
  let errors = 0;

  for (const org of activeOrgs) {
    orgsChecked++;

    try {
      // Find deals stuck in the same stage for > 7 days (not won/lost)
      const staleDeals = await db
        .select({
          dealTitle: deals.title,
          dealValue: deals.value,
          stageName: pipelineStages.name,
          updatedAt: deals.updatedAt,
          contactFirstName: contacts.firstName,
          contactLastName: contacts.lastName,
        })
        .from(deals)
        .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
        .innerJoin(contacts, eq(deals.contactId, contacts.id))
        .where(and(
          withOrgScope(deals.orgId, org.orgId),
          lte(deals.updatedAt, sevenDaysAgo),
          sql`${pipelineStages.slug} NOT IN ('won', 'lost')`,
        ))
        .orderBy(deals.updatedAt);

      if (staleDeals.length === 0) {
        continue;
      }

      staleDealsFound += staleDeals.length;

      // Build the notification message
      const alertParts: string[] = [];
      alertParts.push(`Deal Alert for ${org.orgName}:`);

      for (const deal of staleDeals.slice(0, 5)) {
        const updatedAt = deal.updatedAt instanceof Date ? deal.updatedAt : new Date(deal.updatedAt);
        const daysPending = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
        const contactName = `${deal.contactFirstName} ${deal.contactLastName}`.trim();

        alertParts.push(
          `- ${contactName}: ${deal.dealTitle} ($${deal.dealValue}) has been in "${deal.stageName}" for ${daysPending} days. Want me to follow up?`,
        );
      }

      if (staleDeals.length > 5) {
        alertParts.push(`...and ${staleDeals.length - 5} more stale deals.`);
      }

      alertParts.push('Reply to this message or check your dashboard for details.');

      const message = alertParts.join('\n');

      // Build HTML email version
      const emailHtml = `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc2626; margin-bottom: 16px;">Stale Deal Alert</h2>
          <p style="color: #475569;">The following deals haven't moved in over 7 days:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 13px;">Contact</th>
                <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 13px;">Deal</th>
                <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 13px;">Value</th>
                <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 13px;">Stage</th>
                <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 13px;">Days</th>
              </tr>
            </thead>
            <tbody>
              ${staleDeals.slice(0, 10).map((deal) => {
                const updatedAt = deal.updatedAt instanceof Date ? deal.updatedAt : new Date(deal.updatedAt);
                const daysPending = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
                const contactName = `${deal.contactFirstName} ${deal.contactLastName}`.trim();
                return `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 8px 12px; color: #1a1a1a;">${contactName}</td>
                    <td style="padding: 8px 12px; color: #1a1a1a;">${deal.dealTitle}</td>
                    <td style="padding: 8px 12px; text-align: right; color: #1a1a1a; font-weight: 600;">$${deal.dealValue}</td>
                    <td style="padding: 8px 12px; color: #6366f1;">${deal.stageName}</td>
                    <td style="padding: 8px 12px; text-align: right; color: ${daysPending > 14 ? '#dc2626' : '#f59e0b'}; font-weight: 600;">${daysPending}d</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          <p style="color: #475569;">Consider reaching out to these contacts to move the deals forward.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">Stale deal alert from MyBizOS.</p>
        </div>
      `;

      const result = await notificationService.sendOwnerNotification(
        org.orgId,
        message,
        {
          subject: `Stale Deal Alert: ${staleDeals.length} deal${staleDeals.length === 1 ? '' : 's'} need attention`,
          htmlBody: emailHtml,
        },
      );

      if (result.smsSent || result.emailSent) {
        notificationsSent++;
      }

      logger.info('Stale deal alerts sent', {
        orgId: org.orgId,
        staleDeals: staleDeals.length,
        smsSent: result.smsSent,
        emailSent: result.emailSent,
      });
    } catch (err) {
      errors++;
      logger.error('Failed to process stale deal alerts for org', {
        orgId: org.orgId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const result = { orgsChecked, staleDealsFound, notificationsSent, errors };
  logger.info('Stale deal alerts job completed', result);
  return result;
}
