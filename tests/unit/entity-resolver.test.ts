import { describe, it, expect } from 'vitest';
import { resolveSnapshot } from '../../src/data/entity-resolver';
import { resolveCapabilities } from '../../src/data/capability-resolver';
import { altairHass } from '../fixtures/hass-altair-160';
import { aerofreshHass } from '../fixtures/hass-aerofresh';
import { zehnderHass } from '../fixtures/hass-zehnder-comfoair-q';
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

  it('marks a mapped entity whose state is "unavailable" as unavailable (entity exists)', () => {
    const aerofreshProfile = resolveCapabilities('vent_axia_sentinel_econiq');
    const snapshot = resolveSnapshot(aerofreshHass, aerofreshProfile, {
      extract_air_temp: 'sensor.aerofresh_extract_temp',
    });
    expect(snapshot.extract_air_temp).toMatchObject({ status: 'unavailable' });
    // Distinct from entity_missing: the entity genuinely exists in hass.states.
    expect(aerofreshHass.states['sensor.aerofresh_extract_temp']).toBeDefined();
  });

  it('marks a mapped entity that Home Assistant has no record of as entity_missing, not unavailable', () => {
    const snapshot = resolveSnapshot(altairHass, altairProfile, {
      supply_air_temp: 'sensor.does_not_exist',
    });
    expect(snapshot.supply_air_temp).toMatchObject({
      status: 'entity_missing',
      entityId: 'sensor.does_not_exist',
    });
  });

  it('never throws for a missing entity — it is a normal state, not an error', () => {
    expect(() =>
      resolveSnapshot(altairHass, altairProfile, { supply_air_temp: 'sensor.does_not_exist' }),
    ).not.toThrow();
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

  it('resolves a valid zero reading as "ok" with numericValue 0, never as unavailable', () => {
    const zehnderProfile = resolveCapabilities('zehnder-comfoair-q');
    const snapshot = resolveSnapshot(zehnderHass, zehnderProfile, {
      filter_remaining: 'sensor.comfoair_filter_remaining',
    });
    expect(snapshot.filter_remaining).toMatchObject({
      status: 'ok',
      value: '0',
      numericValue: 0,
      unit: '%',
    });
  });

  it('leaves numericValue undefined for a non-numeric state', () => {
    const snapshot = resolveSnapshot(altairHass, altairProfile, { mode: 'select.altair_mode' });
    expect(snapshot.mode).toMatchObject({ status: 'ok', value: 'normal' });
    expect(snapshot.mode && 'numericValue' in snapshot.mode ? snapshot.mode.numericValue : undefined).toBeUndefined();
  });

  it('treats an empty states object as every mapped role being entity_missing', () => {
    const emptyHass: HomeAssistant = { states: {} };
    const snapshot = resolveSnapshot(emptyHass, altairProfile, {
      supply_air_temp: 'sensor.altair_supply_temp',
    });
    expect(snapshot.supply_air_temp?.status).toBe('entity_missing');
  });

  it('treats a button entity in state "unknown" as ok, not unavailable — that is its normal never-pressed idle state', () => {
    const genericProfile = resolveCapabilities('generic', { filter_reset_control: true });
    const hass: HomeAssistant = {
      states: {
        'button.mvhr_filter_reset': {
          entity_id: 'button.mvhr_filter_reset',
          state: 'unknown',
          attributes: {},
        },
      },
    };
    const snapshot = resolveSnapshot(hass, genericProfile, {
      filter_reset_control: 'button.mvhr_filter_reset',
    });
    expect(snapshot.filter_reset_control?.status).toBe('ok');
  });

  it('still treats an input_button entity in state "unknown" as ok, the same as button', () => {
    const genericProfile = resolveCapabilities('generic', { filter_reset_control: true });
    const hass: HomeAssistant = {
      states: {
        'input_button.mvhr_filter_reset': {
          entity_id: 'input_button.mvhr_filter_reset',
          state: 'unknown',
          attributes: {},
        },
      },
    };
    const snapshot = resolveSnapshot(hass, genericProfile, {
      filter_reset_control: 'input_button.mvhr_filter_reset',
    });
    expect(snapshot.filter_reset_control?.status).toBe('ok');
  });

  it('still treats a button entity in state "unavailable" as unavailable — the exemption is only for "unknown"', () => {
    const genericProfile = resolveCapabilities('generic', { filter_reset_control: true });
    const hass: HomeAssistant = {
      states: {
        'button.mvhr_filter_reset': {
          entity_id: 'button.mvhr_filter_reset',
          state: 'unavailable',
          attributes: {},
        },
      },
    };
    const snapshot = resolveSnapshot(hass, genericProfile, {
      filter_reset_control: 'button.mvhr_filter_reset',
    });
    expect(snapshot.filter_reset_control?.status).toBe('unavailable');
  });

  it('does not extend the "unknown" exemption to ordinary sensor/select domains', () => {
    const hass: HomeAssistant = {
      states: { 'select.altair_mode': { entity_id: 'select.altair_mode', state: 'unknown', attributes: {} } },
    };
    const snapshot = resolveSnapshot(hass, altairProfile, { mode: 'select.altair_mode' });
    expect(snapshot.mode?.status).toBe('unavailable');
  });

  it('resolves the new Phase 2 status roles (filter, fault, frost protection) when configured', () => {
    const zehnderProfile = resolveCapabilities('zehnder-comfoair-q');
    const snapshot = resolveSnapshot(zehnderHass, zehnderProfile, {
      filter_remaining: 'sensor.comfoair_filter_remaining',
      fault_active: 'binary_sensor.comfoair_fault',
      frost_protection_active: 'binary_sensor.comfoair_frost_protection',
    });
    expect(snapshot.filter_remaining?.status).toBe('ok');
    expect(snapshot.fault_active).toMatchObject({ status: 'ok', value: 'off' });
    expect(snapshot.frost_protection_active).toMatchObject({ status: 'ok', value: 'on' });
  });
});
