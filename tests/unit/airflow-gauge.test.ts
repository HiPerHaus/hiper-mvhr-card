import { describe, expect, it } from 'vitest';
import { calculateAirflowGauge } from '../../src/utils/airflow-gauge';

describe('calculateAirflowGauge', () => {
  it.each([
    [0, 0],
    [60, 0.5],
    [95, 95 / 120],
    [120, 1],
    [150, 1],
  ])('scales %s m³/h against 120 m³/h', (current, fraction) => {
    expect(calculateAirflowGauge({ current, configuredMaximum: 120 }).fraction).toBeCloseTo(
      fraction,
    );
  });

  it('uses configured, entity, high preset, and manufacturer values in priority order', () => {
    const base = {
      current: 60,
      configuredMaximum: 120,
      entityMaximum: 110,
      presetHigh: 100,
      manufacturerMaximum: 90,
      mappedLevel: 2,
    };
    expect(calculateAirflowGauge(base)).toMatchObject({ source: 'configured', maximum: 120 });
    expect(calculateAirflowGauge({ ...base, configuredMaximum: undefined })).toMatchObject({
      source: 'entity',
      maximum: 110,
    });
    expect(
      calculateAirflowGauge({ ...base, configuredMaximum: undefined, entityMaximum: undefined }),
    ).toMatchObject({ source: 'preset_high', maximum: 100 });
    expect(
      calculateAirflowGauge({
        ...base,
        configuredMaximum: undefined,
        entityMaximum: undefined,
        presetHigh: undefined,
      }),
    ).toMatchObject({ source: 'manufacturer', maximum: 90 });
  });

  it('uses mapped level only as the final fallback', () => {
    expect(calculateAirflowGauge({ current: 70, mappedLevel: 4 })).toEqual({
      fraction: 0.4,
      source: 'mapped_level',
    });
  });

  it('returns an empty neutral gauge when current airflow is unavailable', () => {
    expect(calculateAirflowGauge({ configuredMaximum: 120, mappedLevel: 8 })).toEqual({
      fraction: 0,
      source: 'unavailable',
    });
  });
});
