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
  // Added for the system-mode Airflow gauge (fraction-source follow-up): a
  // fallback for `mapped_level` when that role isn't available — same 0-10
  // speed-level concept, just read from a different entity in case a
  // profile/installation doesn't expose `mapped_level` directly. Generic,
  // not Altair-specific — any profile can map it.
  'selected_speed',
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
  // Added in the system-mode visual-polish follow-up (round 2): a second
  // action role, same shape as `filter_reset_control` above — a
  // fire-and-forget "press" to kick off an airflow calibration run. Only
  // `generic` declares it supported by default (opt-in via feature_flags);
  // whether Altair/Zehnder/Aerofresh actually expose a manual calibration
  // trigger (vs. calibration only running automatically/via the
  // manufacturer's own app) is TBD per their docs/manufacturers/*.md — see
  // SPECIFICATION.md §3.
  'calibration_start_control',
  // Added for the system-mode visual redesign's shower-detection panel: a
  // generic "was a shower just detected, and what temperature triggered/will
  // rearm it" concept, not an Altair-only idea — any manufacturer profile
  // that wires up an equivalent detector can declare these supported the
  // same way Altair does. `shower_pipe_temperature` is the raw hot-water
  // pipe sensor feeding the detector (typically a foreign/ESPHome entity,
  // not part of the MVHR integration itself, but still just an optional
  // role like any other); `shower_trigger_temperature` is the stored pipe
  // temperature at the moment a shower was detected, from which the
  // component derives the rearm temperature (trigger - 10°C) — that
  // subtraction is fixed, generic UI math describing what these two roles
  // mean together, not a manufacturer conditional.
  'shower_detected',
  'shower_trigger_temperature',
  'shower_pipe_temperature',
] as const;

export type EntityRoleId = (typeof ENTITY_ROLES)[number];
