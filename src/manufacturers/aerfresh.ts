import type { CapabilityProfile } from '../types/capability';

// 300 / 450 are "Vent-Axia based" per the project brief and are treated as
// one profile — see docs/manufacturers/aerfresh.md and
// docs/architecture.md §13 for the assumption this rests on.
export const aerfreshProfile: CapabilityProfile = {
  id: 'aerfresh',
  name: 'Aerofresh',
  vendor: 'Aerofresh (Vent-Axia)',
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
  },
};
