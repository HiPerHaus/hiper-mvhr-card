import { MANUFACTURER_IDS, type ManufacturerId } from '../types/manufacturer';
import { ENTITY_ROLES, type EntityRoleId } from '../types/entity-roles';
import type { HiperMvhrCardConfig, DisplayMode, HeatRecoveryMethod } from '../types/config';

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

const DEFAULT_DISPLAY_MODE: DisplayMode = 'homeowner';
const DISPLAY_MODES: DisplayMode[] = ['homeowner', 'detailed', 'system'];
const HEAT_RECOVERY_METHODS: HeatRecoveryMethod[] = ['automatic', 'supply_temperature', 'disabled'];

function isEntityRole(value: string): value is EntityRoleId {
  return (ENTITY_ROLES as readonly string[]).includes(value);
}

const ENTITY_ROLE_ALIASES: Record<string, EntityRoleId> = {
  supply_temperature: 'supply_air_temp',
  extract_temperature: 'extract_air_temp',
  outdoor_temperature: 'outdoor_air_temp',
  exhaust_temperature: 'exhaust_air_temp',
  filter_days: 'filter_remaining',
  filter_days_remaining: 'filter_remaining',
  supply_fan: 'supply_fan_speed',
  extract_fan: 'extract_fan_speed',
  calibration: 'calibration_start_control',
  last_airflow_calibration: 'last_calibration',
};

/**
 * Parses and validates a raw Lovelace card config. Throws
 * ConfigValidationError for genuinely invalid configuration (missing/unknown
 * manufacturer, wrong types, invalid view). Unknown entity-role keys are
 * ignored with a console warning rather than a thrown error — mapping a role
 * this card doesn't (yet) know about isn't a fatal mistake, and later
 * versions may add that role — see SPECIFICATION.md §4.
 */
export function parseConfig(input: unknown): HiperMvhrCardConfig {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ConfigValidationError('hiper-mvhr-card: configuration must be an object');
  }
  const config = input as Record<string, unknown>;

  if (typeof config.manufacturer !== 'string' || config.manufacturer.length === 0) {
    throw new ConfigValidationError('hiper-mvhr-card: "manufacturer" is required');
  }
  if (!(MANUFACTURER_IDS as readonly string[]).includes(config.manufacturer)) {
    throw new ConfigValidationError(
      `hiper-mvhr-card: unknown manufacturer "${config.manufacturer}". Supported: ${MANUFACTURER_IDS.join(', ')}`,
    );
  }
  const manufacturer = config.manufacturer as ManufacturerId;

  const displayMode = (config.display_mode ?? DEFAULT_DISPLAY_MODE) as DisplayMode;
  if (!DISPLAY_MODES.includes(displayMode)) {
    throw new ConfigValidationError(
      `hiper-mvhr-card: invalid "display_mode" value "${String(config.display_mode)}". Expected one of: ${DISPLAY_MODES.join(', ')}`,
    );
  }

  if (config.name !== undefined && typeof config.name !== 'string') {
    throw new ConfigValidationError('hiper-mvhr-card: "name" must be a string if provided');
  }
  if (config.title !== undefined && typeof config.title !== 'string') {
    throw new ConfigValidationError('hiper-mvhr-card: "title" must be a string if provided');
  }
  if (config.subtitle !== undefined && typeof config.subtitle !== 'string') {
    throw new ConfigValidationError('hiper-mvhr-card: "subtitle" must be a string if provided');
  }

  const heatRecoveryMethod = (config.heat_recovery_method ?? 'automatic') as HeatRecoveryMethod;
  if (!HEAT_RECOVERY_METHODS.includes(heatRecoveryMethod)) {
    throw new ConfigValidationError(
      `hiper-mvhr-card: invalid "heat_recovery_method" value "${String(config.heat_recovery_method)}". Expected one of: ${HEAT_RECOVERY_METHODS.join(', ')}`,
    );
  }

  const filterMaxDays = config.filter_max_days ?? 365;
  if (typeof filterMaxDays !== 'number' || !Number.isFinite(filterMaxDays) || filterMaxDays <= 0) {
    throw new ConfigValidationError('hiper-mvhr-card: "filter_max_days" must be a positive number');
  }

  const maxAirflow = config.max_airflow;
  if (
    maxAirflow !== undefined &&
    (typeof maxAirflow !== 'number' || !Number.isFinite(maxAirflow) || maxAirflow <= 0)
  ) {
    throw new ConfigValidationError('hiper-mvhr-card: "max_airflow" must be a positive number');
  }

  const rawEntities = config.entities ?? {};
  if (typeof rawEntities !== 'object' || Array.isArray(rawEntities) || rawEntities === null) {
    throw new ConfigValidationError(
      'hiper-mvhr-card: "entities" must be a mapping of role to entity id',
    );
  }
  const entities: Partial<Record<EntityRoleId, string>> = {};
  for (const [role, entityId] of Object.entries(rawEntities as Record<string, unknown>)) {
    const resolvedRole = ENTITY_ROLE_ALIASES[role] ?? role;
    if (!isEntityRole(resolvedRole)) {
      console.warn(`hiper-mvhr-card: ignoring unknown entity role "${role}" in config`);
      continue;
    }
    if (typeof entityId !== 'string' || entityId.length === 0) {
      throw new ConfigValidationError(
        `hiper-mvhr-card: entity id for role "${role}" must be a non-empty string`,
      );
    }
    entities[resolvedRole] = entityId;
  }

  const rawFlags = config.feature_flags ?? {};
  if (typeof rawFlags !== 'object' || Array.isArray(rawFlags) || rawFlags === null) {
    throw new ConfigValidationError(
      'hiper-mvhr-card: "feature_flags" must be a mapping of role to boolean',
    );
  }
  const featureFlags: Partial<Record<EntityRoleId, boolean>> = {};
  for (const [role, enabled] of Object.entries(rawFlags as Record<string, unknown>)) {
    if (!isEntityRole(role)) {
      console.warn(`hiper-mvhr-card: ignoring unknown feature flag role "${role}" in config`);
      continue;
    }
    // Strict boolean check, not `Boolean(enabled)`: that coercion would make
    // the truthy *string* "false" enable the flag — a silent, dangerous
    // footgun for exactly the kind of typo a YAML config invites.
    if (typeof enabled !== 'boolean') {
      throw new ConfigValidationError(
        `hiper-mvhr-card: feature flag "${role}" must be true or false, got ${JSON.stringify(enabled)}`,
      );
    }
    featureFlags[role] = enabled;
  }

  return {
    type: 'custom:hiper-mvhr-card',
    name: config.name as string | undefined,
    title: config.title as string | undefined,
    subtitle: config.subtitle as string | undefined,
    manufacturer,
    display_mode: displayMode,
    entities,
    feature_flags: featureFlags,
    show_airflow_on_all_paths: config.show_airflow_on_all_paths === true,
    show_controls: config.show_controls !== false,
    show_fan_speeds: config.show_fan_speeds !== false,
    show_filter: config.show_filter !== false,
    show_calibration: config.show_calibration !== false,
    filter_max_days: filterMaxDays,
    max_airflow: maxAirflow as number | undefined,
    heat_recovery_method: heatRecoveryMethod,
    show_airflow_animation: config.show_airflow_animation !== false,
    show_advanced_controls: config.show_advanced_controls !== false,
  };
}
