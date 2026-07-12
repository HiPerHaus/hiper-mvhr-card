import type { RoleValue } from '../types/snapshot';

const LABELS: Partial<Record<RoleValue['status'], string>> = {
  unsupported: '',
  not_configured: 'Not configured',
  unavailable: 'Unavailable',
};

/** Renders a RoleValue as display text. Pure formatting, no domain logic. */
export function formatRoleValue(value: RoleValue): string {
  if (value.status === 'ok') {
    return value.unit ? `${value.value} ${value.unit}` : value.value;
  }
  return LABELS[value.status] ?? '';
}
