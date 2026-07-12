import type { HomeAssistant } from '../../src/types/hass';

/**
 * Realistic mock hass state for an Aerofresh unit — includes one
 * deliberately unavailable entity (extract temp) to exercise graceful
 * degradation without needing a separate fixture file.
 */
export const aerfreshHass: HomeAssistant = {
  states: {
    'select.aerofresh_mode': {
      entity_id: 'select.aerofresh_mode',
      state: 'boost',
      attributes: { options: ['off', 'trickle', 'normal', 'boost'] },
    },
    'sensor.aerofresh_supply_temp': {
      entity_id: 'sensor.aerofresh_supply_temp',
      state: '18.9',
      attributes: { unit_of_measurement: '°C' },
    },
    'sensor.aerofresh_extract_temp': {
      entity_id: 'sensor.aerofresh_extract_temp',
      state: 'unavailable',
      attributes: {},
    },
    'sensor.aerofresh_outdoor_temp': {
      entity_id: 'sensor.aerofresh_outdoor_temp',
      state: '7.0',
      attributes: { unit_of_measurement: '°C' },
    },
    'binary_sensor.aerofresh_bypass': {
      entity_id: 'binary_sensor.aerofresh_bypass',
      state: 'off',
      attributes: {},
    },
  },
};
