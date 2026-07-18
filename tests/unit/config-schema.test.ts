import { describe, it, expect } from 'vitest';
import { parseConfig, ConfigValidationError } from '../../src/data/config-schema';

describe('parseConfig', () => {
  it('parses a minimal valid config and fills in sensible defaults', () => {
    const result = parseConfig({ manufacturer: 'generic' });
    expect(result.manufacturer).toBe('generic');
    expect(result.display_mode).toBe('homeowner');
    expect(result.entities).toEqual({});
    expect(result.feature_flags).toEqual({});
    expect(result.type).toBe('custom:hiper-mvhr-card');
    expect(result.show_airflow_on_all_paths).toBe(false);
    expect(result.show_controls).toBe(true);
    expect(result.show_fan_speeds).toBe(true);
    expect(result.show_filter).toBe(true);
    expect(result.show_calibration).toBe(true);
    expect(result.filter_max_days).toBe(365);
    expect(result.max_airflow).toBeUndefined();
    expect(result.heat_recovery_method).toBe('automatic');
  });

  it('accepts a positive maximum airflow', () => {
    expect(parseConfig({ manufacturer: 'altair', max_airflow: 120 }).max_airflow).toBe(120);
    expect(() => parseConfig({ manufacturer: 'altair', max_airflow: 0 })).toThrow(
      '"max_airflow" must be a positive number',
    );
  });

  it('rejects a non-object config', () => {
    expect(() => parseConfig(null)).toThrow(ConfigValidationError);
    expect(() => parseConfig('altair')).toThrow(ConfigValidationError);
  });

  it('throws a clear error when manufacturer is missing', () => {
    expect(() => parseConfig({})).toThrow(/manufacturer.*required/i);
  });

  it('throws a clear error for an unknown manufacturer', () => {
    expect(() => parseConfig({ manufacturer: 'not-a-real-brand' })).toThrow(
      /unknown manufacturer/i,
    );
  });

  it('throws for an invalid display_mode value', () => {
    expect(() => parseConfig({ manufacturer: 'generic', display_mode: 'expert' })).toThrow(
      ConfigValidationError,
    );
  });

  it('accepts all three display_mode values implemented so far (commissioning is not one of them yet)', () => {
    for (const display_mode of ['homeowner', 'detailed', 'system']) {
      expect(() => parseConfig({ manufacturer: 'generic', display_mode })).not.toThrow();
    }
    expect(() => parseConfig({ manufacturer: 'generic', display_mode: 'commissioning' })).toThrow(
      ConfigValidationError,
    );
  });

  it('display_mode: system parses like any other display mode, and the old "view" key is never reintroduced', () => {
    const result = parseConfig({
      manufacturer: 'altair',
      display_mode: 'system',
      // A stray "view" key (the old, pre-Phase-2 config field name) must be
      // silently ignored like any other unrecognised top-level key — it
      // must never be read as an alias for display_mode.
      view: 'homeowner',
    });
    expect(result.display_mode).toBe('system');
    expect(result).not.toHaveProperty('view');
  });

  it('keeps only known entity roles, silently ignoring unrecognised ones', () => {
    const result = parseConfig({
      manufacturer: 'generic',
      entities: { supply_air_temp: 'sensor.a', not_a_real_role: 'sensor.b' },
    });
    expect(result.entities).toEqual({ supply_air_temp: 'sensor.a' });
  });

  it('accepts Altair-friendly entity aliases without breaking canonical role names', () => {
    const result = parseConfig({
      manufacturer: 'altair',
      entities: {
        supply_temperature: 'sensor.altair_mvhr_supply_air_temperature',
        extract_temperature: 'sensor.altair_mvhr_extract_air_temperature',
        outdoor_temperature: 'sensor.altair_mvhr_outdoor_air_temperature',
        exhaust_temperature: 'sensor.altair_mvhr_exhaust_air_temperature',
        filter_days: 'sensor.altair_mvhr_filter_days_remaining',
        last_airflow_calibration: 'sensor.altair_mvhr_last_airflow_calibration',
      },
    });

    expect(result.entities).toMatchObject({
      supply_air_temp: 'sensor.altair_mvhr_supply_air_temperature',
      extract_air_temp: 'sensor.altair_mvhr_extract_air_temperature',
      outdoor_air_temp: 'sensor.altair_mvhr_outdoor_air_temperature',
      exhaust_air_temp: 'sensor.altair_mvhr_exhaust_air_temperature',
      filter_remaining: 'sensor.altair_mvhr_filter_days_remaining',
      last_calibration: 'sensor.altair_mvhr_last_airflow_calibration',
    });
  });

  it('throws when an entity id is not a non-empty string', () => {
    expect(() =>
      parseConfig({ manufacturer: 'generic', entities: { supply_air_temp: '' } }),
    ).toThrow(ConfigValidationError);
    expect(() =>
      parseConfig({ manufacturer: 'generic', entities: { supply_air_temp: 42 } }),
    ).toThrow(ConfigValidationError);
  });

  it('parses feature_flags, ignoring unknown roles', () => {
    const result = parseConfig({
      manufacturer: 'generic',
      feature_flags: { supply_air_temp: true, bogus_role: true },
    });
    expect(result.feature_flags).toEqual({ supply_air_temp: true });
  });

  it('rejects "entities" or "feature_flags" that are arrays', () => {
    expect(() => parseConfig({ manufacturer: 'generic', entities: [] })).toThrow(
      ConfigValidationError,
    );
    expect(() => parseConfig({ manufacturer: 'generic', feature_flags: [] })).toThrow(
      ConfigValidationError,
    );
  });

  it('rejects a non-boolean feature flag value instead of coercing it', () => {
    // Boolean("false") === true in JS — a naive `Boolean(enabled)` coercion
    // would silently enable the flag on exactly the typo a YAML author is
    // most likely to make. Must throw, not coerce.
    expect(() =>
      parseConfig({ manufacturer: 'generic', feature_flags: { supply_air_temp: 'false' } }),
    ).toThrow(ConfigValidationError);
    expect(() =>
      parseConfig({ manufacturer: 'generic', feature_flags: { supply_air_temp: 1 } }),
    ).toThrow(ConfigValidationError);
    expect(() =>
      parseConfig({ manufacturer: 'generic', feature_flags: { supply_air_temp: null } }),
    ).toThrow(ConfigValidationError);
  });

  it('validates new dashboard options', () => {
    const result = parseConfig({
      manufacturer: 'altair',
      show_airflow_on_all_paths: true,
      show_controls: false,
      show_fan_speeds: false,
      show_filter: false,
      show_calibration: false,
      filter_max_days: 180,
      heat_recovery_method: 'disabled',
    });

    expect(result.show_airflow_on_all_paths).toBe(true);
    expect(result.show_controls).toBe(false);
    expect(result.show_fan_speeds).toBe(false);
    expect(result.show_filter).toBe(false);
    expect(result.show_calibration).toBe(false);
    expect(result.filter_max_days).toBe(180);
    expect(result.heat_recovery_method).toBe('disabled');

    expect(() => parseConfig({ manufacturer: 'altair', filter_max_days: 0 })).toThrow(
      ConfigValidationError,
    );
    expect(() => parseConfig({ manufacturer: 'altair', heat_recovery_method: 'magic' })).toThrow(
      ConfigValidationError,
    );
  });

  it('defaults the system-mode-only options to true and lets them be turned off', () => {
    const defaults = parseConfig({ manufacturer: 'altair', display_mode: 'system' });
    expect(defaults.show_airflow_animation).toBe(true);
    expect(defaults.show_advanced_controls).toBe(true);

    const disabled = parseConfig({
      manufacturer: 'altair',
      display_mode: 'system',
      show_airflow_animation: false,
      show_advanced_controls: false,
    });
    expect(disabled.show_airflow_animation).toBe(false);
    expect(disabled.show_advanced_controls).toBe(false);
  });
});
