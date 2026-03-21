import { withOrgScope } from '../middleware/org-scope.js';
import { Errors } from '../middleware/error-handler.js';
import { logger } from '../middleware/logger.js';

export interface Pipeline {
  id: string;
  orgId: string;
  name: string;
  stages: PipelineStage[];
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStage {
  id: string;
  pipelineId: string;
  name: string;
  order: number;
  color: string;
}

export interface Deal {
  id: string;
  orgId: string;
  pipelineId: string;
  stageId: string;
  contactId: string;
  title: string;
  value: number;
  currency: string;
  status: 'open' | 'won' | 'lost';
  expectedCloseDate: string | null;
  assignedTo: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ── Mock data ──
const mockStages: PipelineStage[] = [
  { id: 'stg_01', pipelineId: 'pip_01', name: 'New Lead', order: 1, color: '#3b82f6' },
  { id: 'stg_02', pipelineId: 'pip_01', name: 'Qualified', order: 2, color: '#eab308' },
  { id: 'stg_03', pipelineId: 'pip_01', name: 'Proposal Sent', order: 3, color: '#f97316' },
  { id: 'stg_04', pipelineId: 'pip_01', name: 'Won', order: 4, color: '#22c55e' },
  { id: 'stg_05', pipelineId: 'pip_01', name: 'Lost', order: 5, color: '#ef4444' },
];

const mockPipelines: Pipeline[] = [
  {
    id: 'pip_01',
    orgId: 'org_01',
    name: 'Sales Pipeline',
    stages: mockStages,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const mockDeals: Deal[] = [
  {
    id: 'deal_01',
    orgId: 'org_01',
    pipelineId: 'pip_01',
    stageId: 'stg_01',
    contactId: 'cnt_01',
    title: 'Furnace Repair — Johnson Residence',
    value: 2500,
    currency: 'USD',
    status: 'open',
    expectedCloseDate: '2026-03-25',
    assignedTo: null,
    notes: 'Customer called about furnace making noise. AI agent qualified.',
    createdAt: '2026-03-15T14:30:00Z',
    updatedAt: '2026-03-15T14:30:00Z',
  },
  {
    id: 'deal_02',
    orgId: 'org_01',
    pipelineId: 'pip_01',
    stageId: 'stg_02',
    contactId: 'cnt_02',
    title: 'Commercial Plumbing Inspection — Chen Office',
    value: 5000,
    currency: 'USD',
    status: 'open',
    expectedCloseDate: '2026-04-01',
    assignedTo: null,
    notes: 'Quarterly plumbing inspection for commercial property.',
    createdAt: '2026-03-10T08:00:00Z',
    updatedAt: '2026-03-12T10:00:00Z',
  },
];

export const pipelineService = {
  async list(orgId: string): Promise<Pipeline[]> {
    const scope = withOrgScope(orgId);
    return mockPipelines.filter((p) => p.orgId === scope.orgId);
  },

  async getById(orgId: string, pipelineId: string): Promise<{ pipeline: Pipeline; deals: Deal[] }> {
    const scope = withOrgScope(orgId);
    const pipeline = mockPipelines.find((p) => p.id === pipelineId && p.orgId === scope.orgId);

    if (!pipeline) {
      throw Errors.notFound('Pipeline');
    }

    const deals = mockDeals.filter((d) => d.pipelineId === pipelineId && d.orgId === scope.orgId);
    return { pipeline, deals };
  },

  async create(orgId: string, data: { name: string; stages: Array<{ name: string; color: string }> }): Promise<Pipeline> {
    const scope = withOrgScope(orgId);
    const now = new Date().toISOString();
    const pipelineId = `pip_${Date.now()}`;

    const stages: PipelineStage[] = data.stages.map((s, i) => ({
      id: `stg_${Date.now()}_${i}`,
      pipelineId,
      name: s.name,
      order: i + 1,
      color: s.color,
    }));

    const pipeline: Pipeline = {
      id: pipelineId,
      orgId: scope.orgId,
      name: data.name,
      stages,
      createdAt: now,
      updatedAt: now,
    };

    mockPipelines.push(pipeline);
    logger.info('Pipeline created', { orgId, pipelineId });
    return pipeline;
  },

  async update(orgId: string, pipelineId: string, data: { name?: string }): Promise<Pipeline> {
    const scope = withOrgScope(orgId);
    const idx = mockPipelines.findIndex((p) => p.id === pipelineId && p.orgId === scope.orgId);

    if (idx === -1) {
      throw Errors.notFound('Pipeline');
    }

    const existing = mockPipelines[idx] as Pipeline;
    const updated: Pipeline = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    mockPipelines[idx] = updated;
    logger.info('Pipeline updated', { orgId, pipelineId });
    return updated;
  },
};

export const dealService = {
  async list(orgId: string): Promise<Deal[]> {
    const scope = withOrgScope(orgId);
    return mockDeals.filter((d) => d.orgId === scope.orgId);
  },

  async create(orgId: string, data: Omit<Deal, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>): Promise<Deal> {
    const scope = withOrgScope(orgId);
    const now = new Date().toISOString();

    const deal: Deal = {
      id: `deal_${Date.now()}`,
      orgId: scope.orgId,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    mockDeals.push(deal);
    logger.info('Deal created', { orgId, dealId: deal.id });
    return deal;
  },

  async update(orgId: string, dealId: string, data: Partial<Omit<Deal, 'id' | 'orgId' | 'createdAt'>>): Promise<Deal> {
    const scope = withOrgScope(orgId);
    const idx = mockDeals.findIndex((d) => d.id === dealId && d.orgId === scope.orgId);

    if (idx === -1) {
      throw Errors.notFound('Deal');
    }

    const existing = mockDeals[idx] as Deal;
    const updated: Deal = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    mockDeals[idx] = updated;
    logger.info('Deal updated', { orgId, dealId, stageChanged: data.stageId !== undefined });
    return updated;
  },

  async remove(orgId: string, dealId: string): Promise<void> {
    const scope = withOrgScope(orgId);
    const idx = mockDeals.findIndex((d) => d.id === dealId && d.orgId === scope.orgId);

    if (idx === -1) {
      throw Errors.notFound('Deal');
    }

    mockDeals.splice(idx, 1);
    logger.info('Deal deleted', { orgId, dealId });
  },
};
