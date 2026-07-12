# Specification

This document defines the contracts the card implements: config schema, entity roles, capability profiles, and view behavior. See `docs/architecture.md` for the reasoning behind these choices, and `docs/manufacturers/*.md` for manufacturer-specific detail (register maps, known entity-naming conventions per integration).

Anything marked **TBD** is a placeholder pending real hardware/integration documentation for that manufacturer — it is deliberately not fabricated here.

## 1. Supported systems (launch set)

| Profile ID | Display name | Models covered | Control platform |
|---|---|---|---|
| `altair` | Altair 160 | 160 | — |
| `zehnder-comfoair-q` | Zehnder ComfoAir Q | Q350, Q450, Q600 | shared (assumed) |
| `vent_axia_sentinel_econiq` | Aerofresh | 300, 450 | Vent-Axia Sentinel Econiq (shared) |
| `generic` | Generic MVHR | any | user-declared via feature flags |

**The Aerofresh profile's technical id (`vent_axia_sentinel_econiq`) is internal only.** It reflects the underlying control platform, similar to how Zehnder's profile id names its platform rather than a specific model. Every user-facing string — card header, examples, docs prose outside this table — must say "Aerofresh" and never "Vent-Axia" or "Sentinel Econiq." See `docs/manufacturers/aerofresh.md`.

Model differences within `zehnder-comfoair-q` and `vent_axia_sentinel_econiq` are treated as capacity metadata, not capability differences, until proven otherwise (see `docs/architecture.md` §13).

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

**Implemented so far** (`src/types/entity-roles.ts`): `mode`, `outdoor_air_temp`, `supply_air_temp`, `extract_air_temp`, `exhaust_air_temp`, `supply_airflow`, `extract_airflow`, `bypass_state` (Phase 1), plus `filter_remaining`, `fault_active`, `frost_protection_active` (Phase 2). Everything else in the table above (`mode_control`, `heat_recovery_efficiency`, `bypass_control`, `filter_alarm`, `filter_reset_control`, `fault_code`, `fault_description`, `boost_remaining`, `indoor_humidity`, `co2_level`, `commissioning_diagnostics`) is specified but not yet implemented.

## 3. Capability matrix (launch set)

| Capability | Altair 160 | Zehnder ComfoAir Q | Aerofresh | Generic |
|---|---|---|---|---|
| Summer bypass | **Not supported** (confirmed, hard-locked — see `docs/architecture.md` §5) | Supported (assumed) | Supported (assumed) | Off by default, feature-flaggable |
| Manual bypass override | N/A | TBD | TBD | feature-flaggable |
| Frost protection | Role implemented, assumed supported (TBD method) | Role implemented, assumed supported (TBD method) | Role implemented, assumed supported (TBD method) | Off by default |
| Filter monitoring | Role implemented, assumed supported, unit TBD | Role implemented, assumed supported, unit TBD | Role implemented, assumed supported, unit TBD | Off by default |
| Fault indication | Role implemented, assumed supported | Role implemented, assumed supported | Role implemented, assumed supported | Off by default |
| Boost timer | Not implemented | Not implemented | Not implemented | Not implemented |
| Humidity sensor | Not implemented | Not implemented | Not implemented | Not implemented |
| CO₂ sensor | Not implemented | Not implemented | Not implemented | Not implemented |
| Commissioning diagnostics | Not implemented (ROADMAP.md Phase 4) | Not implemented | Not implemented | Not implemented |

"Role implemented" means the entity role exists in `src/types/entity-roles.ts` and the profile declares it supported (Phase 2); it does not mean the real-world facts behind it (exact method, unit, register) have been verified — those are still TBD per the notes above until confirmed against real hardware documentation.

The only capability confirmed against real product knowledge at time of writing is Altair's lack of bypass. Everything else marked "assumed" should be corrected in the relevant `docs/manufacturers/*.md` file as soon as it's verified, and the capability profile updated to match — this table and the profile source file must never disagree.

