/**
 * Phase 1 implements a subset of the full entity role table in
 * SPECIFICATION.md §2 — exactly the roles needed for the initial card
 * interface (docs/architecture.md §4: roles are additive, so this list only
 * grows in later phases, it never needs to be redefined or migrated).
 */
export const ENTITY_ROLES = [
  'mode',
  'outdoor_air_temp',
  'supply_air_temp',
  'extract_air_temp',
  'exhaust_air_temp',
  'supply_airflow',
  'extract_airflow',
  'bypass_state',
] as const;

export type EntityRoleId = (typeof ENTITY_ROLES)[number];
