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
  });

  it('rejects a non-object config', () => {
    expect(() => parseConfig(null)).toThrow(ConfigValidationError);
    expect(() => parseConfig('altair')).toThrow(ConfigValidationError);
  });

  it('throws a clear error when manufacturer is missing', () => {
    expect(() => parseConfig({})).toThrow(/manufacturer.*required/i);
  });

  it('throws a clear error for an unknown manufacturer', () => {
    expect(() => parseConfig({ manufacturer: 'not-a-real-brand' })).toThrow(/unknown manufacturer/i);
  });

  it('throws for an invalid display_mode value', () => {
    expect(() => parseConfig({ manufacturer: 'generic', display_mode: 'expert' })).toThrow(
      ConfigValidationError,
    );
  });

  it('accepts both display_mode values implemented this phase (commissioning is not one of them yet)', () => {
    for (const display_mode of ['homeowner', 'detailed']) {
      expect(() => parseConfig({ manufacturer: 'generic', display_mode })).not.toThrow();
    }
    expect(() => parseConfig({ manufacturer: 'generic', display_mode: 'commissioning' })).toThrow(
      ConfigValidationError,
    );
  });

  it('keeps only known entity roles, silently ignoring unrecognised ones', () => {
    const result = parseConfig({
      manufacturer: 'generic',
      entities: { supply_air_temp: 'sensor.a', not_a_real_role: 'sensor.b' },
    });
    expect(result.entities).toEqual({ supply_air_temp: 'sensor.a' });
  });

  it('throws when an entity id is not a non-empty string', () => {
    expect(() => parseConfig({ manufacturer: 'generic', entities: { supply_air_temp: '' } })).toThrow(
      ConfigValidationError,
    );
    expect(() => parseConfig({ manufacturer: 'generic', entities: { supply_air_temp: 42 } })).toThrow(
      ConfigValidationError,
    );
  });

  it('parses feature_flags, ignoring unknown roles', () => {
    const result = parseConfig({
      manufacturer: 'generic',
      feature_flags: { supply_air_temp: true, bogus_role: true },
    });
    expect(result.feature_flags).toEqual({ supply_air_temp: true });
  });

  it('rejects "entities" or "feature_flags" that are arrays', () => {
    expect(() => parseConfig({ manufacturer: 'generic', entities: [] })).toThrow(ConfigValidationError);
    expect(() => parseConfig({ manufacturer: 'generic', feature_flags: [] })).toThrow(ConfigValidationError);
  });
});
