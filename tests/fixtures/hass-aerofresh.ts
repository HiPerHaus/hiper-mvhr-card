import type { HomeAssistant } from '../../src/types/hass';

/**
 * Realistic mock hass state for an Aerofresh unit (vent_axia_sentinel_econiq
 * profile — see src/manufacturers/vent-axia-sentinel-econiq.ts) — includes
 * one deliberately unavailable entity (extract temp) to exercise graceful
 * degradation without needing a separate fixture file. Entity IDs use the
 * "aerofresh" brand name, never the internal platform id, matching what a
 * real installation's entities would actually be named.
 */
export const aerofreshHass: HomeAssistant = {
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
    'sensor.aerofresh_filter_remaining': {
      entity_id: 'sensor.aerofresh_filter_remaining',
      state: '42',
      attributes: { unit_of_measurement: '%' },
    },
    'binary_sensor.aerofresh_fault': {
      entity_id: 'binary_sensor.aerofresh_fault',
      state: 'on',
      attributes: {},
    },
    'binary_sensor.aerofresh_frost_protection': {
      entity_id: 'binary_sensor.aerofresh_frost_protection',
      state: 'off',
      attributes: {},
    },
  },
};
