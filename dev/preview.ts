import './fake-ha-card';
import '../src/index';
import type { HiperMvhrCard } from '../src/components/hiper-mvhr-card';
import { altairHass } from '../tests/fixtures/hass-altair-160';
import { zehnderHass } from '../tests/fixtures/hass-zehnder-comfoair-q';
import { aerofreshHass } from '../tests/fixtures/hass-aerofresh';
import { genericHass } from '../tests/fixtures/hass-generic';
import type { HomeAssistant } from '../src/types/hass';

// Note: this preview has no real `<ha-icon>` element (that's supplied by
// Home Assistant's frontend at runtime), so icons render as empty in this
// harness — everything else (layout, tones, text) is representative.

const altairEntities = {
  mode: 'select.altair_mvhr_mode',
  effective_mode: 'sensor.altair_mvhr_effective_mode',
  airflow: 'sensor.altair_mvhr_airflow',
  target_airflow: 'sensor.altair_mvhr_target_airflow',
  mapped_level: 'sensor.altair_mvhr_mapped_airflow_level',
  supply_temperature: 'sensor.altair_mvhr_supply_air_temperature',
  extract_temperature: 'sensor.altair_mvhr_extract_air_temperature',
  outdoor_temperature: 'sensor.altair_mvhr_outdoor_air_temperature',
  exhaust_temperature: 'sensor.altair_mvhr_exhaust_air_temperature',
  supply_fan_speed: 'sensor.altair_mvhr_supply_fan_speed',
  extract_fan_speed: 'sensor.altair_mvhr_extract_fan_speed',
  indoor_humidity: 'sensor.altair_mvhr_indoor_humidity',
  filter_days: 'sensor.altair_mvhr_filter_days_remaining',
  boost_active: 'binary_sensor.altair_mvhr_boost_active',
  boost_remaining: 'sensor.altair_mvhr_boost_remaining',
  boost_duration: 'number.altair_mvhr_boost_duration',
  start_boost: 'button.altair_mvhr_start_boost',
  cancel_boost: 'button.altair_mvhr_cancel_boost',
  override_duration: 'select.altair_mvhr_override_duration',
  override_remaining: 'sensor.altair_mvhr_override_remaining',
  clear_override: 'button.altair_mvhr_clear_override',
  calibration_result: 'sensor.altair_mvhr_airflow_calibration_result',
  calibration_status: 'sensor.altair_mvhr_airflow_calibration_status',
  calibration_progress: 'sensor.altair_mvhr_airflow_calibration_progress',
  last_calibration: 'sensor.altair_mvhr_last_airflow_calibration',
};

const altairConfig = {
  type: 'custom:hiper-mvhr-card',
  title: 'Altair MVHR',
  subtitle: 'Heat Recovery Ventilation System',
  manufacturer: 'altair',
  display_mode: 'detailed',
  entities: altairEntities,
  heat_recovery_method: 'automatic',
};

