import type { HomeAssistant } from '../../src/types/hass';

/**
 * Realistic mock hass state for an Altair 160. Entity IDs match
 * examples/altair-160/README.md. No bypass entity — the Altair 160 doesn't
 * have one, so there's nothing to map even in a fixture.
 */
export const altairHass: HomeAssistant = {
  states: {
    'select.altair_mode': {
      entity_id: 'select.altair_mode',
      state: 'normal',
      attributes: { options: ['off', 'low', 'normal', 'boost'] },
    },
    'sensor.altair_supply_temp': {
      entity_id: 'sensor.altair_supply_temp',
      state: '19.4',
      attributes: { unit_of_measurement: '°C' },
    },
    'sensor.altair_extract_temp': {
      entity_id: 'sensor.altair_extract_temp',
      state: '21.1',
      attributes: { unit_of_measurement: '°C' },
    },
    'sensor.altair_outdoor_temp': {
      entity_id: 'sensor.altair_outdoor_temp',
      state: '8.2',
      attributes: { unit_of_measurement: '°C' },
    },
    'sensor.altair_exhaust_temp': {
      entity_id: 'sensor.altair_exhaust_temp',
      state: '10.6',
      attributes: { unit_of_measurement: '°C' },
    },
    'sensor.altair_supply_flow': {
      entity_id: 'sensor.altair_supply_flow',
      state: '145',
      attributes: { unit_of_measurement: 'm³/h' },
    },
    'sensor.altair_extract_flow': {
      entity_id: 'sensor.altair_extract_flow',
      state: '150',
      attributes: { unit_of_measurement: 'm³/h' },
    },
  },
};
