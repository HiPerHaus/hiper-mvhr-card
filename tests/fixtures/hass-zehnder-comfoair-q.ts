import type { HomeAssistant } from '../../src/types/hass';

/** Realistic mock hass state for a Zehnder ComfoAir Q. Includes bypass. */
export const zehnderHass: HomeAssistant = {
  states: {
    'select.comfoair_mode': {
      entity_id: 'select.comfoair_mode',
      state: 'auto',
      attributes: { options: ['away', 'low', 'auto', 'high'] },
    },
    'sensor.comfoair_supply_temp': {
      entity_id: 'sensor.comfoair_supply_temp',
      state: '20.1',
      attributes: { unit_of_measurement: '°C' },
    },
    'sensor.comfoair_extract_temp': {
      entity_id: 'sensor.comfoair_extract_temp',
      state: '21.0',
      attributes: { unit_of_measurement: '°C' },
    },
    'sensor.comfoair_outdoor_temp': {
      entity_id: 'sensor.comfoair_outdoor_temp',
      state: '6.5',
      attributes: { unit_of_measurement: '°C' },
    },
    'sensor.comfoair_exhaust_temp': {
      entity_id: 'sensor.comfoair_exhaust_temp',
      state: '8.9',
      attributes: { unit_of_measurement: '°C' },
    },
    'sensor.comfoair_supply_flow': {
      entity_id: 'sensor.comfoair_supply_flow',
      state: '210',
      attributes: { unit_of_measurement: 'm³/h' },
    },
    'sensor.comfoair_extract_flow': {
      entity_id: 'sensor.comfoair_extract_flow',
      state: '205',
      attributes: { unit_of_measurement: 'm³/h' },
    },
    'binary_sensor.comfoair_bypass': {
      entity_id: 'binary_sensor.comfoair_bypass',
      state: 'on',
      attributes: { device_class: 'opening' },
    },
    // Deliberately "0" (not "unavailable") — the filter needs replacing
    // right now, which is a real, valid reading, not a missing one.
    'sensor.comfoair_filter_remaining': {
      entity_id: 'sensor.comfoair_filter_remaining',
      state: '0',
      attributes: { unit_of_measurement: '%' },
    },
    'binary_sensor.comfoair_fault': {
      entity_id: 'binary_sensor.comfoair_fault',
      state: 'off',
      attributes: {},
    },
    'binary_sensor.comfoair_frost_protection': {
      entity_id: 'binary_sensor.comfoair_frost_protection',
      state: 'on',
      attributes: {},
    },
  },
};
