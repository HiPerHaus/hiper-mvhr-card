import type { CapabilityProfile } from '../types/capability';

// Q350 / Q450 / Q600 share a control platform per the project brief and are
// treated as one profile — see docs/manufacturers/zehnder-comfoair-q.md and
// docs/architecture.md §13 for the assumption this rests on.
export const zehnderComfoAirQProfile: CapabilityProfile = {
  id: 'zehnder-comfoair-q',
  // Self-contained display name (shown alone in the card header, Phase 2) —
  // includes the brand so it reads correctly without needing `vendor`
  // concatenated alongside it.
  name: 'Zehnder ComfoAir Q',
  vendor: 'Zehnder',
  models: ['Q350', 'Q450', 'Q600'],
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
