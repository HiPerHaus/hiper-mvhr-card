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

**Implemented today (Phase 2):** every role in this example (`mode`, all four temperatures, both airflows, `filter_remaining`, `fault_active`, `frost_protection_active`). `mode_control` (writable) and `fault_code`/`fault_description` (detail text) are specified in `SPECIFICATION.md` §2 but not implemented yet.

Try `display_mode: homeowner` instead to see the same config with unconfigured/optional rows omitted rather than shown.

## System mode with optional controls

`display_mode: system` uses the same generic roles. `Off` appears in the operating-mode selector only if the real `select` entity exposes an off option in `attributes.options`; the card does not create one locally.

```yaml
type: custom:hiper-mvhr-card
manufacturer: altair
display_mode: system
name: Altair MVHR
max_airflow: 120
feature_flags:
  away_airflow: true
  low_airflow: true
  home_airflow: true
  high_airflow: true
  calibration_start_control: true
entities:
  mode: select.altair_mvhr_mode
  airflow: sensor.altair_mvhr_airflow
  target_airflow: sensor.altair_mvhr_target_airflow
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
  calibration: button.altair_mvhr_calibrate
  shower_detected: binary_sensor.altair_shower_detected
  shower_trigger_temperature: sensor.altair_shower_trigger_temperature
  shower_pipe_temperature: sensor.shower_pipe_temperature
```

`calibration` is accepted as a shortcut for the canonical `calibration_start_control` role. The preset airflow rows only render for real configured number/input_number entities; if none are configured, More controls shows a short empty-state explanation.
