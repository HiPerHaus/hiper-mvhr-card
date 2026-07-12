import type { CapabilityProfile } from '../types/capability';

// Q350 / Q450 / Q600 share a control platform per the project brief and are
// treated as one profile — see docs/manufacturers/zehnder-comfoair-q.md and
// docs/architecture.md §13 for the assumption this rests on.
export const zehnderComfoAirQProfile: CapabilityProfile = {
  id: 'zehnder-comfoair-q',
  name: 'ComfoAir Q',
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
  },
};
