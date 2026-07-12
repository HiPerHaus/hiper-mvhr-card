import type { EntityRoleId } from './entity-roles';
import type { ManufacturerId } from './manufacturer';

/**
 * Phase 1 only ever renders the "homeowner"-style summary regardless of
 * which value is set here — the enum is accepted and validated now so the
 * config schema doesn't need a breaking change when installer/commissioning
 * layouts arrive (ROADMAP.md Phases 3–4).
 */
export type ViewMode = 'homeowner' | 'installer' | 'commissioning';

export interface HiperMvhrCardConfig {
  type: 'custom:hiper-mvhr-card';
  name?: string;
  manufacturer: ManufacturerId;
  view: ViewMode;
  entities: Partial<Record<EntityRoleId, string>>;
  feature_flags: Partial<Record<EntityRoleId, boolean>>;
}
