import { describe, it, expect } from 'vitest';
import { resolveCapabilities } from '../../src/data/capability-resolver';

describe('resolveCapabilities', () => {
  it('altair does not support bypass_state by default', () => {
    const profile = resolveCapabilities('altair');
    expect(profile.supportedRoles.bypass_state).toBeUndefined();
  });

  it('altair bypass_state cannot be forced on via feature flags — hard product constraint', () => {
    const profile = resolveCapabilities('altair', { bypass_state: true });
    expect(profile.supportedRoles.bypass_state).toBeUndefined();
  });

  it('altair still supports its other core roles, including the Phase 2 additions', () => {
    const profile = resolveCapabilities('altair');
    expect(profile.supportedRoles.supply_air_temp).toBeDefined();
    expect(profile.supportedRoles.mode).toBeDefined();
    expect(profile.supportedRoles.filter_remaining).toBeDefined();
    expect(profile.supportedRoles.fault_active).toBeDefined();
    expect(profile.supportedRoles.frost_protection_active).toBeDefined();
  });

  it('zehnder-comfoair-q supports bypass_state and the Phase 2 status roles by default', () => {
    const profile = resolveCapabilities('zehnder-comfoair-q');
    expect(profile.supportedRoles.bypass_state).toBeDefined();
    expect(profile.supportedRoles.filter_remaining).toBeDefined();
    expect(profile.supportedRoles.fault_active).toBeDefined();
    expect(profile.supportedRoles.frost_protection_active).toBeDefined();
  });

  it('vent_axia_sentinel_econiq (Aerofresh) supports bypass_state and the Phase 2 status roles by default', () => {
    const profile = resolveCapabilities('vent_axia_sentinel_econiq');
    expect(profile.supportedRoles.bypass_state).toBeDefined();
    expect(profile.supportedRoles.filter_remaining).toBeDefined();
    expect(profile.supportedRoles.fault_active).toBeDefined();
    expect(profile.supportedRoles.frost_protection_active).toBeDefined();
  });

  it('the Aerofresh profile never exposes the internal platform id as its display name or vendor', () => {
    const profile = resolveCapabilities('vent_axia_sentinel_econiq');
    expect(profile.name.toLowerCase()).not.toContain('vent');
    expect(profile.name.toLowerCase()).not.toContain('econiq');
    expect(profile.vendor.toLowerCase()).not.toContain('vent');
    expect(profile.name).toBe('Aerofresh');
    expect(profile.vendor).toBe('Aerofresh');
  });

  it('generic supports nothing by default', () => {
    const profile = resolveCapabilities('generic');
    expect(Object.keys(profile.supportedRoles)).toHaveLength(0);
  });

  it('generic can have a role turned on via feature flags', () => {
    const profile = resolveCapabilities('generic', { supply_air_temp: true });
    expect(profile.supportedRoles.supply_air_temp).toBeDefined();
  });

  it('feature flags can disable a role a profile normally supports', () => {
    const profile = resolveCapabilities('zehnder-comfoair-q', { bypass_state: false });
    expect(profile.supportedRoles.bypass_state).toBeUndefined();
  });

  it('does not mutate the underlying profile registry', () => {
    resolveCapabilities('generic', { supply_air_temp: true });
    const fresh = resolveCapabilities('generic');
    expect(fresh.supportedRoles.supply_air_temp).toBeUndefined();
  });
});
