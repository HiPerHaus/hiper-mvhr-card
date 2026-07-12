# Zehnder ComfoAir Q (Q350 / Q450 / Q600)

Capability profile ID: `zehnder-comfoair-q`

## Assumption driving this doc

Q350, Q450, and Q600 are treated as one capability profile because they're assumed to share the same control platform and differ mainly in airflow capacity. This is **not yet confirmed** — see `docs/architecture.md` §13. If any model in this family supports a role the others don't (e.g. a sensor only available on Q600), split it into its own profile or add a per-model override to `RoleSupport` before implementation, and update `SPECIFICATION.md` §3 accordingly.

## Implemented (Phase 2)

`bypass_state`, `filter_remaining`, `fault_active`, and `frost_protection_active` are declared supported and render in the system status section when configured. As with Altair, this means the role exists in the card, not that the TBD facts below are confirmed.

## TBD (needs verification)

- Summer bypass: assumed supported across all three models — confirm and note whether it's automatic-only or has a manual override
- Frost protection method
- Filter monitoring: unit, resettable?
- Full operating mode list (Zehnder units typically expose several preset levels — confirm exact set and IDs)
- Boost timer support
- Humidity/CO₂ sensor availability (ComfoAir Q units are commonly paired with humidity sensors — confirm whether native or add-on)
- Known integration path(s): Zehnder has historically been integrated via ComfoConnect/LAN C bridges into Home Assistant — confirm current recommended integration and typical entity naming

## Notes

Model capacity (Q350/Q450/Q600) should be stored as metadata (`models` field on the profile) for display purposes only, not used to branch behavior.
