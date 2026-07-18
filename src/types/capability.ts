import type { EntityRoleId } from './entity-roles';
import type { ManufacturerId } from './manufacturer';

export interface RoleSupport {
  required?: boolean;
}

export interface CapabilityProfile {
  id: ManufacturerId;
  name: string;
  vendor: string;
  models?: string[];
  /** Verified default physical capacity, used only when no live/configured maximum exists. */
  defaultMaxAirflow?: number;
  supportedRoles: Partial<Record<EntityRoleId, RoleSupport>>;
  /**
   * Roles this manufacturer is confirmed NOT to support — e.g. the Altair
   * 160 has no summer bypass. These can never be re-enabled via
   * feature_flags; that's what distinguishes a hard product fact from a
   * role that's merely off by default (see src/data/capability-resolver.ts).
   */
  unsupportedRoles?: EntityRoleId[];
}
