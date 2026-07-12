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

  it('altair still supports its other core roles', () => {
    const profile = resolveCapabilities('altair');
    expect(profile.supportedRoles.supply_air_temp).toBeDefined();
    expect(profile.supportedRoles.mode).toBeDefined();
  });

  it('zehnder-comfoair-q supports bypass_state by default', () => {
    const profile = resolveCapabilities('zehnder-comfoair-q');
    expect(profile.supportedRoles.bypass_state).toBeDefined();
  });

  it('aerfresh supports bypass_state by default', () => {
    const profile = resolveCapabilities('aerfresh');
    expect(profile.supportedRoles.bypass_state).toBeDefined();
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
