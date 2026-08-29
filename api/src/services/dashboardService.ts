import { FilterQuery } from 'mongoose';
import { ContractDocument } from '../models/Contract';
import { LicenseDocument, RenewalStatus } from '../models/License';
import { ExpiryBucket, getExpiryBucket, daysUntil } from './renewalDomain';
import { UserRole } from '../types';

export type ActionKind = 'license' | 'contract';

export interface DashboardFilters {
  kind?: ActionKind;
  urgency?: ExpiryBucket;
  renewalStatus?: RenewalStatus;
  ownerId?: string;
  clientId?: string;
  overdue?: boolean;
  search?: string;
}

export interface ActionItem {
  id: string;
  kind: ActionKind;
  title: string;
  clientId: string;
  clientName: string;
  ownerId: string;
  ownerName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  urgency: ExpiryBucket;
  renewalStatus: RenewalStatus;
  nextFollowUpAt: string | null;
  overdue: boolean;
  value: number;
}

type AnyRenewalDocument = LicenseDocument | ContractDocument;

const refId = (reference: unknown): string => {
  if (reference && typeof reference === 'object' && '_id' in reference) {
    return String((reference as { _id: unknown })._id);
  }
  return String(reference ?? '');
};

const clientName = (reference: unknown): string => {
  if (reference && typeof reference === 'object' && 'name' in reference) {
    return String((reference as { name: unknown }).name);
  }
  return 'Unknown client';
};

const ownerName = (reference: unknown): string => {
  if (reference && typeof reference === 'object') {
    const owner = reference as { firstName?: unknown; lastName?: unknown; email?: unknown };
    const fullName = [owner.firstName, owner.lastName].filter(Boolean).join(' ').trim();
    return fullName || String(owner.email ?? 'Unassigned');
  }
  return 'Unassigned';
};

export const actionItemFromDocument = (
  kind: ActionKind,
  document: AnyRenewalDocument,
  now = new Date()
): ActionItem => {
  const raw = document as AnyRenewalDocument & {
    title?: string;
    name?: string;
    assignedBy?: unknown;
    managedBy?: unknown;
  };
  const owner = kind === 'license' ? raw.assignedBy : raw.managedBy;
  const followUp = raw.nextFollowUpAt ? new Date(raw.nextFollowUpAt) : undefined;
  return {
    id: String(raw._id),
    kind,
    title: kind === 'license' ? String(raw.name ?? '') : String(raw.title ?? ''),
    clientId: refId(raw.client),
    clientName: clientName(raw.client),
    ownerId: refId(owner),
    ownerName: ownerName(owner),
    expiryDate: new Date(raw.expiryDate).toISOString(),
    daysUntilExpiry: daysUntil(raw.expiryDate, now),
    urgency: getExpiryBucket(raw.expiryDate, now),
    renewalStatus: raw.renewalStatus,
    nextFollowUpAt: followUp?.toISOString() ?? null,
    overdue: Boolean(followUp && followUp < now && !['renewed', 'declined'].includes(raw.renewalStatus)),
    value: raw.value ?? 0
  };
};

export const actionScope = (
  kind: ActionKind,
  role: UserRole,
  userId: string,
  ownerId?: string
): FilterQuery<AnyRenewalDocument> => {
  const ownerField = kind === 'license' ? 'assignedBy' : 'managedBy';
  if (role === UserRole.AGENT) return kind === 'license' ? { [ownerField]: userId } : { _id: { $exists: false } };
  if (role === UserRole.CONSULTANT) return kind === 'contract' ? { [ownerField]: userId } : { _id: { $exists: false } };
  return ownerId ? { [ownerField]: ownerId } : {};
};

export const dashboardPayload = (items: ActionItem[]) => {
  const requiringAction = items.filter((item) => item.urgency !== 'safe');
  const urgencyCounts: Record<ExpiryBucket, number> = {
    expired: 0,
    critical: 0,
    urgent: 0,
    upcoming: 0,
    safe: 0
  };
  for (const item of items) urgencyCounts[item.urgency] += 1;

  return {
    summary: {
      clientsAtRisk: new Set(requiringAction.map((item) => item.clientId)).size,
      contractsRequiringAction: requiringAction.filter((item) => item.kind === 'contract').length,
      licensesRequiringAction: requiringAction.filter((item) => item.kind === 'license').length,
      // Licence quantities do not represent guaranteed revenue. Only contract
      // values are included in the estimate exposed to the dashboard.
      estimatedRenewalValue: requiringAction
        .filter((item) => item.kind === 'contract')
        .reduce((total, item) => total + item.value, 0),
      overdueFollowUps: items.filter((item) => item.overdue).length
    },
    urgencyCounts,
    upcoming: requiringAction
      .slice()
      .sort((left, right) => left.daysUntilExpiry - right.daysUntilExpiry)
      .slice(0, 12)
  };
};

export const matchesActionSearch = (item: ActionItem, search?: string): boolean => {
  if (!search) return true;
  const term = search.trim().toLocaleLowerCase();
  return [item.title, item.clientName, item.ownerName].some((value) => value.toLocaleLowerCase().includes(term));
};

const urgencyOrder: Record<ExpiryBucket, number> = {
  expired: 0,
  critical: 1,
  urgent: 2,
  upcoming: 3,
  safe: 4
};

export const compareActionItems = (left: ActionItem, right: ActionItem): number => {
  if (left.overdue !== right.overdue) return left.overdue ? -1 : 1;
  const urgencyDifference = urgencyOrder[left.urgency] - urgencyOrder[right.urgency];
  if (urgencyDifference !== 0) return urgencyDifference;
  const expiryDifference = left.daysUntilExpiry - right.daysUntilExpiry;
  return expiryDifference !== 0 ? expiryDifference : left.title.localeCompare(right.title);
};
