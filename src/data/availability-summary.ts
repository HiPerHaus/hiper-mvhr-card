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
 *
 * `options.ignoreRoles` excludes purely optional/diagnostic roles (fault,
 * frost protection, boost/override controls, calibration metadata, etc.)
 * from this count — the dashboard header's top-level "is this thing
 * connected" signal should reflect required entity failures only (see
 * SPECIFICATION.md §5/§7 and the card's Phase 4 header rules), not the
 * absence of an optional sensor nobody configured. Defaults to no exclusions
 * so existing callers (e.g. homeowner mode's legacy summary chip) are
 * unaffected.
 */
export function summarizeAvailability(
  snapshot: MvhrSnapshot,
  profile: CapabilityProfile,
  options: { ignoreRoles?: readonly EntityRoleId[] } = {},
): AvailabilitySummary {
  const ignored = new Set(options.ignoreRoles ?? []);
  let ok = 0;
  let unavailable = 0;
  let missing = 0;

  for (const role of Object.keys(profile.supportedRoles) as EntityRoleId[]) {
    if (ignored.has(role)) {
      continue;
    }
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
