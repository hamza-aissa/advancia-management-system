import { describe, expect, it } from 'vitest';
import { UserRole } from '../types';
import {
  actionScope,
  dashboardPayload,
  ActionItem,
  compareActionItems,
  matchesActionSearch
} from '../services/dashboardService';

const action = (overrides: Partial<ActionItem> = {}): ActionItem => ({
  id: 'item-1',
  kind: 'license',
  title: 'ERP license',
  clientId: 'client-1',
  clientName: 'Northwind',
  ownerId: 'owner-1',
  ownerName: 'Demo Agent',
  expiryDate: '2026-09-01T00:00:00.000Z',
  daysUntilExpiry: 3,
  urgency: 'critical',
  renewalStatus: 'not_contacted',
  nextFollowUpAt: null,
  overdue: false,
  value: 1000,
  ...overrides
});

describe('dashboard role scoping', () => {
  it('limits agents to their own licenses and excludes contracts', () => {
    expect(actionScope('license', UserRole.AGENT, 'agent-1')).toEqual({ assignedBy: 'agent-1' });
    expect(actionScope('contract', UserRole.AGENT, 'agent-1')).toEqual({ _id: { $exists: false } });
  });

  it('limits consultants to their own contracts and excludes licenses', () => {
    expect(actionScope('contract', UserRole.CONSULTANT, 'consultant-1')).toEqual({ managedBy: 'consultant-1' });
    expect(actionScope('license', UserRole.CONSULTANT, 'consultant-1')).toEqual({ _id: { $exists: false } });
  });

  it('lets admins view all items or filter by owner', () => {
    expect(actionScope('license', UserRole.ADMIN, 'admin-1')).toEqual({});
    expect(actionScope('contract', UserRole.ADMIN, 'admin-1', 'consultant-2'))
      .toEqual({ managedBy: 'consultant-2' });
  });
});

describe('dashboard bucket calculations', () => {
  it('counts risk clients once and calculates renewal totals and overdue work', () => {
    const payload = dashboardPayload([
      action(),
      action({ id: 'item-2', kind: 'contract', urgency: 'urgent', daysUntilExpiry: 8, value: 2500, overdue: true }),
      action({ id: 'item-3', clientId: 'client-2', urgency: 'expired', daysUntilExpiry: -2, value: 500 }),
      action({ id: 'item-4', clientId: 'client-3', urgency: 'safe', daysUntilExpiry: 40, value: 9000 })
    ]);

    expect(payload.summary).toEqual({
      clientsAtRisk: 2,
      contractsRequiringAction: 1,
      licensesRequiringAction: 2,
      estimatedRenewalValue: 2500,
      overdueFollowUps: 1
    });
    expect(payload.urgencyCounts).toEqual({ expired: 1, critical: 1, urgent: 1, upcoming: 0, safe: 1 });
    expect(payload.upcoming.map((item) => item.id)).toEqual(['item-3', 'item-1', 'item-2']);
  });

  it('keeps the opposite item count at zero for a role-scoped input', () => {
    const agentPayload = dashboardPayload([action(), action({ id: 'license-2', urgency: 'upcoming' })]);
    expect(agentPayload.summary.contractsRequiringAction).toBe(0);
    expect(agentPayload.summary.licensesRequiringAction).toBe(2);
  });
});

describe('action presentation', () => {
  it('searches titles, clients, and owners case-insensitively', () => {
    const item = action();
    expect(matchesActionSearch(item, 'erp')).toBe(true);
    expect(matchesActionSearch(item, 'NORTHWIND')).toBe(true);
    expect(matchesActionSearch(item, 'demo agent')).toBe(true);
    expect(matchesActionSearch(item, 'missing')).toBe(false);
  });

  it('orders overdue work first, followed by urgency and expiry date', () => {
    const items = [
      action({ id: 'safe', urgency: 'safe', daysUntilExpiry: 30 }),
      action({ id: 'urgent', urgency: 'urgent', daysUntilExpiry: 8 }),
      action({ id: 'overdue', urgency: 'upcoming', daysUntilExpiry: 12, overdue: true }),
      action({ id: 'expired', urgency: 'expired', daysUntilExpiry: -1 })
    ].sort(compareActionItems);

    expect(items.map((item) => item.id)).toEqual(['overdue', 'expired', 'urgent', 'safe']);
  });
});
