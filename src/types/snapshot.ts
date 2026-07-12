import type { EntityRoleId } from './entity-roles';

/**
 * Every role a view considers rendering is in exactly one of these four
 * states — see SPECIFICATION.md §6 / docs/architecture.md §10. No component
 * should ever see `undefined` where a status is expected.
 */
export type RoleValue =
  | { status: 'unsupported' }
  | { status: 'not_configured' }
  | { status: 'unavailable' }
  | {
      status: 'ok';
      value: string;
      numericValue?: number;
      unit?: string;
      attributes: Record<string, unknown>;
    };

export type MvhrSnapshot = Partial<Record<EntityRoleId, RoleValue>>;