## 4. Card configuration schema

```yaml
type: custom:hiper-mvhr-card
manufacturer: <profile id>          # required
name: <string>                      # optional card title override; defaults to "HiPer MVHR Card"
display_mode: homeowner | detailed  # default: homeowner (renamed from `view` in Phase 2)
entities:                           # required, only supported roles are meaningful
  <role id>: <entity id>
feature_flags:                      # optional, overrides profile defaults
  <flag id>: true | false
```

`display_mode` was named `view` in Phase 1 and accepted `homeowner | installer | commissioning`. Phase 2 renamed it to match the project's terminology and narrowed it to the two modes actually implemented (`SPECIFICATION.md` §5) — `commissioning` will be added back once it exists (`ROADMAP.md` Phase 4), which is an additive, non-breaking change when it happens. The `title` field mentioned in earlier drafts of this document never matched the implementation; `name` is correct and has been since Phase 1.

Validation rules:

- `manufacturer` must match a registered profile ID; unknown values fail config validation with a clear error (this is a config-time error, not a runtime "unavailable" state).
- Keys under `entities` that aren't roles supported by the active profile are ignored with a non-fatal warning (surfaced in the editor, not thrown at runtime).
- Roles supported by the profile but absent from `entities` are valid — they render as "not configured" (see §6).

## 5. Display modes

| Mode | Audience | Content |
|---|---|---|
| `homeowner` | non-technical residents | mode, configured temps/airflow/status, plain language, unconfigured optional roles omitted entirely, no raw entity IDs |
| `detailed` | installers/technicians | everything in homeowner + "not configured" roles shown, missing-entity configuration warnings (with the entity id), still no raw Modbus/integration-specific detail |
| `commissioning` | commissioning engineers | not yet implemented — reserved for raw entity/register inspection (`ROADMAP.md` Phase 4) |

Modes are additive top to bottom; a future `commissioning` mode is expected to show everything `detailed` shows, plus more.

## 6. Rendering states

Every role rendered is in exactly one of five states, per `docs/architecture.md` §10 (the fifth, `entity_missing`, was split out from `unavailable` in Phase 2 to distinguish a configuration mistake from a runtime hiccup):

1. **Unsupported** — profile doesn't declare this role → not rendered, in any display mode.
2. **Not configured** — profile supports it, config doesn't map an entity → omitted in `homeowner`; shown as a muted "Not configured" affordance in `detailed`.
3. **Entity missing** — an entity id is mapped, but Home Assistant has no such entity (typo, renamed/removed entity) → `homeowner` shows a quiet "Unavailable" (no entity id, no jargon); `detailed` shows an explicit warning naming the missing entity id.
4. **Unavailable** — entity mapped and exists, but its HA state is `unavailable`/`unknown` → shown as "Unavailable" in both modes, never blank, never stale.
5. **Value** — entity mapped and available → rendered normally, including a legitimate numeric zero (only the literal states `unavailable`/`unknown` count as unavailable — `"0"` is a value).

A card must never throw, log an unhandled error, or silently render nothing where state 2, 3, or 4 applies.

## 7. Non-functional requirements

- **Theming**: must respect Home Assistant's light/dark theme CSS variables; no hardcoded colors outside status semantics (ok/warning/error).
- **Responsiveness**: usable from a phone-width dashboard panel up to a desktop panel.
- **Performance**: re-render only on changes to entities the active config actually maps; no polling.
- **Accessibility**: sensible heading hierarchy (card title, then one heading per section); status text must never rely on color alone (an icon or word always accompanies a tone); the availability indicator uses `role="status"`; interactive controls (mode selector, bypass toggle, filter reset — none exist yet, see `ROADMAP.md` Phase 3) must be keyboard operable and labeled once added.
- **Resilience**: see §6 — degrade, never fail.
- **No manufacturer conditionals in `src/components/**`** — enforced by code review, not tooling, for now; may become an ESLint rule later if violations recur.
