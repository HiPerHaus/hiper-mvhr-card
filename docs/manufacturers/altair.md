# Altair 160

Capability profile ID: `altair`

## Confirmed facts

- **No summer bypass.** The Altair 160 does not have a bypass mechanism. The card must never render a bypass control or bypass status for this profile — `bypass_state` and `bypass_control` are omitted entirely from `supportedRoles`, not just hidden conditionally.

## Implemented (Phase 2)

`filter_remaining`, `fault_active`, and `frost_protection_active` are declared supported and render in the system status section when configured — this means the *role* exists and the card can show it, not that the facts below are confirmed. Correct the TBD items below the moment real documentation exists; the profile's declared support doesn't need to change either way.

## TBD (needs verification)

- Frost protection method (preheater vs. defrost cycle vs. none)
- Filter monitoring: unit (days/%/hours), resettable?
- Full operating mode list
- Boost timer support
- Humidity/CO₂ sensor availability
- Known Home Assistant integration path(s) for this unit (native integration, Modbus, ESPHome?) and typical entity naming

## Notes

Do not add a bypass entity mapping example to `examples/altair-160/` even as a "disabled" example — the goal is that the config schema has nowhere to put one for this profile, so there's nothing to demonstrate turning off.
