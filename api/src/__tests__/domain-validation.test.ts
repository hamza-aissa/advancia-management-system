import { describe, expect, it, vi, afterEach } from 'vitest';
import { contractCreateSchema, followUpSchema, licenseCreateSchema, licenseUpdateSchema, renewSchema } from '../routes/domainValidation';
import { daysUntil, getExpiryBucket, startOfUtcDay } from '../services/renewalDomain';
import { contractServicesValue } from '../controllers/contractController';
import { Contract } from '../models/Contract';
import { License } from '../models/License';

const id = '507f1f77bcf86cd799439011';

describe('domain validation and lifecycle boundaries', () => {
  afterEach(() => vi.useRealTimers());

  it('rejects invalid licence quantity, negative values, and reversed dates', () => {
    const result = licenseCreateSchema.safeParse({
      client: id, offer: id, startDate: '2026-09-02T00:00:00.000Z',
      expiryDate: '2026-09-01T00:00:00.000Z', quantity: 0
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors).toMatchObject({
      expiryDate: expect.any(Array), quantity: expect.any(Array)
    });
  });

  it('accepts a typed contract with priced services', () => {
    expect(contractCreateSchema.safeParse({
      client: id, contractType: id, startDate: '2026-09-01T00:00:00.000Z',
      expiryDate: '2027-09-01T00:00:00.000Z',
      services: [{ name: 'Support', quantity: 2, unitPrice: 125 }]
    }).success).toBe(true);
    expect(contractServicesValue([{ name: 'Support', quantity: 2, unitPrice: 125 }])).toBe(250);
  });

  it('enforces one contract per client while allowing several licences', () => {
    const contractClientIndex = Contract.schema.indexes().find(([fields]) => fields.client === 1);
    expect(contractClientIndex?.[1]).toMatchObject({ unique: true });
    const licenceClientIndex = License.schema.indexes().find(([fields]) => fields.client === 1);
    expect(licenceClientIndex?.[1]?.unique).not.toBe(true);
  });

  it('rejects unsafe updates and past follow-ups', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-29T12:00:00.000Z'));
    expect(licenseUpdateSchema.safeParse({ quantity: -2 }).success).toBe(false);
    expect(followUpSchema.safeParse({ nextFollowUpAt: '2026-08-29T11:00:00.000Z' }).success).toBe(false);
    expect(followUpSchema.safeParse({ nextFollowUpAt: '2026-08-30T11:00:00.000Z' }).success).toBe(true);
  });

  it('keeps expiry buckets stable on UTC calendar boundaries', () => {
    const today = startOfUtcDay(new Date('2026-08-29T22:30:00-02:00'));
    const expiry = new Date(today.getTime() + 6 * 86_400_000);
    expect(daysUntil(expiry, today)).toBe(6);
    expect(getExpiryBucket(expiry, today)).toBe('critical');
  });

  it('validates renewal payload values', () => {
    expect(renewSchema.safeParse({ expiryDate: '2027-01-01T00:00:00.000Z', value: -5 }).success).toBe(false);
  });
});
