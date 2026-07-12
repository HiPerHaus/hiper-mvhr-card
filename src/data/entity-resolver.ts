import { ENTITY_ROLES, type EntityRoleId } from '../types/entity-roles';
import type { CapabilityProfile } from '../types/capability';
import type { HomeAssistant } from '../types/hass';
import type { MvhrSnapshot } from '../types/snapshot';

const UNAVAILABLE_STATES = new Set(['unavailable', 'unknown']);

/**
 * Home Assistant's `button` and `input_button` platforms are stateless
 * action entities: their `state` is a timestamp of the last press, or the
 * literal string "unknown" before they've ever been pressed — "unknown" is
 * their normal idle state, not a sign of trouble, unlike every sensor/binary
 * domain where "unknown" means "no meaningful value right now." This is a
 * documented fact about these two HA platforms generically (see
 * home-assistant.io/integrations/button, /input_button), not a
 * manufacturer-specific exception — the same domain convention
 * src/data/control-dispatcher.ts already relies on for its `press` service
 * call, so it's consistent to rely on it here too.
 */
const STATELESS_ACTION_DOMAINS = new Set(['button', 'input_button']);

function domainOf(entityId: string): string {
  const [domain] = entityId.split('.');
  return domain ?? '';
}

/**
 * Resolves configured entity IDs into a vendor-neutral snapshot, one entry
 * per role, in exactly one of five states (SPECIFICATION.md §6):
 *   1. unsupported     — profile doesn't declare this role
 *   2. not_configured  — profile supports it, config doesn't map an entity
 *   3. entity_missing  — mapped, but Home Assistant has no such entity
 *                        (a configuration problem — typo, renamed entity)
 *   4. unavailable     — mapped, entity exists, but its state is
 *                        unavailable/unknown (a runtime problem, not config)
 *                        — except "unknown" on a button/input_button entity,
 *                        which is that domain's normal never-pressed state
 *   5. ok              — entity mapped and has a real value (including a
 *                        legitimate numeric zero — only the literal states
 *                        "unavailable"/"unknown" count as unavailable)
 *
 * This function never throws on missing or unavailable entities — that's a
 * normal state, not an error. No manufacturer checks happen here; only
 * `profile.supportedRoles` and the entity id's HA-platform domain are
 * consulted.
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
    if (!entity) {
      snapshot[role] = { status: 'entity_missing', entityId };
      continue;
    }
    const isNeverPressedAction =
      entity.state === 'unknown' && STATELESS_ACTION_DOMAINS.has(domainOf(entityId));
    if (UNAVAILABLE_STATES.has(entity.state) && !isNeverPressedAction) {
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
