# Altair 160

Capability profile ID: `altair`

## Confirmed facts

- **No summer bypass.** The Altair 160 does not have a bypass mechanism. The card must never render a bypass control or bypass status for this profile — `bypass_state` and `bypass_control` are omitted entirely from `supportedRoles`, not just hidden conditionally.
- **Stop/start control.** The ha-altair-mvhr backend exposes the stop coil as a Home Assistant control for Coil 00004: `0`/off means the unit is enabled/running, and `1`/on stops the unit. The card maps this through the generic `stop_control` role, not through manufacturer-specific rendering code.
- **Airflow presets and calibration controls.** The backend exposes editable Away/Low/Home/High airflow number entities and airflow calibration availability, start, cancel, status, progress, result, and last-calibration entities. These are declared in the Altair capability profile and hidden automatically when an installation does not map the corresponding entities.
- **Performance analytics.** The backend exposes optional recovered power,
  efficiency, recovered energy, savings, and avoided-emissions sensors. The
  card maps these through generic analytics roles and renders only whichever
  entities an installation configures and Home Assistant currently reports.

## Implemented

`filter_remaining`, `fault_active`, `frost_protection_active`, `stop_control`, airflow preset numbers, airflow calibration roles, shower-detection roles, and performance analytics roles are declared supported and render when configured — this means the *role* exists and the card can show/use it, not that every optional entity must be present in every installation. Correct the TBD items below the moment real documentation exists; the profile's declared support doesn't need to change either way unless a capability itself is disproven.

## TBD (needs verification)

- Frost protection method (preheater vs. defrost cycle vs. none)
- Filter monitoring: unit (days/%/hours), resettable?
- Full operating mode list
- Boost timer support
- Humidity/CO₂ sensor availability
- Known third-party Home Assistant integration path(s) beyond ha-altair-mvhr and typical entity naming

## Notes

Do not add a bypass entity mapping example to `examples/altair-160/` even as a "disabled" example — the goal is that the config schema has nowhere to put one for this profile, so there's nothing to demonstrate turning off.
