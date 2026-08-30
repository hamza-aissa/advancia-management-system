import { describe, expect, it } from 'vitest';
import { dueThreshold, validateCronConfiguration } from '../jobs/expiryChecker';

describe('planification des rappels', () => {
  it('valide la syntaxe cron et le fuseau horaire', () => {
    expect(() => validateCronConfiguration('0 9 * * *', 'Africa/Tunis')).not.toThrow();
    expect(() => validateCronConfiguration('pas un cron', 'Africa/Tunis')).toThrow(/CRON_SCHEDULE/);
    expect(() => validateCronConfiguration('0 9 * * *', 'Mars/Olympus')).toThrow(/CRON_TIMEZONE/);
  });

  it('rattrape le palier dépassé sans dépendre du jour exact', () => {
    expect(dueThreshold(16)).toBeNull();
    expect(dueThreshold(15)).toBe(15);
    expect(dueThreshold(14)).toBe(15);
    expect(dueThreshold(10)).toBe(10);
    expect(dueThreshold(9)).toBe(10);
    expect(dueThreshold(6)).toBe(6);
    expect(dueThreshold(2)).toBe(6);
  });
});
