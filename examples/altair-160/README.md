# Example: Altair 160

```yaml
type: custom:hiper-mvhr-card
manufacturer: altair
view: installer
entities:
  mode: select.altair_mode
  mode_control: select.altair_mode
  supply_air_temp: sensor.altair_supply_temp
  extract_air_temp: sensor.altair_extract_temp
  outdoor_air_temp: sensor.altair_outdoor_temp
  filter_remaining: sensor.altair_filter_remaining
  fault_active: binary_sensor.altair_fault
```

Note there is no `bypass_state`/`bypass_control` entry — the `altair` profile doesn't declare that role, so there's nothing to map. Entity IDs above are illustrative; replace with whatever your integration actually exposes.

**Phase 1 status:** this example shows the full future schema (SPECIFICATION.md §2). Today's implementation (ROADMAP.md Phase 1) only resolves and renders `mode`, `outdoor_air_temp`, `supply_air_temp`, `extract_air_temp`, `exhaust_air_temp`, `supply_airflow`, `extract_airflow`, and `bypass_state` (omitted here, as above). `mode_control`, `filter_remaining`, and `fault_active` are accepted by the config parser but currently ignored with a console warning (unknown role) — they'll start working automatically once those roles are added to `src/types/entity-roles.ts` in a later phase, no config changes needed on your part.
