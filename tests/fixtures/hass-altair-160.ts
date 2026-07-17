import type { HomeAssistant } from '../../src/types/hass';

/**
 * Realistic mock hass state for an Altair 160. Entity IDs match
 * examples/altair-160/README.md. No bypass entity — the Altair 160 doesn't
 * have one, so there's nothing to map even in a fixture.
 */
export const altairHass: HomeAssistant = {
  states: {
    'select.altair_mvhr_mode': {
      entity_id: 'select.altair_mvhr_mode',
      state: 'medium',
      attributes: { options: ['away', 'low', 'medium', 'high'] },
    },
    'select.altair_mvhr_override_duration': {
      entity_id: 'select.altair_mvhr_override_duration',
      state: 'until_next_schedule_change',
      attributes: { options: ['until_next_schedule_change', '1h', '2h', '4h'] },
    },
    'button.altair_mvhr_clear_override': {
      entity_id: 'button.altair_mvhr_clear_override',
      state: 'unknown',
      attributes: {},
    },
    'number.altair_mvhr_boost_duration': {
      entity_id: 'number.altair_mvhr_boost_duration',
      state: '15',
      attributes: { unit_of_measurement: 'min' },
    },
    'button.altair_mvhr_start_boost': {
      entity_id: 'button.altair_mvhr_start_boost',
      state: 'unknown',
      attributes: {},
    },
    'button.altair_mvhr_cancel_boost': {
      entity_id: 'button.altair_mvhr_cancel_boost',
      state: 'unknown',
      attributes: {},
    },
    'sensor.altair_mvhr_airflow': {
      entity_id: 'sensor.altair_mvhr_airflow',
      state: '95',
      attributes: { unit_of_measurement: 'm³/h' },
    },
    'sensor.altair_mvhr_target_airflow': {
      entity_id: 'sensor.altair_mvhr_target_airflow',
      state: '95',
      attributes: { unit_of_measurement: 'm³/h' },
    },
    'sensor.altair_mvhr_effective_mode': {
      entity_id: 'sensor.altair_mvhr_effective_mode',
      state: 'medium',
      attributes: {},
    },
    'binary_sensor.altair_mvhr_boost_active': {
      entity_id: 'binary_sensor.altair_mvhr_boost_active',
      state: 'off',
      attributes: {},
    },
    'sensor.altair_mvhr_boost_remaining': {
      entity_id: 'sensor.altair_mvhr_boost_remaining',
      state: '0',
      attributes: { unit_of_measurement: 'min' },
    },
    'sensor.altair_mvhr_extract_air_temperature': {
      entity_id: 'sensor.altair_mvhr_extract_air_temperature',
      state: '21.2',
      attributes: { unit_of_measurement: '°C' },
    },
    'sensor.altair_mvhr_supply_air_temperature': {
      entity_id: 'sensor.altair_mvhr_supply_air_temperature',
      state: '19.0',
      attributes: { unit_of_measurement: '°C' },
    },
    'sensor.altair_mvhr_outdoor_air_temperature': {
      entity_id: 'sensor.altair_mvhr_outdoor_air_temperature',
      state: '8.1',
      attributes: { unit_of_measurement: '°C' },
    },
    'sensor.altair_mvhr_exhaust_air_temperature': {
      entity_id: 'sensor.altair_mvhr_exhaust_air_temperature',
      state: '12.5',
      attributes: { unit_of_measurement: '°C' },
    },
    'sensor.altair_mvhr_indoor_humidity': {
      entity_id: 'sensor.altair_mvhr_indoor_humidity',
      state: '56',
      attributes: { unit_of_measurement: '%' },
    },
    'sensor.altair_mvhr_filter_days_remaining': {
      entity_id: 'sensor.altair_mvhr_filter_days_remaining',
      state: '353',
      attributes: { unit_of_measurement: 'd' },
    },
    'sensor.altair_mvhr_supply_fan_speed': {
      entity_id: 'sensor.altair_mvhr_supply_fan_speed',
      state: '1476',
      attributes: { unit_of_measurement: 'rpm' },
    },
    'sensor.altair_mvhr_extract_fan_speed': {
      entity_id: 'sensor.altair_mvhr_extract_fan_speed',
      state: '1500',
      attributes: { unit_of_measurement: 'rpm' },
    },
    'sensor.altair_mvhr_airflow_calibration_result': {
      entity_id: 'sensor.altair_mvhr_airflow_calibration_result',
      state: 'calibrated',
      attributes: {},
    },
    'sensor.altair_mvhr_airflow_calibration_status': {
      entity_id: 'sensor.altair_mvhr_airflow_calibration_status',
      state: 'idle',
      attributes: {},
    },
    'sensor.altair_mvhr_airflow_calibration_progress': {
      entity_id: 'sensor.altair_mvhr_airflow_calibration_progress',
      state: '100',
      attributes: { unit_of_measurement: '%' },
    },
    'sensor.altair_mvhr_last_airflow_calibration': {
      entity_id: 'sensor.altair_mvhr_last_airflow_calibration',
      state: '2026-07-16 08:30',
      attributes: {},
    },
    'sensor.altair_mvhr_mapped_airflow_level': {
      entity_id: 'sensor.altair_mvhr_mapped_airflow_level',
      state: '4',
      attributes: {},
    },
    'number.altair_mvhr_manual_airflow_level': {
      entity_id: 'number.altair_mvhr_manual_airflow_level',
      state: '4',
      attributes: {},
    },
    'switch.altair_mvhr_manual_speed_control': {
      entity_id: 'switch.altair_mvhr_manual_speed_control',
      state: 'off',
      attributes: {},
    },
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
    'sensor.altair_filter_remaining': {
      entity_id: 'sensor.altair_filter_remaining',
      state: '65',
      attributes: { unit_of_measurement: '%' },
    },
    'binary_sensor.altair_fault': {
      entity_id: 'binary_sensor.altair_fault',
      state: 'off',
      attributes: {},
    },
    'binary_sensor.altair_frost_protection': {
      entity_id: 'binary_sensor.altair_frost_protection',
      state: 'off',
      attributes: {},
    },
  },
};
