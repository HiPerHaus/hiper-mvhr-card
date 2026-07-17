import type { EntityRoleId } from './entity-roles';
import type { ManufacturerId } from './manufacturer';

/**
 * Renamed from Phase 1's `view` to `display_mode` (ROADMAP.md Phase 2) to
 * match the project brief's terminology. Only `homeowner` and `detailed`
 * are implemented and accepted this phase — `commissioning` is deliberately
 * not in this union yet (ROADMAP.md Phase 4). Adding it back later is an
 * additive, non-breaking change to this type and to config-schema.ts's
 * validator, so there's no cost to leaving it out until it's real.
 */
export type DisplayMode = 'homeowner' | 'detailed';
export type HeatRecoveryMethod = 'automatic' | 'supply_temperature' | 'disabled';

export interface HiperMvhrCardConfig {
  type: 'custom:hiper-mvhr-card';
  name?: string;
  title?: string;
  subtitle?: string;
  manufacturer: ManufacturerId;
  display_mode: DisplayMode;
  entities: Partial<Record<EntityRoleId, string>>;
  feature_flags: Partial<Record<EntityRoleId, boolean>>;
  show_airflow_on_all_paths: boolean;
  show_controls: boolean;
  show_fan_speeds: boolean;
  show_filter: boolean;
  show_calibration: boolean;
  filter_max_days: number;
  heat_recovery_method: HeatRecoveryMethod;
}
