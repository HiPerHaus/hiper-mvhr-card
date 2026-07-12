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
