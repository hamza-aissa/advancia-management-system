import { FilterQuery, Types } from 'mongoose';
import { RenewalActivity } from '../models/RenewalActivity';

export type ExpiryBucket = 'expired' | 'critical' | 'urgent' | 'upcoming' | 'safe';
export type RenewalItemType = 'license' | 'contract';
const DAY_MS = 24 * 60 * 60 * 1000;

export const startOfUtcDay = (date = new Date()): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

export const daysUntil = (expiryDate: Date, today = new Date()): number =>
  Math.ceil((startOfUtcDay(expiryDate).getTime() - startOfUtcDay(today).getTime()) / DAY_MS);

export const getExpiryBucket = (expiryDate: Date, today = new Date()): ExpiryBucket => {
  const days = daysUntil(expiryDate, today);
  if (days < 0) return 'expired';
  if (days <= 6) return 'critical';
  if (days <= 10) return 'urgent';
  if (days <= 15) return 'upcoming';
  return 'safe';
};

export const expiryBucketFilter = (bucket: ExpiryBucket, today = new Date()): FilterQuery<unknown> => {
  const day = startOfUtcDay(today);
  const plusDays = (amount: number) => new Date(day.getTime() + amount * DAY_MS);
  switch (bucket) {
    case 'expired': return { expiryDate: { $lt: day } };
    case 'critical': return { expiryDate: { $gte: day, $lt: plusDays(7) } };
    case 'urgent': return { expiryDate: { $gte: plusDays(7), $lt: plusDays(11) } };
    case 'upcoming': return { expiryDate: { $gte: plusDays(11), $lt: plusDays(16) } };
    case 'safe': return { expiryDate: { $gte: plusDays(16) } };
  }
};

export const parseDate = (value: unknown): Date | undefined => {
  if (typeof value !== 'string' && !(value instanceof Date)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export const recordActivity = async (
  itemType: RenewalItemType,
  itemId: Types.ObjectId,
  action: 'created' | 'updated' | 'contacted' | 'follow_up_scheduled' | 'renewed' | 'declined' | 'reassigned' | 'archived',
  performedBy: string,
  note?: string,
  metadata?: Record<string, unknown>
): Promise<void> => {
  await RenewalActivity.create({ itemType, itemId, action, performedBy, note, metadata });
};

export const withExpiryMetadata = <T extends { toObject(): Record<string, unknown>; expiryDate: Date }>(item: T) => ({
  ...item.toObject(),
  daysUntilExpiry: daysUntil(item.expiryDate),
  urgency: getExpiryBucket(item.expiryDate)
});
