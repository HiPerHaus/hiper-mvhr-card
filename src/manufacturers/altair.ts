import type { CapabilityProfile } from '../types/capability';

export const altairProfile: CapabilityProfile = {
  id: 'altair',
  name: 'Altair 160',
  vendor: 'Altair',
  models: ['160'],
  supportedRoles: {
    mode: {},
    outdoor_air_temp: {},
    supply_air_temp: {},
    extract_air_temp: {},
    exhaust_air_temp: {},
    supply_airflow: {},
    extract_airflow: {},
    filter_remaining: {},
    fault_active: {},
    frost_protection_active: {},
    // bypass_state is intentionally absent — see unsupportedRoles below.
  },
  // Confirmed product fact, not a "not configured yet" default: the Altair
  // 160 has no summer bypass. See docs/manufacturers/altair.md.
  unsupportedRoles: ['bypass_state'],
};
