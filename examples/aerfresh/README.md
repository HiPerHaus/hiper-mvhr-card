# Example: Aerofresh 300 / 450

```yaml
type: custom:hiper-mvhr-card
manufacturer: aerfresh
view: installer
entities:
  mode: select.aerofresh_mode
  mode_control: select.aerofresh_mode
  supply_air_temp: sensor.aerofresh_supply_temp
  extract_air_temp: sensor.aerofresh_extract_temp
  outdoor_air_temp: sensor.aerofresh_outdoor_temp
  bypass_state: binary_sensor.aerofresh_bypass
  filter_remaining: sensor.aerofresh_filter_remaining
```

Applies to both 300 and 450 capacities. Entity IDs above are illustrative; replace with whatever your integration actually exposes.

**Phase 1 status:** this example shows the full future schema. Today's implementation renders `mode`, `outdoor_air_temp`, `supply_air_temp`, `extract_air_temp`, and `bypass_state` (note: `exhaust_air_temp`/airflow roles aren't mapped in this example, so they'd show as "Not configured"); `mode_control` and `filter_remaining` are accepted but currently ignored (unknown role) until later phases add them.
