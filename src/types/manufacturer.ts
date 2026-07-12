/**
 * Defined here (not derived from src/manufacturers/index.ts) to avoid a
 * circular dependency between the manufacturer registry and the capability
 * profile type, which needs a ManufacturerId too.
 */
export const MANUFACTURER_IDS = ['altair', 'zehnder-comfoair-q', 'aerfresh', 'generic'] as const;

export type ManufacturerId = (typeof MANUFACTURER_IDS)[number];
