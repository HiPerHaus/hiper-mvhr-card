# Example: Generic profile (DIY / ESPHome / template sensors)

```yaml
type: custom:hiper-mvhr-card
manufacturer: generic
display_mode: homeowner
feature_flags:
  mode: true
  supply_air_temp: true
  extract_air_temp: true
  bypass_state: true
  filter_remaining: true
  filter_reset_control: true
entities:
  mode: input_select.mvhr_mode
  supply_air_temp: sensor.mvhr_supply_temp
  extract_air_temp: sensor.mvhr_extract_temp
  bypass_state: binary_sensor.mvhr_bypass
  filter_remaining: sensor.mvhr_filter_days
  filter_reset_control: button.mvhr_filter_reset
```

Unlike the named manufacturer profiles, `generic` supports nothing by default — each `feature_flags` entry above turns a role on so it can then be mapped under `entities`. Enable only what your setup actually exposes.

**Implemented today:** `mode`, `effective_mode`, `stop_control`, all four temperatures, shared/per-duct airflows, `target_airflow`, `maximum_airflow`, `mapped_level`, `selected_speed`, fan speeds, `indoor_humidity`, `bypass_state`, boost/override roles, shower-detection roles, MVHR performance analytics roles, backend-owned weekly schedule roles, `filter_remaining`, `fault_active`, `frost_protection_active`, `filter_reset_control`, the system-mode airflow preset roles, and the airflow calibration roles — enable whichever of these your DIY setup actually has via `feature_flags`. Action roles normally map to `button` or `input_button` domain entities (Home Assistant's own "press" convention — see `src/data/control-dispatcher.ts`); preset airflow roles normally map to `number` or `input_number` entities; `stop_control` normally maps to a `switch`/`input_boolean` where on means stopped. Schedule roles normally map to a backend schedule sensor/status entities plus a switch/input_boolean or backend services for writes. `co2_level` is specified in `SPECIFICATION.md` §2 but not implemented yet. `mode_control` and `bypass_control` are Phase 3B/3C.
