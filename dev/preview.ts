import './fake-ha-card';
import '../src/index';
import type { HiperMvhrCard } from '../src/components/hiper-mvhr-card';
import { altairHass } from '../tests/fixtures/hass-altair-160';
import { zehnderHass } from '../tests/fixtures/hass-zehnder-comfoair-q';
import { aerofreshHass } from '../tests/fixtures/hass-aerofresh';
import { genericHass } from '../tests/fixtures/hass-generic';

// Note: this preview has no real `<ha-icon>` element (that's supplied by
// Home Assistant's frontend at runtime), so icons render as empty in this
// harness — everything else (layout, tones, text) is representative.

const scenarios = [
  {
    title: 'Altair 160 — homeowner (no bypass row should appear anywhere)',
    hass: altairHass,
    config: {
      type: 'custom:hiper-mvhr-card',
      manufacturer: 'altair',
      display_mode: 'homeowner',
      entities: {
        mode: 'select.altair_mode',
        outdoor_air_temp: 'sensor.altair_outdoor_temp',
        supply_air_temp: 'sensor.altair_supply_temp',
        extract_air_temp: 'sensor.altair_extract_temp',
        exhaust_air_temp: 'sensor.altair_exhaust_temp',
        supply_airflow: 'sensor.altair_supply_flow',
        extract_airflow: 'sensor.altair_extract_flow',
        filter_remaining: 'sensor.altair_filter_remaining',
      },
    },
  },
  {
    title: 'Altair 160 — detailed (fault/frost left unmapped on purpose)',
    hass: altairHass,
    config: {
      type: 'custom:hiper-mvhr-card',
      manufacturer: 'altair',
      display_mode: 'detailed',
      entities: {
        mode: 'select.altair_mode',
        outdoor_air_temp: 'sensor.altair_outdoor_temp',
        supply_air_temp: 'sensor.altair_supply_temp',
        filter_remaining: 'sensor.altair_filter_remaining',
        // fault_active / frost_protection_active deliberately unmapped —
        // detailed mode shows "Not configured" for both; homeowner would
        // omit them entirely.
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
  wrapper.className = 'scenario';

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
