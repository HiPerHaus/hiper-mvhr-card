import type { EntityRoleId } from '../types/entity-roles';

/**
 * Home Assistant's Material Design Icons, referenced by name only (rendered
 * via HA's own `<ha-icon icon="mdi:...">`, which HA supplies at runtime —
 * no icon package is bundled with this card). Pure presentation lookup, no
 * domain logic — see src/components/hiper-mvhr-card.ts for how it's used.
 */
const ROLE_ICONS: Partial<Record<EntityRoleId, string>> = {
  mode: 'mdi:fan',
  outdoor_air_temp: 'mdi:thermometer',
  supply_air_temp: 'mdi:thermometer',
  extract_air_temp: 'mdi:thermometer',
  exhaust_air_temp: 'mdi:thermometer',
  supply_airflow: 'mdi:weather-windy',
  extract_airflow: 'mdi:weather-windy',
  bypass_state: 'mdi:valve',
  filter_remaining: 'mdi:air-filter',
  fault_active: 'mdi:alert-circle',
  frost_protection_active: 'mdi:snowflake-alert',
};

export function getRoleIcon(role: EntityRoleId): string | undefined {
  return ROLE_ICONS[role];
}
