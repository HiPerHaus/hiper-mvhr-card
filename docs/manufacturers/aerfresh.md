# Aerofresh 300 / 450

Capability profile ID: `aerfresh`

## Assumption driving this doc

Aerofresh 300 and 450 are described in the project brief as "Vent-Axia based," so they're treated as one capability profile sharing a control platform, differing in capacity. This is **not yet confirmed** in detail — see `docs/architecture.md` §13.

## TBD (needs verification before implementation)

- Summer bypass: assumed supported — confirm and note automatic vs. manual
- Frost protection method
- Filter monitoring: unit, resettable?
- Full operating mode list
- Boost timer support
- Humidity/CO₂ sensor availability
- Known integration path(s) — confirm whether Vent-Axia units in the field are typically exposed via a native integration, Modbus gateway, or MQTT bridge, and typical entity naming for each

## Notes

If "Vent-Axia based" turns out to mean these units share firmware/registers with other Vent-Axia-branded products outside the Aerofresh name, consider whether the profile ID should reflect the underlying platform rather than the Aerofresh brand name — worth revisiting once real register documentation is available.
