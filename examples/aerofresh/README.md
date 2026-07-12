# Example: Aerofresh 300 / 450

```yaml
type: custom:hiper-mvhr-card
manufacturer: vent_axia_sentinel_econiq
display_mode: detailed
entities:
  mode: select.aerofresh_mode
  outdoor_air_temp: sensor.aerofresh_outdoor_temp
  supply_air_temp: sensor.aerofresh_supply_temp
  extract_air_temp: sensor.aerofresh_extract_temp
  exhaust_air_temp: sensor.aerofresh_exhaust_temp
  bypass_state: binary_sensor.aerofresh_bypass
  filter_remaining: sensor.aerofresh_filter_remaining
  fault_active: binary_sensor.aerofresh_fault
```

The `manufacturer` value is `vent_axia_sentinel_econiq`, not `aerofresh` — Aerofresh units share their control platform with Vent-Axia's Sentinel Econiq line, so the profile's technical id names the platform (the same pattern as `zehnder-comfoair-q`). This id is internal only: the card always displays "Aerofresh" in the header and never mentions Vent-Axia or the platform id anywhere in its rendered output. Use whatever entity IDs your own integration actually exposes — `aerofresh_*` above is just illustrative, matching the brand you'll actually see on the unit.

**Implemented today (Phase 2):** every role in this example. `mode_control` and `bypass_control` are specified but not implemented yet.
