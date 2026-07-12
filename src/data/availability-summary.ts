import type { CapabilityProfile } from '../types/capability';
import type { MvhrSnapshot } from '../types/snapshot';
import type { EntityRoleId } from '../types/entity-roles';

export interface AvailabilitySummary {
  tone: 'success' | 'warning' | 'muted';
  label: string;
}

/**
 * Computes the header's overall connection/availability indicator from the
 * snapshot — this is a UI-level summary, not a new entity role: nothing a
 * manufacturer profile declares, nothing a user configures directly. Only
 * roles the active profile actually supports are considered, so an
 * unsupported role (e.g. bypass on Altair) never affects this count.
 *
 * Configuration problems (entity_missing) take priority over runtime
 * unavailability, which takes priority over a clean "all reporting" state —
 * a typo'd entity id is more actionable than a sensor that's momentarily
 * unavailable, so it should be the more prominent signal.
 */
export function summarizeAvailability(
  snapshot: MvhrSnapshot,
  profile: CapabilityProfile,
): AvailabilitySummary {
  let ok = 0;
  let unavailable = 0;
  let missing = 0;

  for (const role of Object.keys(profile.supportedRoles) as EntityRoleId[]) {
    const value = snapshot[role];
    if (!value) {
      continue;
    }
    if (value.status === 'ok') {
      ok += 1;
    } else if (value.status === 'unavailable') {
      unavailable += 1;
    } else if (value.status === 'entity_missing') {
      missing += 1;
    }
  }

  if (missing > 0) {
    return {
      tone: 'warning',
      label: missing === 1 ? '1 configuration issue' : `${missing} configuration issues`,
    };
  }
  if (unavailable > 0) {
    return {
      tone: 'muted',
      label: unavailable === 1 ? '1 sensor unavailable' : `${unavailable} sensors unavailable`,
    };
  }
  if (ok > 0) {
    return { tone: 'success', label: 'All sensors reporting' };
  }
  return { tone: 'muted', label: 'Not configured' };
}
