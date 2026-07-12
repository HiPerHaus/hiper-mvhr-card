import { altairProfile } from './altair';
import { zehnderComfoAirQProfile } from './zehnder-comfoair-q';
import { aerfreshProfile } from './aerfresh';
import { genericProfile } from './generic';
import type { CapabilityProfile } from '../types/capability';
import { MANUFACTURER_IDS, type ManufacturerId } from '../types/manufacturer';

export { MANUFACTURER_IDS };
export type { ManufacturerId };

const REGISTRY: Record<ManufacturerId, CapabilityProfile> = {
  altair: altairProfile,
  'zehnder-comfoair-q': zehnderComfoAirQProfile,
  aerfresh: aerfreshProfile,
  generic: genericProfile,
};

export function getProfile(id: ManufacturerId): CapabilityProfile {
  return REGISTRY[id];
}
