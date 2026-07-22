/**
 * Phase 1 implements a subset of the full entity role table in
 * SPECIFICATION.md §2 — exactly the roles needed for the initial card
 * interface (docs/architecture.md §4: roles are additive, so this list only
 * grows in later phases, it never needs to be redefined or migrated).
 */
export const ENTITY_ROLES = [
  'mode',
  'effective_mode',
  'stop_control',
  'outdoor_air_temp',
  'supply_air_temp',
  'extract_air_temp',
  'exhaust_air_temp',
  'supply_airflow',
  'extract_airflow',
  'airflow',
  'target_airflow',
  'maximum_airflow',
  'away_airflow',
  'low_airflow',
  'home_airflow',
  'high_airflow',
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
  'calibration_available',
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
  // Added in the system-mode visual-polish follow-up (round 2): action roles,
  // same shape as `filter_reset_control` above — fire-and-forget "press"
  // controls for airflow calibration. Altair now declares these supported
  // because ha-altair-mvhr exposes start/cancel controls; other profiles can
  // opt in via feature_flags when their integrations expose equivalents.
  'calibration_start_control',
  'calibration_cancel_control',
  // Added for the system-mode visual redesign's shower-detection panel: a
  // generic "was a shower just detected, and what temperature triggered/will
  // rearm it" concept, not an Altair-only idea — any manufacturer profile
  // that wires up an equivalent detector can declare these supported the
  // same way Altair does. `shower_pipe_temperature` is the raw hot-water
  // pipe sensor feeding the detector (typically a foreign/ESPHome entity,
  // not part of the MVHR integration itself, but still just an optional
  // role like any other); `shower_trigger_temperature` is the stored pipe
  // temperature at the moment a shower was detected. Newer integrations
  // may also expose separate peak and re-arm threshold sensors so the card
  // can display the backend's live calculation directly.
  'shower_detected',
  'shower_trigger_temperature',
  'shower_peak_temperature',
  'shower_rearm_temperature',
  'shower_pipe_temperature',
  // Editable shower-detector settings exposed by backend integrations that
  // support configurable auto-boost detection. These are number/input_number
  // roles, not diagnostics: they tune the configured temperature rise and
  // rolling detection window, and re-arm temperature drop while preserving
  // the trigger-temperature role's meaning as the actual temperature at
  // the most recent trigger. `shower_rearm_temperature_drop` remains an
  // editable setting; the displayed re-arm temperature comes from the
  // backend `shower_rearm_temperature` role when mapped.
  'shower_temperature_rise',
  'shower_detection_window',
  'shower_rearm_temperature_drop',
  // Optional MVHR performance analytics. These roles are deliberately
  // display-only and additive: integrations can expose any subset of live
  // recovered power, recovered energy totals, money saved, and avoided
  // emissions, and the card will render only the values that actually exist.
  'heat_recovery',
  'cooling_recovery',
  'heat_recovery_efficiency',
  'heating_recovered_today',
  'heating_recovered_month',
  'heating_recovered_lifetime',
  'cooling_recovered_today',
  'cooling_recovered_month',
  'cooling_recovered_lifetime',
  'heating_savings_today',
  'heating_savings_lifetime',
  'cooling_savings_today',
  'cooling_savings_lifetime',
  'avoided_emissions_today',
  'avoided_emissions_lifetime',
] as const;

export type EntityRoleId = (typeof ENTITY_ROLES)[number];
