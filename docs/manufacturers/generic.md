# Generic profile

Capability profile ID: `generic`

## Purpose

For MVHR systems with no dedicated profile: DIY installs, ESPHome-based monitoring, template sensors, or any manufacturer not yet supported. Every role is off by default and enabled per-installation via `feature_flags` in the card config, rather than assumed from a manufacturer identity.

## Behavior

- No role is assumed supported; the user opts in to each role their setup actually exposes.
- As of Phase 3A, the roles that actually do something when flagged on are: `mode`, `outdoor_air_temp`, `supply_air_temp`, `extract_air_temp`, `exhaust_air_temp`, `supply_airflow`, `extract_airflow`, `bypass_state`, `filter_remaining`, `fault_active`, `frost_protection_active`, `filter_reset_control`. Flagging on anything else (e.g. `co2_level`) is accepted but currently a no-op until that role is implemented.
- `filter_reset_control` (Phase 3A) is the first action role: map it to a `button` or `input_button` entity id and the card renders a labeled "Reset" button that calls that entity's `press` service (`src/data/control-dispatcher.ts`). Generic is the only profile that supports it today — see `SPECIFICATION.md` §3, "Filter reset (manual)" is still TBD for every named manufacturer.
- Because there is no fixed "this manufacturer has/doesn't have X" fact to rely on, the generic profile is also the reference implementation for how `feature_flags` override profile defaults (`docs/architecture.md` §7) — every other profile's flags follow the same mechanism, just with different starting defaults.
- Operating modes are user-declared (no fixed enum), since a template-sensor or ESPHome setup can expose whatever mode set the installer defined.

## Notes for whoever picks this up

This profile has no TBD list in the same sense as the named manufacturers — there's nothing to verify, since it makes no manufacturer-specific claims by design. Its implementation risk is different: make sure the config editor UI for `generic` clearly explains what each feature flag does, since the person configuring it (often the installer or the homeowner themselves) is making decisions a manufacturer profile would otherwise make for them.
