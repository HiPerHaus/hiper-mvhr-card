import './fake-ha-card';
import '../src/index';
import type { HiperMvhrCard } from '../src/components/hiper-mvhr-card';
import { altairHass } from '../tests/fixtures/hass-altair-160';
import { zehnderHass } from '../tests/fixtures/hass-zehnder-comfoair-q';
import { aerfreshHass } from '../tests/fixtures/hass-aerfresh';
import { genericHass } from '../tests/fixtures/hass-generic';

const scenarios = [
  {
    title: 'Altair 160 — no bypass row should appear',
    hass: altairHass,
    config: {
      type: 'custom:hiper-mvhr-card',
      manufacturer: 'altair',
      entities: {
        mode: 'select.altair_mode',
        outdoor_air_temp: 'sensor.altair_outdoor_temp',
        supply_air_temp: 'sensor.altair_supply_temp',
        extract_air_temp: 'sensor.altair_extract_temp',
        exhaust_air_temp: 'sensor.altair_exhaust_temp',
        supply_airflow: 'sensor.altair_supply_flow',
        extract_airflow: 'sensor.altair_extract_flow',
      },
    },
  },
  {
    title: 'Zehnder ComfoAir Q — bypass on',
    hass: zehnderHass,
    config: {
      type: 'custom:hiper-mvhr-card',
      manufacturer: 'zehnder-comfoair-q',
      entities: {
        mode: 'select.comfoair_mode',
        outdoor_air_temp: 'sensor.comfoair_outdoor_temp',
        supply_air_temp: 'sensor.comfoair_supply_temp',
        extract_air_temp: 'sensor.comfoair_extract_temp',
        exhaust_air_temp: 'sensor.comfoair_exhaust_temp',
        supply_airflow: 'sensor.comfoair_supply_flow',
        extract_airflow: 'sensor.comfoair_extract_flow',
        bypass_state: 'binary_sensor.comfoair_bypass',
      },
    },
  },
  {
    title: 'Aerofresh — extract temp deliberately unavailable',
    hass: aerfreshHass,
    config: {
      type: 'custom:hiper-mvhr-card',
      manufacturer: 'aerfresh',
      entities: {
        mode: 'select.aerofresh_mode',
        outdoor_air_temp: 'sensor.aerofresh_outdoor_temp',
        supply_air_temp: 'sensor.aerofresh_supply_temp',
        extract_air_temp: 'sensor.aerofresh_extract_temp',
        bypass_state: 'binary_sensor.aerofresh_bypass',
        // exhaust_air_temp / airflow deliberately left unmapped below
      },
    },
  },
  {
    title: 'Generic — only supply temp feature-flagged on',
    hass: genericHass,
    config: {
      type: 'custom:hiper-mvhr-card',
      manufacturer: 'generic',
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
