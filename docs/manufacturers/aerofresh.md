# Aerofresh 300 / 450

Capability profile ID: `vent_axia_sentinel_econiq` (renamed from `aerfresh` in Phase 2 — see below).

## The rename

Phase 0's version of this doc flagged, in its own Notes section, that the profile id might need to reflect the underlying platform rather than the Aerofresh brand name "once real register documentation is available." That's exactly what happened: these units are sold under the Aerofresh brand but run Vent-Axia's Sentinel Econiq control platform, so Phase 2 renamed the technical id to `vent_axia_sentinel_econiq` — the same pattern already used for `zehnder-comfoair-q` (platform id, not brand name).

**This is strictly an internal/technical identifier.** Every user-facing string — the card header, `examples/aerofresh/`, README, any prose outside this file and `SPECIFICATION.md` §1 — must say "Aerofresh" and never "Vent-Axia," "Sentinel Econiq," or the platform id itself. `profile.name` and `profile.vendor` are both the literal string `"Aerofresh"` for exactly this reason; see `src/manufacturers/vent-axia-sentinel-econiq.ts` and the "Aerofresh branding" test in `tests/unit/card-rendering.test.ts`.

## Assumption driving this doc

300 and 450 are treated as one capability profile sharing the Sentinel Econiq platform, differing in capacity. This is **not yet confirmed** in detail — see `docs/architecture.md` §13.

## Implemented (Phase 2)

`bypass_state`, `filter_remaining`, `fault_active`, and `frost_protection_active` are declared supported and render in the system status section when configured.

## TBD (needs verification)

- Summer bypass: assumed supported — confirm and note automatic vs. manual
- Frost protection method
- Filter monitoring: unit, resettable?
- Full operating mode list
- Boost timer support
- Humidity/CO₂ sensor availability
- Known integration path(s) — confirm whether Vent-Axia Sentinel Econiq units in the field are typically exposed via a native integration, Modbus gateway, or MQTT bridge, and typical entity naming for each

## Notes

If "Sentinel Econiq" turns out to cover other Vent-Axia-branded products beyond Aerofresh, this profile may need to serve multiple brand names with the same technical id — that would be a `name`/`vendor` override per installation, not a new profile, since the underlying capability set would be identical. Worth revisiting once real register documentation is available.
