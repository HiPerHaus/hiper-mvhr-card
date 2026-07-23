import type { EntityRoleId } from '../types/entity-roles';

/**
 * Home Assistant's Material Design Icons, referenced by name only (rendered
 * via HA's own `<ha-icon icon="mdi:...">`, which HA supplies at runtime —
 * no icon package is bundled with this card). Pure presentation lookup, no
 * domain logic — see src/components/hiper-mvhr-card.ts for how it's used.
 */
const ROLE_ICONS: Partial<Record<EntityRoleId, string>> = {
  mode: 'mdi:fan',
  stop_control: 'mdi:power',
  outdoor_air_temp: 'mdi:thermometer',
  supply_air_temp: 'mdi:thermometer',
  extract_air_temp: 'mdi:thermometer',
  exhaust_air_temp: 'mdi:thermometer',
  supply_airflow: 'mdi:weather-windy',
  extract_airflow: 'mdi:weather-windy',
  maximum_airflow: 'mdi:gauge-full',
  away_airflow: 'mdi:home-export-outline',
  low_airflow: 'mdi:fan-speed-1',
  home_airflow: 'mdi:home',
  high_airflow: 'mdi:fan-speed-3',
  bypass_state: 'mdi:valve',
  filter_remaining: 'mdi:air-filter',
  fault_active: 'mdi:alert-circle',
  frost_protection_active: 'mdi:snowflake-alert',
  filter_reset_control: 'mdi:restart',
  selected_speed: 'mdi:tune-variant',
  calibration_available: 'mdi:check-decagram',
  calibration_start_control: 'mdi:progress-wrench',
  calibration_cancel_control: 'mdi:cancel',
  shower_detected: 'mdi:shower-head',
  shower_trigger_temperature: 'mdi:thermometer-water',
  shower_peak_temperature: 'mdi:thermometer-high',
  shower_rearm_temperature: 'mdi:thermometer-chevron-down',
  shower_pipe_temperature: 'mdi:thermometer-water',
  shower_temperature_rise: 'mdi:thermometer-chevron-up',
  shower_detection_window: 'mdi:timer-outline',
  shower_rearm_temperature_drop: 'mdi:thermometer-chevron-down',
  heat_recovery: 'mdi:fire',
  cooling_recovery: 'mdi:snowflake',
  heat_recovery_efficiency: 'mdi:lightning-bolt',
  heating_recovered_today: 'mdi:fire',
  heating_recovered_month: 'mdi:fire',
  heating_recovered_lifetime: 'mdi:fire',
  cooling_recovered_today: 'mdi:snowflake',
  cooling_recovered_month: 'mdi:snowflake',
  cooling_recovered_lifetime: 'mdi:snowflake',
  heating_savings_today: 'mdi:cash',
  heating_savings_lifetime: 'mdi:cash',
  cooling_savings_today: 'mdi:cash',
  cooling_savings_lifetime: 'mdi:cash',
  avoided_emissions_today: 'mdi:leaf',
  avoided_emissions_lifetime: 'mdi:leaf',
  weekly_schedule: 'mdi:calendar-week',
  schedule_control: 'mdi:calendar-week',
  schedule_enabled: 'mdi:calendar-check',
  current_scheduled_mode: 'mdi:calendar-clock',
  next_scheduled_change: 'mdi:calendar-arrow-right',
  schedule_override_active: 'mdi:calendar-alert',
};

export function getRoleIcon(role: EntityRoleId): string | undefined {
  return ROLE_ICONS[role];
}
