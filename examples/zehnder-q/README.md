# Example: Zehnder ComfoAir Q (Q350 / Q450 / Q600)

```yaml
type: custom:hiper-mvhr-card
manufacturer: zehnder-comfoair-q
display_mode: detailed
entities:
  mode: select.comfoair_mode
  outdoor_air_temp: sensor.comfoair_outdoor_temp
  supply_air_temp: sensor.comfoair_supply_temp
  extract_air_temp: sensor.comfoair_extract_temp
  exhaust_air_temp: sensor.comfoair_exhaust_temp
  supply_airflow: sensor.comfoair_supply_flow
  extract_airflow: sensor.comfoair_extract_flow
  bypass_state: binary_sensor.comfoair_bypass
  filter_remaining: sensor.comfoair_filter_remaining
  fault_active: binary_sensor.comfoair_fault
  frost_protection_active: binary_sensor.comfoair_frost_protection
```

This config applies unchanged to Q350, Q450, and Q600 — model capacity doesn't affect which entities you map, only the numeric ranges you'd expect to see. Entity IDs above are illustrative; replace with whatever your integration actually exposes (commonly a ComfoConnect/LAN C bridge integration).

**Implemented today (Phase 2):** every role in this example. `mode_control` (writable) and `bypass_control` (manual override) are specified but not implemented yet — see `ROADMAP.md` Phase 3.
