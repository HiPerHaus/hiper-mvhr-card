import type { HeatRecoveryMethod } from '../types/config';

export type HeatRecoveryStatus = 'ok' | 'calculating' | 'unavailable' | 'not_applicable';

export interface HeatRecoveryResult {
  label: string;
  status: HeatRecoveryStatus;
  raw?: number;
}

export interface HeatRecoveryInput {
  outdoor?: number;
  extract?: number;
  supply?: number;
  method: HeatRecoveryMethod;
}

export function calculateHeatRecovery(input: HeatRecoveryInput): HeatRecoveryResult {
  if (input.method === 'disabled') {
    return { label: 'Disabled', status: 'not_applicable' };
  }
  if (input.outdoor === undefined || input.extract === undefined || input.supply === undefined) {
    return { label: 'Unavailable', status: 'unavailable' };
  }

  const denominator = input.extract - input.outdoor;
  if (Math.abs(denominator) < 1) {
    return { label: 'Calculating', status: 'calculating' };
  }
  if (denominator <= 0 || input.supply < input.outdoor || input.supply > input.extract + 5) {
    return { label: 'Not applicable', status: 'not_applicable' };
  }

  const raw = ((input.supply - input.outdoor) / denominator) * 100;
  if (!Number.isFinite(raw) || raw < 0 || raw > 130) {
    return { label: 'Not applicable', status: 'not_applicable', raw };
  }

  return {
    label: `${Math.round(Math.max(0, Math.min(100, raw)))}%`,
    status: 'ok',
    raw,
  };
}
