import { MANUFACTURER_IDS, type ManufacturerId } from '../types/manufacturer';
import { ENTITY_ROLES, type EntityRoleId } from '../types/entity-roles';
import type { HiperMvhrCardConfig, ViewMode } from '../types/config';

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

const DEFAULT_VIEW: ViewMode = 'homeowner';
const VIEW_MODES: ViewMode[] = ['homeowner', 'installer', 'commissioning'];

function isEntityRole(value: string): value is EntityRoleId {
  return (ENTITY_ROLES as readonly string[]).includes(value);
}

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

  const view = (config.view ?? DEFAULT_VIEW) as ViewMode;
  if (!VIEW_MODES.includes(view)) {
    throw new ConfigValidationError(
      `hiper-mvhr-card: invalid "view" value "${String(config.view)}". Expected one of: ${VIEW_MODES.join(', ')}`,
    );
  }

  if (config.name !== undefined && typeof config.name !== 'string') {
    throw new ConfigValidationError('hiper-mvhr-card: "name" must be a string if provided');
  }

  const rawEntities = config.entities ?? {};
  if (typeof rawEntities !== 'object' || Array.isArray(rawEntities) || rawEntities === null) {
    throw new ConfigValidationError('hiper-mvhr-card: "entities" must be a mapping of role to entity id');
  }
  const entities: Partial<Record<EntityRoleId, string>> = {};
  for (const [role, entityId] of Object.entries(rawEntities as Record<string, unknown>)) {
    if (!isEntityRole(role)) {
      console.warn(`hiper-mvhr-card: ignoring unknown entity role "${role}" in config`);
      continue;
    }
    if (typeof entityId !== 'string' || entityId.length === 0) {
      throw new ConfigValidationError(
        `hiper-mvhr-card: entity id for role "${role}" must be a non-empty string`,
      );
    }
    entities[role] = entityId;
  }

  const rawFlags = config.feature_flags ?? {};
  if (typeof rawFlags !== 'object' || Array.isArray(rawFlags) || rawFlags === null) {
    throw new ConfigValidationError('hiper-mvhr-card: "feature_flags" must be a mapping of role to boolean');
  }
  const featureFlags: Partial<Record<EntityRoleId, boolean>> = {};
  for (const [role, enabled] of Object.entries(rawFlags as Record<string, unknown>)) {
    if (!isEntityRole(role)) {
      console.warn(`hiper-mvhr-card: ignoring unknown feature flag role "${role}" in config`);
      continue;
    }
    featureFlags[role] = Boolean(enabled);
  }

  return {
    type: 'custom:hiper-mvhr-card',
    name: config.name as string | undefined,
    manufacturer,
    view,
    entities,
    feature_flags: featureFlags,
  };
}
