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
  shower_pipe_temperature: 'mdi:thermometer-water',
  shower_temperature_rise: 'mdi:thermometer-chevron-up',
  shower_detection_window: 'mdi:timer-outline',
  shower_rearm_temperature_drop: 'mdi:thermometer-chevron-down',
};

export function getRoleIcon(role: EntityRoleId): string | undefined {
  return ROLE_ICONS[role];
}
