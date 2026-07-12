import { altairProfile } from './altair';
import { zehnderComfoAirQProfile } from './zehnder-comfoair-q';
import { ventAxiaSentinelEconiqProfile } from './vent-axia-sentinel-econiq';
import { genericProfile } from './generic';
import type { CapabilityProfile } from '../types/capability';
import { MANUFACTURER_IDS, type ManufacturerId } from '../types/manufacturer';

export { MANUFACTURER_IDS };
export type { ManufacturerId };

const REGISTRY: Record<ManufacturerId, CapabilityProfile> = {
  altair: altairProfile,
  'zehnder-comfoair-q': zehnderComfoAirQProfile,
  vent_axia_sentinel_econiq: ventAxiaSentinelEconiqProfile,
  generic: genericProfile,
};

export function getProfile(id: ManufacturerId): CapabilityProfile {
  return REGISTRY[id];
}
