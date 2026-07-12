# Specification

This document defines the contracts the card implements: config schema, entity roles, capability profiles, and view behavior. See `docs/architecture.md` for the reasoning behind these choices, and `docs/manufacturers/*.md` for manufacturer-specific detail (register maps, known entity-naming conventions per integration).

Anything marked **TBD** is a placeholder pending real hardware/integration documentation for that manufacturer — it is deliberately not fabricated here.

## 1. Supported systems (launch set)

| Profile ID | Vendor | Models covered | Control platform |
|---|---|---|---|
| `altair` | Altair | 160 | — |
| `zehnder-comfoair-q` | Zehnder | ComfoAir Q350, Q450, Q600 | shared (assumed) |
| `aerfresh` | Aerofresh (Vent-Axia) | 300, 450 | shared, Vent-Axia based |
| `generic` | — | any | user-declared via feature flags |

Model differences within `zehnder-comfoair-q` and `aerfresh` are treated as capacity metadata, not capability differences, until proven otherwise (see `docs/architecture.md` §13).

## 2. Entity roles

Roles are grouped by category. `views` lists which audience views show the role by default (`H` homeowner, `I` installer, `C` commissioning); all roles are visible in commissioning view.

| Role ID | Category | Value type | Views | Notes |
|---|---|---|---|---|
| `mode` | core | enum | H, I | current operating mode |
| `mode_control` | core | enum (writable) | H, I | entity used to change mode |
| `supply_airflow` | core | numeric | I | m³/h or % of capacity |
| `extract_airflow` | core | numeric | I | m³/h or % of capacity |
| `supply_air_temp` | core | numeric | H, I | °C |
| `extract_air_temp` | core | numeric | I | °C |
| `outdoor_air_temp` | core | numeric | H, I | °C |
| `exhaust_air_temp` | core | numeric | I | °C |
| `heat_recovery_efficiency` | core | numeric | H, I | % |
| `bypass_state` | core | binary | H, I | omitted entirely for profiles without bypass (e.g. Altair) |
| `bypass_control` | core | binary (writable) | I | manual override, only if profile allows manual control |
| `filter_remaining` | core | numeric | H, I | unit defined per profile (days / % / hours) |
| `filter_alarm` | core | binary | H, I | |
| `filter_reset_control` | core | action | I | |
| `frost_protection_active` | diagnostic | binary | I | |
| `fault_active` | core | binary | H, I | |
| `fault_code` | diagnostic | text | I, C | |
| `fault_description` | diagnostic | text | I, C | |
| `boost_remaining` | core | numeric | H, I | minutes remaining, if boost has a timer |
| `indoor_humidity` | optional | numeric | H, I | not all systems expose this |
| `co2_level` | optional | numeric | H, I | not all systems expose this |
| `commissioning_diagnostics` | commissioning | text/table | C | raw register/entity inspector |

This table is the initial set, not a closed one — new roles are additive (see architecture §4) and don't require a schema version bump for `MvhrSnapshot`/`CapabilityProfile`, only a role-registry entry.

## 3. Capability matrix (launch set)

| Capability | Altair 160 | Zehnder ComfoAir Q | Aerofresh | Generic |
|---|---|---|---|---|
| Summer bypass | **Not supported** (confirmed) | Supported (assumed) | Supported (assumed) | Off by default, feature-flaggable |
| Manual bypass override | N/A | TBD | TBD | feature-flaggable |
| Frost protection | Assumed supported (TBD method) | Assumed supported (TBD method) | Assumed supported (TBD method) | Off by default |
| Filter monitoring | Assumed supported, unit TBD | Assumed supported, unit TBD | Assumed supported, unit TBD | Off by default |
| Boost timer | TBD | TBD | TBD | Off by default |
| Humidity sensor | TBD | TBD | TBD | feature-flaggable |
| CO₂ sensor | TBD | TBD | TBD | feature-flaggable |
| Commissioning diagnostics | Supported (generic register/entity inspector) | Supported | Supported | Supported |

The only capability confirmed against real product knowledge at time of writing is Altair's lack of bypass. Everything else marked "assumed" should be corrected in the relevant `docs/manufacturers/*.md` file as soon as it's verified, and the capability profile updated to match — this table and the profile source file must never disagree.

## 4. Card configuration schema

```yaml
type: custom:hiper-mvhr-card
manufacturer: <profile id>         # required
view: homeowner | installer | commissioning   # default: homeowner
entities:                          # required, only supported roles are meaningful
  <role id>: <entity id>
feature_flags:                     # optional, overrides profile defaults
  <flag id>: true | false
title: <string>                    # optional card title override
```

Validation rules:

- `manufacturer` must match a registered profile ID; unknown values fail config validation with a clear error (this is a config-time error, not a runtime "unavailable" state).
- Keys under `entities` that aren't roles supported by the active profile are ignored with a non-fatal warning (surfaced in the editor, not thrown at runtime).
- Roles supported by the profile but absent from `entities` are valid — they render as "not configured" (see §6).

## 5. Views

| View | Audience | Content |
|---|---|---|
| `homeowner` | non-technical residents | mode, key temps, air quality if available, filter/fault status in plain language, minimal controls |
| `installer` | installers/technicians | everything in homeowner + airflow, all temps, balancing info, bypass control, fault codes |
| `commissioning` | commissioning engineers | everything in installer + raw entity/register inspector, full diagnostics |

Views are additive top to bottom; commissioning always shows everything installer shows.

## 6. Rendering states

Every role rendered by a view is in exactly one of four states, per `docs/architecture.md` §10:

1. **Unsupported** — profile doesn't declare this role → not rendered.
2. **Not configured** — profile supports it, config doesn't map an entity → shown as a muted "not configured" affordance.
3. **Unavailable** — entity mapped, but its HA state is `unavailable`/`unknown` → shown as "unavailable," not blank, not stale.
4. **Value** — entity mapped and available → rendered normally.

A card must never throw, log an unhandled error, or silently render nothing where state 2 or 3 applies.

## 7. Non-functional requirements

- **Theming**: must respect Home Assistant's light/dark theme CSS variables; no hardcoded colors outside status semantics (ok/warning/error).
- **Responsiveness**: usable from a phone-width dashboard panel up to a desktop panel.
- **Performance**: re-render only on changes to entities the active config actually maps; no polling.
- **Accessibility**: interactive controls (mode selector, bypass toggle, filter reset) must be keyboard operable and labeled.
- **Resilience**: see §6 — degrade, never fail.
- **No manufacturer conditionals in `src/components/**`** — enforced by code review, not tooling, for now; may become an ESLint rule later if violations recur.
