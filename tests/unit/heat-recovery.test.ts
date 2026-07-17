import { describe, expect, it } from 'vitest';
import { calculateHeatRecovery } from '../../src/utils/heat-recovery';

describe('calculateHeatRecovery', () => {
  it('calculates apparent sensible heat recovery in normal heating conditions', () => {
    const result = calculateHeatRecovery({
      outdoor: 8.1,
      extract: 21.2,
      supply: 19.0,
      method: 'automatic',
    });

    expect(result.status).toBe('ok');
    expect(result.raw).toBeCloseTo(83.2, 1);
    expect(result.label).toBe('83%');
  });

  it('returns calculating for a near-zero denominator', () => {
    expect(
      calculateHeatRecovery({ outdoor: 20, extract: 20.4, supply: 20.2, method: 'automatic' }),
    ).toMatchObject({ label: 'Calculating', status: 'calculating' });
  });

  it('returns unavailable when a required temperature is missing', () => {
    expect(
      calculateHeatRecovery({ outdoor: 8.1, extract: 21.2, method: 'automatic' }),
    ).toMatchObject({ label: 'Unavailable', status: 'unavailable' });
  });

  it('does not calculate during cooling-season conditions', () => {
    expect(
      calculateHeatRecovery({ outdoor: 27, extract: 22, supply: 24, method: 'automatic' }),
    ).toMatchObject({ label: 'Not applicable', status: 'not_applicable' });
  });

  it('rejects physically implausible output', () => {
    expect(
      calculateHeatRecovery({ outdoor: 8, extract: 18, supply: 25, method: 'automatic' }),
    ).toMatchObject({ label: 'Not applicable', status: 'not_applicable' });
  });

  it('can be disabled by configuration', () => {
    expect(
      calculateHeatRecovery({ outdoor: 8.1, extract: 21.2, supply: 19.0, method: 'disabled' }),
    ).toMatchObject({ label: 'Disabled', status: 'not_applicable' });
  });
});
