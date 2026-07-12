import { getProfile } from '../manufacturers';
import type { CapabilityProfile } from '../types/capability';
import type { EntityRoleId } from '../types/entity-roles';
import type { ManufacturerId } from '../types/manufacturer';

/**
 * Merges a manufacturer's default capability profile with any per-config
 * feature_flags overrides. Flags can enable a role the profile doesn't
 * support by default (e.g. a Generic-profile user manually turning on a role
 * they've wired up) or disable one it does — but flags can never re-enable a
 * role listed in the profile's `unsupportedRoles`. That's the difference
 * between "not supported by default" and "confirmed this manufacturer
 * cannot do this" (e.g. Altair 160 + bypass). See docs/architecture.md §5/§7.
 */
export function resolveCapabilities(
  manufacturer: ManufacturerId,
  featureFlags?: Partial<Record<EntityRoleId, boolean>>,
): CapabilityProfile {
  const base = getProfile(manufacturer);

  if (!featureFlags || Object.keys(featureFlags).length === 0) {
    return base;
  }

  const locked = new Set(base.unsupportedRoles ?? []);
  const supportedRoles = { ...base.supportedRoles };

  for (const role of Object.keys(featureFlags) as EntityRoleId[]) {
    if (locked.has(role)) {
      continue;
    }
    if (featureFlags[role]) {
      supportedRoles[role] = supportedRoles[role] ?? {};
    } else {
      delete supportedRoles[role];
    }
  }

  return { ...base, supportedRoles };
}
