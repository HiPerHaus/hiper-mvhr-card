# Example: Zehnder ComfoAir Q (Q350 / Q450 / Q600)

```yaml
type: custom:hiper-mvhr-card
manufacturer: zehnder-comfoair-q
view: installer
entities:
  mode: select.comfoair_mode
  mode_control: select.comfoair_mode
  supply_airflow: sensor.comfoair_supply_flow
  extract_airflow: sensor.comfoair_extract_flow
  supply_air_temp: sensor.comfoair_supply_temp
  extract_air_temp: sensor.comfoair_extract_temp
  outdoor_air_temp: sensor.comfoair_outdoor_temp
  exhaust_air_temp: sensor.comfoair_exhaust_temp
  bypass_state: binary_sensor.comfoair_bypass
  filter_remaining: sensor.comfoair_filter_remaining
```

This config applies unchanged to Q350, Q450, and Q600 — model capacity doesn't affect which entities you map, only the numeric ranges you'd expect to see. Entity IDs above are illustrative; replace with whatever your integration actually exposes (commonly a ComfoConnect/LAN C bridge integration).

**Phase 1 status:** this example shows the full future schema. Today's implementation renders `mode`, the four temperatures, both airflows, and `bypass_state`; `mode_control` and `filter_remaining` are accepted but currently ignored (unknown role) until later phases add them.
