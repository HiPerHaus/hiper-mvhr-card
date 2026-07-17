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

/**
 * Formats a raw ISO-8601-looking timestamp ("2026-07-16T08:30:00") into a
 * locale-aware, human-readable string for display (SPECIFICATION.md/Phase 13
 * "no raw ISO timestamps without formatting"). Anything that doesn't look
 * like an ISO timestamp — including manufacturer sensors that already report
 * a human-readable string like "2026-07-16 08:30" — passes through
 * unchanged rather than risk mangling a format this function doesn't
 * recognize.
 */
export function formatTimestampMaybe(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    return value;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
