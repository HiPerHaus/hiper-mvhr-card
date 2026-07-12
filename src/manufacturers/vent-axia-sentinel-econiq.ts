import type { CapabilityProfile } from '../types/capability';

// Sold under the Aerofresh brand; the underlying control platform is
// Vent-Axia's Sentinel Econiq (300 / 450 capacities), which is why this
// profile's technical id is `vent_axia_sentinel_econiq` rather than
// `aerfresh` — but every user-facing string on this profile must read
// "Aerofresh" and never mention Vent-Axia or the platform id. See
// docs/manufacturers/aerofresh.md.
export const ventAxiaSentinelEconiqProfile: CapabilityProfile = {
  id: 'vent_axia_sentinel_econiq',
  name: 'Aerofresh',
  vendor: 'Aerofresh',
  models: ['300', '450'],
  supportedRoles: {
    mode: {},
    outdoor_air_temp: {},
    supply_air_temp: {},
    extract_air_temp: {},
    exhaust_air_temp: {},
    supply_airflow: {},
    extract_airflow: {},
    bypass_state: {},
    filter_remaining: {},
    fault_active: {},
    frost_protection_active: {},
  },
};
