import type { HomeAssistant } from '../../src/types/hass';

/** Realistic mock hass state for a DIY/ESPHome/template-sensor MVHR setup. */
export const genericHass: HomeAssistant = {
  states: {
    'input_select.mvhr_mode': {
      entity_id: 'input_select.mvhr_mode',
      state: 'normal',
      attributes: { options: ['off', 'normal', 'boost'] },
    },
    'sensor.mvhr_supply_temp': {
      entity_id: 'sensor.mvhr_supply_temp',
      state: '19.0',
      attributes: { unit_of_measurement: '°C' },
    },
    // A HA `button` entity's state is a timestamp of its last press, or
    // "unknown" if it's never been pressed — the value itself is never
    // rendered (see hiper-mvhr-card.ts's control row), only used to
    // determine the entity exists and is available.
    'button.mvhr_filter_reset': {
      entity_id: 'button.mvhr_filter_reset',
      state: 'unknown',
      attributes: {},
    },
  },
};