// The "Current live values confirmed" set from the Altair dashboard rebuild
// — heat recovery ≈ (17.9 - 6.5) / (20.1 - 6.5) × 100 ≈ 84%, matching
// tests/unit/card-rendering.test.ts's "current live example values" suite.
const liveAltairStates: HomeAssistant['states'] = {
  'sensor.altair_mvhr_outdoor_air_temperature': {
    entity_id: 'sensor.altair_mvhr_outdoor_air_temperature',
    state: '6.5',
    attributes: { unit_of_measurement: '°C' },
  },
  'sensor.altair_mvhr_supply_air_temperature': {
    entity_id: 'sensor.altair_mvhr_supply_air_temperature',
    state: '17.9',
    attributes: { unit_of_measurement: '°C' },
  },
  'sensor.altair_mvhr_extract_air_temperature': {
    entity_id: 'sensor.altair_mvhr_extract_air_temperature',
    state: '20.1',
    attributes: { unit_of_measurement: '°C' },
  },
  'sensor.altair_mvhr_exhaust_air_temperature': {
    entity_id: 'sensor.altair_mvhr_exhaust_air_temperature',
    state: '10.9',
    attributes: { unit_of_measurement: '°C' },
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
  'sensor.altair_mvhr_mapped_airflow_level': {
    entity_id: 'sensor.altair_mvhr_mapped_airflow_level',
    state: '4',
    attributes: {},
  },
  'sensor.altair_mvhr_supply_fan_speed': {
    entity_id: 'sensor.altair_mvhr_supply_fan_speed',
    state: '1476',
    attributes: { unit_of_measurement: 'rpm' },
  },
  'sensor.altair_mvhr_extract_fan_speed': {
    entity_id: 'sensor.altair_mvhr_extract_fan_speed',
    state: '1512',
    attributes: { unit_of_measurement: 'rpm' },
  },
  'sensor.altair_mvhr_indoor_humidity': {
    entity_id: 'sensor.altair_mvhr_indoor_humidity',
    state: '55',
    attributes: { unit_of_measurement: '%' },
  },
  'sensor.altair_mvhr_filter_days_remaining': {
    entity_id: 'sensor.altair_mvhr_filter_days_remaining',
    state: '353',
    attributes: { unit_of_measurement: 'd' },
  },
  'select.altair_mvhr_mode': {
    entity_id: 'select.altair_mvhr_mode',
    state: 'medium',
    attributes: { options: ['away', 'low', 'medium', 'high'] },
  },
  'sensor.altair_mvhr_airflow_calibration_result': {
    entity_id: 'sensor.altair_mvhr_airflow_calibration_result',
    state: 'calibrated',
    attributes: {},
  },
};

const liveAltairHass: HomeAssistant = {
  ...altairHass,
  states: { ...altairHass.states, ...liveAltairStates },
};

function withStates(overrides: HomeAssistant['states']): HomeAssistant {
  return {
    ...liveAltairHass,
    states: {
      ...liveAltairHass.states,
      ...overrides,
    },
  };
}

// `display_mode: system`'s own realistic value set (ROADMAP.md "Add visual
// MVHR system display mode"). Note: the brief's supply temperature
// ("approximately 15.7–16.0 °C") sits above its extract temperature
// (13.0 °C), which the existing, unmodified apparent-recovery formula
// correctly treats as physically implausible ("Not applicable"). 12.0 °C
// keeps the same outdoor/extract pair internally consistent with that
// formula, producing a genuine ~74% instead of forcing numbers through a
// calculation that would (correctly) reject them — see
// tests/unit/card-rendering.test.ts's "system mode" suite for the same call.
const systemStates: HomeAssistant['states'] = {
  'sensor.altair_mvhr_outdoor_air_temperature': {
    entity_id: 'sensor.altair_mvhr_outdoor_air_temperature',
    state: '9.2',
    attributes: { unit_of_measurement: '°C' },
  },
  'sensor.altair_mvhr_supply_air_temperature': {
    entity_id: 'sensor.altair_mvhr_supply_air_temperature',
    state: '12.0',
    attributes: { unit_of_measurement: '°C' },
  },
  'sensor.altair_mvhr_extract_air_temperature': {
    entity_id: 'sensor.altair_mvhr_extract_air_temperature',
    state: '13.0',
    attributes: { unit_of_measurement: '°C' },
  },
  'sensor.altair_mvhr_exhaust_air_temperature': {
    entity_id: 'sensor.altair_mvhr_exhaust_air_temperature',
    state: '10.5',
    attributes: { unit_of_measurement: '°C' },
  },
  'sensor.altair_mvhr_airflow': {
    entity_id: 'sensor.altair_mvhr_airflow',
    state: '70',
    attributes: { unit_of_measurement: 'm³/h' },
  },
  'sensor.altair_mvhr_target_airflow': {
    entity_id: 'sensor.altair_mvhr_target_airflow',
    state: '95',
    attributes: { unit_of_measurement: 'm³/h' },
  },
  'sensor.altair_mvhr_mapped_airflow_level': {
    entity_id: 'sensor.altair_mvhr_mapped_airflow_level',
    state: '4',
    attributes: {},
  },
  'sensor.altair_mvhr_supply_fan_speed': {
    entity_id: 'sensor.altair_mvhr_supply_fan_speed',
    state: '1164',
    attributes: { unit_of_measurement: 'rpm' },
  },
  'sensor.altair_mvhr_extract_fan_speed': {
    entity_id: 'sensor.altair_mvhr_extract_fan_speed',
    state: '1164',
    attributes: { unit_of_measurement: 'rpm' },
  },
  'sensor.altair_mvhr_indoor_humidity': {
    entity_id: 'sensor.altair_mvhr_indoor_humidity',
    state: '61',
    attributes: { unit_of_measurement: '%' },
  },
  'sensor.altair_mvhr_filter_days_remaining': {
    entity_id: 'sensor.altair_mvhr_filter_days_remaining',
    state: '353',
    attributes: { unit_of_measurement: 'd' },
  },
  'select.altair_mvhr_mode': {
    entity_id: 'select.altair_mvhr_mode',
    state: 'medium',
    attributes: { options: ['away', 'low', 'medium', 'high'] },
  },
  'sensor.altair_mvhr_airflow_calibration_result': {
    entity_id: 'sensor.altair_mvhr_airflow_calibration_result',
    state: 'calibrated',
    attributes: {},
  },
};

const systemAltairHass: HomeAssistant = {
  ...altairHass,
  states: { ...altairHass.states, ...systemStates },
};

function withSystemStates(overrides: HomeAssistant['states']): HomeAssistant {
  return {
    ...systemAltairHass,
    states: {
      ...systemAltairHass.states,
      ...overrides,
    },
  };
}

const systemAltairConfig = {
  ...altairConfig,
  display_mode: 'system',
};

const scenarios = [
  {
    title: 'Altair 160 — detailed desktop (dark)',
    hass: liveAltairHass,
    className: 'desktop dark',
    config: altairConfig,
  },
  {
    title: 'Altair 160 — detailed desktop (light)',
    hass: liveAltairHass,
    className: 'desktop',
    config: altairConfig,
  },
  {
    title: 'Altair 160 — detailed tablet (~760px)',
    hass: liveAltairHass,
    className: 'tablet',
    config: altairConfig,
  },
  {
    title: 'Altair 160 — detailed mobile (~390px)',
    hass: liveAltairHass,
    className: 'mobile',
    config: altairConfig,
  },
  {
    title: 'Altair 160 — homeowner mobile',
    hass: liveAltairHass,
    className: 'mobile',
    config: {
      ...altairConfig,
      display_mode: 'homeowner',
    },
  },
  {
    title: 'Altair 160 — boost active',
    hass: withStates({
      'binary_sensor.altair_mvhr_boost_active': {
        entity_id: 'binary_sensor.altair_mvhr_boost_active',
        state: 'on',
        attributes: {},
      },
      'sensor.altair_mvhr_boost_remaining': {
        entity_id: 'sensor.altair_mvhr_boost_remaining',
        state: '12',
        attributes: { unit_of_measurement: 'min' },
      },
    }),
    className: 'desktop dark',
    config: altairConfig,
  },
  {
    title: 'Altair 160 — override active',
    hass: withStates({
      'select.altair_mvhr_override_duration': {
        entity_id: 'select.altair_mvhr_override_duration',
        state: '2h',
        attributes: { options: ['until_next_schedule_change', '1h', '2h', '4h'] },
      },
      'sensor.altair_mvhr_override_remaining': {
        entity_id: 'sensor.altair_mvhr_override_remaining',
        state: '87',
        attributes: { unit_of_measurement: 'min' },
      },
    }),
    className: 'desktop',
    config: altairConfig,
  },
  {
    title: 'Altair 160 — calibration running',
    hass: withStates({
      'sensor.altair_mvhr_airflow_calibration_status': {
        entity_id: 'sensor.altair_mvhr_airflow_calibration_status',
        state: 'sampling',
        attributes: {},
      },
      'sensor.altair_mvhr_airflow_calibration_progress': {
        entity_id: 'sensor.altair_mvhr_airflow_calibration_progress',
        state: '42',
        attributes: { unit_of_measurement: '%' },
      },
    }),
    className: 'desktop',
    config: altairConfig,
  },
  {
    title: 'Altair 160 — unavailable required entity (supply temperature)',
    hass: withStates({
      'sensor.altair_mvhr_supply_air_temperature': {
        entity_id: 'sensor.altair_mvhr_supply_air_temperature',
        state: 'unavailable',
        attributes: { unit_of_measurement: '°C' },
      },
    }),
    className: 'mobile dark',
    config: altairConfig,
  },
  {
    title: 'System mode — desktop (dark)',
    hass: systemAltairHass,
    className: 'desktop dark',
    config: systemAltairConfig,
  },
  {
    title: 'System mode — desktop (light)',
    hass: systemAltairHass,
    className: 'desktop',
    config: systemAltairConfig,
  },
  {
    title: 'System mode — tablet (~760px)',
    hass: systemAltairHass,
    className: 'tablet',
    config: systemAltairConfig,
  },
  {
    title: 'System mode — 430px',
    hass: systemAltairHass,
    className: 'w430',
    config: systemAltairConfig,
  },
  {
    title: 'System mode — 375px',
    hass: systemAltairHass,
    className: 'w375',
    config: systemAltairConfig,
  },
  {
    title: 'System mode — boost active',
    hass: withSystemStates({
      'binary_sensor.altair_mvhr_boost_active': {
        entity_id: 'binary_sensor.altair_mvhr_boost_active',
        state: 'on',
        attributes: {},
      },
      'sensor.altair_mvhr_boost_remaining': {
        entity_id: 'sensor.altair_mvhr_boost_remaining',
        state: '18',
        attributes: { unit_of_measurement: 'min' },
      },
    }),
    className: 'desktop dark',
    config: systemAltairConfig,
  },
  {
    title: 'System mode — calibration required',
    hass: withSystemStates({
      'sensor.altair_mvhr_airflow_calibration_result': {
        entity_id: 'sensor.altair_mvhr_airflow_calibration_result',
        state: 'not_calibrated',
        attributes: {},
      },
    }),
    className: 'desktop',
    config: systemAltairConfig,
  },
  {
    title: 'System mode — communication issue (supply temperature unavailable)',
    hass: withSystemStates({
      'sensor.altair_mvhr_supply_air_temperature': {
        entity_id: 'sensor.altair_mvhr_supply_air_temperature',
        state: 'unavailable',
        attributes: { unit_of_measurement: '°C' },
      },
    }),
    className: 'mobile dark',
    config: systemAltairConfig,
  },
  {
    title: 'System mode — advanced diagnostics (click "More controls" to expand)',
    hass: systemAltairHass,
    className: 'desktop',
    config: systemAltairConfig,
  },
  {
    title: 'System mode — Zehnder (bypass supported and mapped; expand "More controls" to see it)',
    hass: zehnderHass,
    className: 'desktop',
    config: {
      type: 'custom:hiper-mvhr-card',
      manufacturer: 'zehnder-comfoair-q',
      display_mode: 'system',
      title: 'Zehnder ComfoAir Q',
      entities: {
        mode: 'select.comfoair_mode',
        outdoor_air_temp: 'sensor.comfoair_outdoor_temp',
        supply_air_temp: 'sensor.comfoair_supply_temp',
        extract_air_temp: 'sensor.comfoair_extract_temp',
        exhaust_air_temp: 'sensor.comfoair_exhaust_temp',
        supply_airflow: 'sensor.comfoair_supply_flow',
        extract_airflow: 'sensor.comfoair_extract_flow',
        bypass_state: 'binary_sensor.comfoair_bypass',
        filter_remaining: 'sensor.comfoair_filter_remaining',
      },
    },
  },
  {
    title: 'Zehnder ComfoAir Q — homeowner (filter at 0%, a valid zero reading)',
    hass: zehnderHass,
    config: {
      type: 'custom:hiper-mvhr-card',
      manufacturer: 'zehnder-comfoair-q',
      display_mode: 'homeowner',
      entities: {
        mode: 'select.comfoair_mode',
        outdoor_air_temp: 'sensor.comfoair_outdoor_temp',
        supply_air_temp: 'sensor.comfoair_supply_temp',
        extract_air_temp: 'sensor.comfoair_extract_temp',
        exhaust_air_temp: 'sensor.comfoair_exhaust_temp',
        supply_airflow: 'sensor.comfoair_supply_flow',
        extract_airflow: 'sensor.comfoair_extract_flow',
        bypass_state: 'binary_sensor.comfoair_bypass',
        filter_remaining: 'sensor.comfoair_filter_remaining',
        fault_active: 'binary_sensor.comfoair_fault',
        frost_protection_active: 'binary_sensor.comfoair_frost_protection',
      },
    },
  },
  {
    title: 'Aerofresh — detailed (unavailable sensor vs. a missing entity, side by side)',
    hass: aerofreshHass,
    config: {
      type: 'custom:hiper-mvhr-card',
      manufacturer: 'vent_axia_sentinel_econiq',
      display_mode: 'detailed',
      entities: {
        mode: 'select.aerofresh_mode',
        outdoor_air_temp: 'sensor.aerofresh_outdoor_temp',
        supply_air_temp: 'sensor.aerofresh_supply_temp',
        // This entity exists in hass but its state is "unavailable":
        extract_air_temp: 'sensor.aerofresh_extract_temp',
        // This entity id has no matching entity at all — a config typo:
        exhaust_air_temp: 'sensor.aerofresh_exhaust_temp_TYPO',
        bypass_state: 'binary_sensor.aerofresh_bypass',
        filter_remaining: 'sensor.aerofresh_filter_remaining',
        fault_active: 'binary_sensor.aerofresh_fault',
      },
    },
  },
  {
    title: 'Generic — only mode + supply temp feature-flagged on',
    hass: genericHass,
    config: {
      type: 'custom:hiper-mvhr-card',
      manufacturer: 'generic',
      display_mode: 'homeowner',
      feature_flags: { mode: true, supply_air_temp: true },
      entities: {
        mode: 'input_select.mvhr_mode',
        supply_air_temp: 'sensor.mvhr_supply_temp',
      },
    },
  },
  {
    title: 'Invalid config — unknown manufacturer',
    hass: genericHass,
    config: {
      type: 'custom:hiper-mvhr-card',
      manufacturer: 'not-a-real-brand',
      entities: {},
    },
  },
] as const;

const app = document.getElementById('app');
if (!app) {
  throw new Error('dev preview: #app not found');
}

for (const scenario of scenarios) {
  const wrapper = document.createElement('div');
  wrapper.className = `scenario ${'className' in scenario ? scenario.className : ''}`;

  const heading = document.createElement('h3');
  heading.textContent = scenario.title;
  wrapper.appendChild(heading);

  const card = document.createElement('hiper-mvhr-card') as HiperMvhrCard;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dev harness, config shape is intentionally exercised loosely here
  card.setConfig(scenario.config as any);
  card.hass = scenario.hass;
  wrapper.appendChild(card);

  app.appendChild(wrapper);
}
