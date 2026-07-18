export type AirflowGaugeSource =
  | 'configured'
  | 'entity'
  | 'preset_high'
  | 'manufacturer'
  | 'mapped_level'
  | 'unavailable';

export interface AirflowGaugeInput {
  current?: number;
  configuredMaximum?: number;
  entityMaximum?: number;
  presetHigh?: number;
  manufacturerMaximum?: number;
  mappedLevel?: number;
  selectedSpeed?: number;
}

export interface AirflowGaugeScale {
  fraction: number;
  maximum?: number;
  source: AirflowGaugeSource;
}

const positive = (value: number | undefined): value is number =>
  value !== undefined && Number.isFinite(value) && value > 0;

export function calculateAirflowGauge(input: AirflowGaugeInput): AirflowGaugeScale {
  if (input.current === undefined || !Number.isFinite(input.current)) {
    return { fraction: 0, source: 'unavailable' };
  }

  const candidates: Array<[AirflowGaugeSource, number | undefined]> = [
    ['configured', input.configuredMaximum],
    ['entity', input.entityMaximum],
    ['preset_high', input.presetHigh],
    ['manufacturer', input.manufacturerMaximum],
  ];
  const capacity = candidates.find(([, value]) => positive(value));
  if (capacity && positive(capacity[1])) {
    return {
      fraction: Math.max(0, Math.min(1, input.current / capacity[1])),
      maximum: capacity[1],
      source: capacity[0],
    };
  }

  const level = positive(input.mappedLevel) ? input.mappedLevel : input.selectedSpeed;
  return positive(level)
    ? { fraction: Math.max(0, Math.min(1, level / 10)), source: 'mapped_level' }
    : { fraction: 0, source: 'unavailable' };
}
