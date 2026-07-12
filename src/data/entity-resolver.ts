import { ENTITY_ROLES, type EntityRoleId } from '../types/entity-roles';
import type { CapabilityProfile } from '../types/capability';
import type { HomeAssistant } from '../types/hass';
import type { MvhrSnapshot } from '../types/snapshot';

const UNAVAILABLE_STATES = new Set(['unavailable', 'unknown']);

/**
 * Resolves configured entity IDs into a vendor-neutral snapshot, one entry
 * per role, in exactly one of four states (SPECIFICATION.md §6):
 *   1. unsupported    — profile doesn't declare this role
 *   2. not_configured  — profile supports it, config doesn't map an entity
 *   3. unavailable      — entity mapped, but missing or unavailable/unknown
 *   4. ok                — entity mapped and has a real value
 *
 * This function never throws on missing or unavailable entities — that's a
 * normal state, not an error. No manufacturer checks happen here; only
 * `profile.supportedRoles` is consulted.
 */
export function resolveSnapshot(
  hass: HomeAssistant,
  profile: CapabilityProfile,
  entities: Partial<Record<EntityRoleId, string>>,
): MvhrSnapshot {
  const snapshot: MvhrSnapshot = {};

  for (const role of ENTITY_ROLES) {
    if (!profile.supportedRoles[role]) {
      snapshot[role] = { status: 'unsupported' };
      continue;
    }

    const entityId = entities[role];
    if (!entityId) {
      snapshot[role] = { status: 'not_configured' };
      continue;
    }

    const entity = hass.states[entityId];
    if (!entity || UNAVAILABLE_STATES.has(entity.state)) {
      snapshot[role] = { status: 'unavailable' };
      continue;
    }

    const numericValue = Number(entity.state);
    snapshot[role] = {
      status: 'ok',
      value: entity.state,
      numericValue: Number.isFinite(numericValue) ? numericValue : undefined,
      unit:
        typeof entity.attributes?.unit_of_measurement === 'string'
          ? (entity.attributes.unit_of_measurement as string)
          : undefined,
      attributes: entity.attributes ?? {},
    };
  }

  return snapshot;
}
