import type { CapabilityProfile } from '../types/capability';

// Nothing is supported by default — every role must be turned on via
// feature_flags in the card config. See docs/manufacturers/generic.md.
export const genericProfile: CapabilityProfile = {
  id: 'generic',
  name: 'Generic MVHR',
  vendor: 'Generic',
  supportedRoles: {},
};
