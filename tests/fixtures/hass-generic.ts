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
  },
};
