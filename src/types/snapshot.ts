import type { EntityRoleId } from './entity-roles';

/**
 * Every role a view considers rendering is in exactly one of these five
 * states — see SPECIFICATION.md §6 / docs/architecture.md §10. No component
 * should ever see `undefined` where a status is expected.
 *
 * `entity_missing` was split out from `unavailable` in Phase 2
 * (ROADMAP.md): a role that's mapped to an entity ID Home Assistant doesn't
 * actually have (a typo, a renamed/removed entity) is a configuration
 * problem the user can fix; a role mapped to a real entity that's
 * currently `unavailable`/`unknown` is a runtime state that will likely
 * resolve itself. Conflating the two loses exactly the distinction a
 * "detailed" display mode needs to show a useful warning.
 */
export type RoleValue =
  | { status: 'unsupported' }
  | { status: 'not_configured' }
  | { status: 'entity_missing'; entityId: string }
  | { status: 'unavailable' }
  | {
      status: 'ok';
      value: string;
      numericValue?: number;
      unit?: string;
      attributes: Record<string, unknown>;
    };

export type MvhrSnapshot = Partial<Record<EntityRoleId, RoleValue>>;
