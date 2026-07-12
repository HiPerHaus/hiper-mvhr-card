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

**Implemented today (Phase 3A):** `mode`, all four temperatures, both airflows, `bypass_state`, `filter_remaining`, `fault_active`, `frost_protection_active`, and `filter_reset_control` — enable whichever of these your DIY setup actually has via `feature_flags`. `filter_reset_control` must map to a `button` or `input_button` domain entity (Home Assistant's own "press" convention — see `src/data/control-dispatcher.ts`); mapping it to any other domain won't do anything useful yet. `co2_level` and `indoor_humidity` are specified in `SPECIFICATION.md` §2 but not implemented yet — mapping them today is accepted but silently ignored (unknown role) until a later phase adds them. `mode_control` and `bypass_control` are Phase 3B/3C.
