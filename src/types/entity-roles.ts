/**
 * Phase 1 implements a subset of the full entity role table in
 * SPECIFICATION.md §2 — exactly the roles needed for the initial card
 * interface (docs/architecture.md §4: roles are additive, so this list only
 * grows in later phases, it never needs to be redefined or migrated).
 */
export const ENTITY_ROLES = [
  'mode',
  'effective_mode',
  'outdoor_air_temp',
  'supply_air_temp',
  'extract_air_temp',
  'exhaust_air_temp',
  'supply_airflow',
  'extract_airflow',
  'airflow',
  'target_airflow',
  'mapped_level',
  'supply_fan_speed',
  'extract_fan_speed',
  'indoor_humidity',
  'boost_active',
  'boost_remaining',
  'boost_duration',
  'start_boost',
  'cancel_boost',
  'override_duration',
  'override_remaining',
  'clear_override',
  'calibration_result',
  'calibration_status',
  'calibration_progress',
  'last_calibration',
  'bypass_state',
  // Added in Phase 2 for the system status section (ROADMAP.md Phase 2) —
  // all three already existed in the full SPECIFICATION.md §2 table, this
  // just promotes them into the implemented subset.
  'filter_remaining',
  'fault_active',
  'frost_protection_active',
  // Added in Phase 3A (ROADMAP.md) — the first interactive/action role. A
  // fire-and-forget "press" action with no value to read back (see
  // src/data/control-dispatcher.ts), unlike every role above. Only the
  // `generic` profile declares it supported today (opt-in via
  // feature_flags): filter resettability is still TBD for Altair, Zehnder,
  // and Aerofresh per their docs/manufacturers/*.md — see SPECIFICATION.md §3.
  // `mode_control` and `bypass_control` are specified in SPECIFICATION.md §2
  // but deliberately NOT added here yet — Phase 3B/3C, once mode/bypass
  // optimistic-value reconciliation exists to support them meaningfully.
  'filter_reset_control',
] as const;

export type EntityRoleId = (typeof ENTITY_ROLES)[number];
