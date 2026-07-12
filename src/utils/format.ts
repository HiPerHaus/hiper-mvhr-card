import type { RoleValue } from '../types/snapshot';

const LABELS: Partial<Record<RoleValue['status'], string>> = {
  unsupported: '',
  not_configured: 'Not configured',
  // Homeowner-safe generic text — deliberately identical to `unavailable`.
  // A misconfigured entity ID isn't something a homeowner should have to
  // parse; the entity id + a distinct warning only shows in detailed mode,
  // handled separately by the component, not through this generic label.
  entity_missing: 'Unavailable',
  unavailable: 'Unavailable',
};

/** Renders a RoleValue as display text. Pure formatting, no domain logic. */
export function formatRoleValue(value: RoleValue): string {
  if (value.status === 'ok') {
    return value.unit ? `${value.value} ${value.unit}` : value.value;
  }
  return LABELS[value.status] ?? '';
}

/** "normal" -> "Normal". Used for the header's operating-mode text only. */
export function capitalize(text: string): string {
  return text.length > 0 ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}
