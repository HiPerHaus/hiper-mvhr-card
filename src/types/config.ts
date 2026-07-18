import type { EntityRoleId } from './entity-roles';
import type { ManufacturerId } from './manufacturer';

/**
 * Renamed from Phase 1's `view` to `display_mode` (ROADMAP.md Phase 2) to
 * match the project brief's terminology. `homeowner` and `detailed` were the
 * first two modes implemented; `system` (the flagship full-width visual
 * panel, "Add visual MVHR system display mode") is additive alongside them
 * — a homeowner-oriented mode that leads with the airflow visual rather
 * than a metrics/status list. `commissioning` is still deliberately not in
 * this union (ROADMAP.md Phase 4); adding any of these is an additive,
 * non-breaking change to this type and to config-schema.ts's validator, so
 * there's no cost to leaving `commissioning` out until it's real. The old
 * `view` config key is never reintroduced — `display_mode` remains the only
 * accepted key.
 */
export type DisplayMode = 'homeowner' | 'detailed' | 'system';
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
  /** Optional physical airflow capacity used to scale the system gauge. */
  max_airflow?: number;
  heat_recovery_method: HeatRecoveryMethod;
  /**
   * `display_mode: system` only: whether the airflow visual's duct
   * animation and slow fan rotation run at all (subject also to a positive
   * measured airflow, required entities being available, and
   * `prefers-reduced-motion` — see hiper-mvhr-card.ts's `_systemHeroVisual`).
   * Defaults to true.
   */
  show_airflow_animation: boolean;
  /**
   * `display_mode: system` only: whether the "More controls" disclosure
   * (override, mapped level, calibration internals, individual fan RPM —
   * see `_advancedDrawer`) is offered at all. It always starts collapsed
   * when shown; this flag controls whether it exists, not whether it's
   * initially open. Defaults to true.
   */
  show_advanced_controls: boolean;
}
