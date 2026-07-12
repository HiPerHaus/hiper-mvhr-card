/**
 * Defined here (not derived from src/manufacturers/index.ts) to avoid a
 * circular dependency between the manufacturer registry and the capability
 * profile type, which needs a ManufacturerId too.
 */
// 'vent_axia_sentinel_econiq' is the Aerofresh-branded unit's underlying
// control platform id (renamed from 'aerfresh' in Phase 2 — see
// src/manufacturers/vent-axia-sentinel-econiq.ts). The user-facing brand
// name is always "Aerofresh"; this identifier is internal/technical only
// and must never appear in rendered UI text.
export const MANUFACTURER_IDS = [
  'altair',
  'zehnder-comfoair-q',
  'vent_axia_sentinel_econiq',
  'generic',
] as const;

export type ManufacturerId = (typeof MANUFACTURER_IDS)[number];
