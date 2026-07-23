# Example: Altair 160

```yaml
type: custom:hiper-mvhr-card
manufacturer: altair
display_mode: detailed
entities:
  mode: select.altair_mode
  outdoor_air_temp: sensor.altair_outdoor_temp
  supply_air_temp: sensor.altair_supply_temp
  extract_air_temp: sensor.altair_extract_temp
  exhaust_air_temp: sensor.altair_exhaust_temp
  supply_airflow: sensor.altair_supply_flow
  extract_airflow: sensor.altair_extract_flow
  filter_remaining: sensor.altair_filter_remaining
  fault_active: binary_sensor.altair_fault
  frost_protection_active: binary_sensor.altair_frost_protection
```

Note there is no `bypass_state` entry — the `altair` profile doesn't declare that role at all, so there's nothing to map, and no bypass row can ever appear for this manufacturer regardless of config. Entity IDs above are illustrative; replace with whatever your integration actually exposes.

**Implemented today:** every role in this example (`mode`, all four temperatures, both airflows, `filter_remaining`, `fault_active`, `frost_protection_active`) plus the system-mode Altair controller roles shown below. `mode_control` (writable) and `fault_code`/`fault_description` (detail text) are specified in `SPECIFICATION.md` §2 but not implemented yet.

Try `display_mode: homeowner` instead to see the same config with unconfigured/optional rows omitted rather than shown.

## System mode with optional controls

`display_mode: system` uses the same generic roles. `Off` appears in the operating-mode selector when either the real `select` entity exposes an off option in `attributes.options` or the Altair backend stop switch is mapped as `stop_control`. For the ha-altair-mvhr backend, `switch.altair_mvhr_stop_unit` maps Coil 00004: off = running, on = stopped.

```yaml
type: custom:hiper-mvhr-card
manufacturer: altair
display_mode: system
name: Altair MVHR
max_airflow: 120
entities:
  mode: select.altair_mvhr_mode
  effective_mode: sensor.altair_mvhr_effective_mode
  stop_control: switch.altair_mvhr_stop_unit
  airflow: sensor.altair_mvhr_airflow
  target_airflow: sensor.altair_mvhr_target_airflow
  maximum_airflow: sensor.altair_mvhr_maximum_airflow
  outdoor_air_temp: sensor.altair_mvhr_outdoor_air_temperature
  supply_air_temp: sensor.altair_mvhr_supply_air_temperature
  extract_air_temp: sensor.altair_mvhr_extract_air_temperature
  exhaust_air_temp: sensor.altair_mvhr_exhaust_air_temperature
  indoor_humidity: sensor.altair_mvhr_indoor_humidity
  boost_active: binary_sensor.altair_mvhr_boost_active
  boost_remaining: sensor.altair_mvhr_boost_remaining
  start_boost: button.altair_mvhr_start_boost
  cancel_boost: button.altair_mvhr_cancel_boost
  away_airflow: number.altair_mvhr_away_airflow
  low_airflow: number.altair_mvhr_low_airflow
  home_airflow: number.altair_mvhr_home_airflow
  high_airflow: number.altair_mvhr_high_airflow
  calibration_available: binary_sensor.altair_mvhr_airflow_calibration_available
  calibration_start_control: button.altair_mvhr_start_airflow_calibration
  calibration_cancel_control: button.altair_mvhr_cancel_airflow_calibration
  calibration_status: sensor.altair_mvhr_airflow_calibration_status
  calibration_progress: sensor.altair_mvhr_airflow_calibration_progress
  calibration_result: sensor.altair_mvhr_airflow_calibration_result
  last_calibration: sensor.altair_mvhr_last_airflow_calibration
  shower_detected: binary_sensor.altair_shower_detected
  shower_trigger_temperature: sensor.altair_shower_trigger_temperature
  shower_peak_temperature: sensor.altair_mvhr_shower_peak_temperature
  shower_rearm_temperature: sensor.altair_mvhr_shower_rearm_temperature
  shower_pipe_temperature: sensor.shower_pipe_temperature
  shower_temperature_rise: number.altair_mvhr_shower_temperature_rise
  shower_detection_window: number.altair_mvhr_shower_detection_window
  shower_rearm_temperature_drop: number.altair_mvhr_shower_rearm_temperature_drop
  heat_recovery: sensor.altair_mvhr_heat_recovery
  cooling_recovery: sensor.altair_mvhr_cooling_recovery
  heat_recovery_efficiency: sensor.altair_mvhr_heat_recovery_efficiency
  heating_recovered_today: sensor.altair_mvhr_heat_recovered_today
  heating_recovered_month: sensor.altair_mvhr_heat_recovered_month
  heating_recovered_lifetime: sensor.altair_mvhr_heat_recovered_total
  cooling_recovered_today: sensor.altair_mvhr_cooling_recovered_today
  cooling_recovered_month: sensor.altair_mvhr_cooling_recovered_month
  cooling_recovered_lifetime: sensor.altair_mvhr_cooling_recovered_total
  heating_savings_today: sensor.altair_mvhr_heating_saving_today
  heating_savings_lifetime: sensor.altair_mvhr_heating_saving_total
  cooling_savings_today: sensor.altair_mvhr_cooling_saving_today
  cooling_savings_lifetime: sensor.altair_mvhr_cooling_saving_total
  avoided_emissions_today: sensor.altair_mvhr_avoided_emissions_today
  avoided_emissions_lifetime: sensor.altair_mvhr_avoided_emissions_total
  weekly_schedule: sensor.altair_mvhr_weekly_schedule
  schedule_control: switch.altair_mvhr_weekly_schedule
  schedule_enabled: binary_sensor.altair_mvhr_weekly_schedule_enabled
  current_scheduled_mode: sensor.altair_mvhr_current_scheduled_mode
  next_scheduled_change: sensor.altair_mvhr_next_scheduled_change
  schedule_override_active: binary_sensor.altair_mvhr_schedule_override_active
```

`calibration` and `start_calibration` are accepted as shortcuts for the canonical `calibration_start_control` role; `cancel_calibration` maps to `calibration_cancel_control`. The preset airflow rows only render for real configured number/input_number entities; if none are configured, More controls shows a short empty-state explanation. Performance analytics roles are optional and the PERFORMANCE section trims itself to whichever live power, recovered energy, savings, or emissions sensors your backend exposes.

Weekly schedule roles are optional. When mapped, the SCHEDULE section edits the
backend schedule model via `altair_mvhr` services; the Lovelace card is not the
source of truth and missing schedule entities are omitted cleanly.

`shower_peak_temperature` and `shower_rearm_temperature` are optional
diagnostic shower sensors. The active shower banner reads "Re-arm at" from the
backend re-arm temperature sensor directly; it does not recalculate that value
from the trigger temperature. `shower_temperature_rise`,
`shower_detection_window`, and `shower_rearm_temperature_drop` are optional
editable shower auto-boost settings. Missing controls are hidden and
unavailable controls are disabled.
