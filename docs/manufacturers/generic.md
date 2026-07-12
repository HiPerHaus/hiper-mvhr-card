# Generic profile

Capability profile ID: `generic`

## Purpose

For MVHR systems with no dedicated profile: DIY installs, ESPHome-based monitoring, template sensors, or any manufacturer not yet supported. Every role is off by default and enabled per-installation via `feature_flags` in the card config, rather than assumed from a manufacturer identity.

## Behavior

- No role is assumed supported; the user opts in to each role their setup actually exposes.
- Because there is no fixed "this manufacturer has/doesn't have X" fact to rely on, the generic profile is also the reference implementation for how `feature_flags` override profile defaults (`docs/architecture.md` §7) — every other profile's flags follow the same mechanism, just with different starting defaults.
- Operating modes are user-declared (no fixed enum), since a template-sensor or ESPHome setup can expose whatever mode set the installer defined.

## Notes for whoever picks this up

This profile has no TBD list in the same sense as the named manufacturers — there's nothing to verify, since it makes no manufacturer-specific claims by design. Its implementation risk is different: make sure the config editor UI for `generic` clearly explains what each feature flag does, since the person configuring it (often the installer or the homeowner themselves) is making decisions a manufacturer profile would otherwise make for them.
