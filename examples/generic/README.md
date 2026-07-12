# Example: Generic profile (DIY / ESPHome / template sensors)

```yaml
type: custom:hiper-mvhr-card
manufacturer: generic
view: installer
feature_flags:
  bypass_state: true
  filter_remaining: true
  co2_level: true
entities:
  mode: input_select.mvhr_mode
  supply_air_temp: sensor.mvhr_supply_temp
  extract_air_temp: sensor.mvhr_extract_temp
  bypass_state: binary_sensor.mvhr_bypass
  filter_remaining: sensor.mvhr_filter_days
  co2_level: sensor.mvhr_co2
```

Unlike the named manufacturer profiles, `generic` supports nothing by default — each `feature_flags` entry above turns on a role so it can then be mapped under `entities`. Enable only what your setup actually exposes.

**Phase 1 status:** this example shows the full future schema. `filter_remaining` and `co2_level` aren't implemented roles yet (accepted but ignored — unknown role); `mode`, `supply_air_temp`, `extract_air_temp`, and `bypass_state` work today once feature-flagged on.
