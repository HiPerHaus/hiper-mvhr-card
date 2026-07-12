import { describe, it, expect } from 'vitest';
import { resolveSnapshot } from '../../src/data/entity-resolver';
import { resolveCapabilities } from '../../src/data/capability-resolver';
import { altairHass } from '../fixtures/hass-altair-160';
import { aerfreshHass } from '../fixtures/hass-aerfresh';
import type { HomeAssistant } from '../../src/types/hass';

describe('resolveSnapshot', () => {
  const altairProfile = resolveCapabilities('altair');

  it('marks unsupported roles as unsupported regardless of what config maps', () => {
    const snapshot = resolveSnapshot(altairHass, altairProfile, {
      bypass_state: 'binary_sensor.doesnt_matter',
    });
    expect(snapshot.bypass_state?.status).toBe('unsupported');
  });

  it('marks a supported-but-unmapped role as not_configured', () => {
    const snapshot = resolveSnapshot(altairHass, altairProfile, {});
    expect(snapshot.supply_air_temp?.status).toBe('not_configured');
  });

  it('marks a mapped entity that is unavailable as unavailable, not a crash', () => {
    const aerfreshProfile = resolveCapabilities('aerfresh');
    const snapshot = resolveSnapshot(aerfreshHass, aerfreshProfile, {
      extract_air_temp: 'sensor.aerofresh_extract_temp',
    });
    expect(snapshot.extract_air_temp?.status).toBe('unavailable');
  });

  it('marks a mapped entity that does not exist at all as unavailable, not a throw', () => {
    expect(() =>
      resolveSnapshot(altairHass, altairProfile, { supply_air_temp: 'sensor.does_not_exist' }),
    ).not.toThrow();
    const snapshot = resolveSnapshot(altairHass, altairProfile, {
      supply_air_temp: 'sensor.does_not_exist',
    });
    expect(snapshot.supply_air_temp?.status).toBe('unavailable');
  });

  it('resolves a mapped, available entity to its value and unit', () => {
    const snapshot = resolveSnapshot(altairHass, altairProfile, {
      supply_air_temp: 'sensor.altair_supply_temp',
    });
    expect(snapshot.supply_air_temp).toMatchObject({
      status: 'ok',
      value: '19.4',
      unit: '°C',
      numericValue: 19.4,
    });
  });

  it('leaves numericValue undefined for a non-numeric state', () => {
    const snapshot = resolveSnapshot(altairHass, altairProfile, { mode: 'select.altair_mode' });
    expect(snapshot.mode).toMatchObject({ status: 'ok', value: 'normal' });
    expect(snapshot.mode && 'numericValue' in snapshot.mode ? snapshot.mode.numericValue : undefined).toBeUndefined();
  });

  it('treats an empty states object as every mapped role being unavailable', () => {
    const emptyHass: HomeAssistant = { states: {} };
    const snapshot = resolveSnapshot(emptyHass, altairProfile, {
      supply_air_temp: 'sensor.altair_supply_temp',
    });
    expect(snapshot.supply_air_temp?.status).toBe('unavailable');
  });
});
