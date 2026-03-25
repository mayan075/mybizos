import { Hono } from 'hono';
import { z } from 'zod';
import { logger } from '../middleware/logger.js';

const callsRoutes = new Hono();

// ── Types ──────────────────────────────────────────────────────────────────

interface CallHistoryEntry {
  id: string;
  orgId: string;
  phoneNumber: string;
  contactName: string | null;
  direction: 'inbound' | 'outbound';
  duration: number;
  timestamp: string;
  outcome: 'booked' | 'qualified' | 'voicemail' | 'missed' | 'escalated';
  aiHandled: boolean;
  summary: string;
  transcript: Array<{ speaker: string; text: string; time: string }>;
  actionsTaken: string[];
  recordingAvailable: boolean;
}

// ── In-memory call history store (per org) ────────────────────────────────
// TODO: Migrate to a proper DB table (call_history) with org_id scoping

const callHistory = new Map<string, CallHistoryEntry[]>();

function getOrgCalls(orgId: string): CallHistoryEntry[] {
  if (!callHistory.has(orgId)) {
    callHistory.set(orgId, []);
  }
  return callHistory.get(orgId) as CallHistoryEntry[];
}

// ── Zod schemas ───────────────────────────────────────────────────────────

const logCallSchema = z.object({
  phoneNumber: z.string().min(5, 'Phone number is required'),
  direction: z.enum(['inbound', 'outbound']).default('outbound'),
  durationSeconds: z.number().int().min(0).default(0),
  contactName: z.string().nullable().default(null),
  timestamp: z.string().optional(),
  outcome: z.enum(['booked', 'qualified', 'voicemail', 'missed', 'escalated']).default('qualified'),
  summary: z.string().optional(),
});

// ── GET / — List call history for an org ──────────────────────────────────

callsRoutes.get('/', async (c) => {
  const orgId = c.req.param('orgId');
  if (!orgId) {
    return c.json({ error: 'Missing orgId', code: 'VALIDATION_ERROR', status: 400 }, 400);
  }

  const calls = getOrgCalls(orgId);

  // Return sorted by newest first, map to the shape the frontend expects
  const sorted = [...calls].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return c.json(sorted);
});

// ── POST /log — Log a completed call ─────────────────────────────────────

callsRoutes.post('/log', async (c) => {
  const orgId = c.req.param('orgId');
  if (!orgId) {
    return c.json({ error: 'Missing orgId', code: 'VALIDATION_ERROR', status: 400 }, 400);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body', code: 'VALIDATION_ERROR', status: 400 }, 400);
  }

  const parsed = logCallSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: parsed.error.issues.map((i) => i.message).join(', '),
        code: 'VALIDATION_ERROR',
        status: 400,
      },
      400,
    );
  }

  const data = parsed.data;

  const entry: CallHistoryEntry = {
    id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    orgId,
    phoneNumber: data.phoneNumber,
    contactName: data.contactName,
    direction: data.direction,
    duration: data.durationSeconds,
    timestamp: data.timestamp ?? new Date().toISOString(),
    outcome: data.outcome,
    aiHandled: false,
    summary: data.summary ?? `${data.direction === 'outbound' ? 'Outbound' : 'Inbound'} call — ${data.durationSeconds}s`,
    transcript: [],
    actionsTaken: ['Call logged'],
    recordingAvailable: false,
  };

  const calls = getOrgCalls(orgId);
  calls.push(entry);

  // Keep max 500 calls per org in memory
  if (calls.length > 500) {
    calls.splice(0, calls.length - 500);
  }

  logger.info('Call logged', {
    orgId,
    callId: entry.id,
    phoneNumber: entry.phoneNumber,
    direction: entry.direction,
    duration: String(entry.duration),
  });

  return c.json({ success: true, call: entry });
});

export { callsRoutes };
