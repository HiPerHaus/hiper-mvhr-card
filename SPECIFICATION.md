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
| `effective_mode` | core | enum | H, I | resolved/runtime mode when different from requested mode |
| `stop_control` | core | binary/action (writable) | H, I | stop/start control; for Altair Coil 00004, `0`/off = running and `1`/on = stopped |
| `mode_control` | core | enum (writable) | H, I | entity used to change mode |
| `supply_airflow` | core | numeric | I | m³/h or % of capacity |
| `extract_airflow` | core | numeric | I | m³/h or % of capacity |
| `airflow` | core | numeric | H, I | single measured airflow value when a system reports shared airflow rather than per-duct readings |
| `target_airflow` | core | numeric | I | current target airflow, if exposed |
| `maximum_airflow` | core | numeric | I | configured/installed maximum airflow, used to scale the system-mode gauge |
| `away_airflow` | core | numeric (writable) | I | user-adjustable Away preset airflow, if exposed as a number entity |
| `low_airflow` | core | numeric (writable) | I | user-adjustable Low preset airflow, if exposed as a number entity |
| `home_airflow` | core | numeric (writable) | I | user-adjustable Home preset airflow, if exposed as a number entity |
| `high_airflow` | core | numeric (writable) | I | user-adjustable High preset airflow, also a fallback gauge maximum |
| `mapped_level` | core | numeric | I | legacy/configured speed level, retained as final gauge fallback |
| `selected_speed` | core | numeric | I | alternate selected speed-level source, feature-flaggable |
| `supply_air_temp` | core | numeric | H, I | °C |
| `extract_air_temp` | core | numeric | I | °C |
| `outdoor_air_temp` | core | numeric | H, I | °C |
| `exhaust_air_temp` | core | numeric | I | °C |
| `heat_recovery_efficiency` | core | numeric | H, I | % |
| `supply_fan_speed` | diagnostic | numeric | I | supply fan rpm, if exposed |
| `extract_fan_speed` | diagnostic | numeric | I | extract fan rpm, if exposed |
| `bypass_state` | core | binary | H, I | omitted entirely for profiles without bypass (e.g. Altair) |
| `bypass_control` | core | binary (writable) | I | manual override, only if profile allows manual control |
| `filter_remaining` | core | numeric | H, I | unit defined per profile (days / % / hours) |
| `filter_alarm` | core | binary | H, I | |
| `filter_reset_control` | core | action | I | |
| `calibration_available` | core | binary | I | airflow calibration is available/supported right now |
| `calibration_status` | core | text | I | airflow calibration state text |
| `calibration_progress` | core | numeric | I | airflow calibration progress percentage |
| `calibration_result` | core | text | I | latest airflow calibration result |
| `last_calibration` | core | timestamp/text | I | last completed airflow calibration timestamp |
| `calibration_start_control` | core | action | I | manual airflow-calibration trigger |
| `calibration_cancel_control` | core | action | I | cancel an in-progress airflow calibration |
| `boost_active` | core | binary | H, I | boost is currently active |
| `frost_protection_active` | diagnostic | binary | I | |
| `fault_active` | core | binary | H, I | |
| `fault_code` | diagnostic | text | I, C | |
| `fault_description` | diagnostic | text | I, C | |
| `boost_duration` | core | numeric (writable) | H, I | boost duration control, usually minutes |
| `start_boost` | core | action | H, I | start boost |
| `cancel_boost` | core | action | H, I | cancel boost |
| `boost_remaining` | core | numeric | H, I | minutes remaining, if boost has a timer |
| `override_duration` | core | enum/numeric (writable) | I | temporary override duration |
| `override_remaining` | core | numeric | I | minutes remaining on override |
| `clear_override` | core | action | I | clear temporary override |
| `indoor_humidity` | optional | numeric | H, I | not all systems expose this |
| `shower_detected` | optional | binary | H, I | optional shower detector status |
| `shower_trigger_temperature` | optional | numeric | H, I | detector trigger temperature |
| `shower_pipe_temperature` | optional | numeric | H, I | live pipe temperature feeding shower detector |
| `shower_temperature_rise` | optional | numeric control | H, I | editable shower detector rise threshold |
| `shower_detection_window` | optional | numeric control | H, I | editable shower detector rolling window |
| `co2_level` | optional | numeric | H, I | not all systems expose this |
| `commissioning_diagnostics` | commissioning | text/table | C | raw register/entity inspector |

This table is the initial set, not a closed one — new roles are additive (see architecture §4) and don't require a schema version bump for `MvhrSnapshot`/`CapabilityProfile`, only a role-registry entry.

**Implemented so far** (`src/types/entity-roles.ts`): every role in the table above except `mode_control`, `heat_recovery_efficiency`, `bypass_control`, `filter_alarm`, `fault_code`, `fault_description`, `co2_level`, and `commissioning_diagnostics`. The airflow preset and maximum roles are generic and only appear when mapped/supported; no manufacturer default assumes a fixed installed capacity. `stop_control` is implemented generically but declared supported for Altair now that the backend exposes the stop coil. `mode_control` and `bypass_control` are Phase 3B/3C respectively (`ROADMAP.md`).

## 3. Capability matrix (launch set)

| Capability | Altair 160 | Zehnder ComfoAir Q | Aerofresh | Generic |
|---|---|---|---|---|
| Summer bypass | **Not supported** (confirmed, hard-locked — see `docs/architecture.md` §5) | Supported (assumed) | Supported (assumed) | Off by default, feature-flaggable |
| Manual bypass override | N/A | TBD | TBD | feature-flaggable |
| Frost protection | Role implemented, assumed supported (TBD method) | Role implemented, assumed supported (TBD method) | Role implemented, assumed supported (TBD method) | Off by default |
| Filter monitoring | Role implemented, assumed supported, unit TBD | Role implemented, assumed supported, unit TBD | Role implemented, assumed supported, unit TBD | Off by default |
| Filter reset (manual) | TBD (resettable?) — not declared supported | TBD (resettable?) — not declared supported | TBD (resettable?) — not declared supported | Role implemented (Phase 3A), feature-flaggable |
| Stop/start control | Role implemented and declared supported via backend Coil 00004 (`stop_control`) | TBD — not declared supported | TBD — not declared supported | Role implemented, feature-flaggable |
| Airflow preset numbers | Role implemented and declared supported (`away_airflow`, `low_airflow`, `home_airflow`, `high_airflow`) | TBD — not declared supported | TBD — not declared supported | Role implemented, feature-flaggable |
| Airflow calibration controls | Role implemented and declared supported (`calibration_available`, start/cancel/status/progress/result/last) | TBD — not declared supported | TBD — not declared supported | Role implemented, feature-flaggable |
| Fault indication | Role implemented, assumed supported | Role implemented, assumed supported | Role implemented, assumed supported | Off by default |
| Boost timer | Not implemented | Not implemented | Not implemented | Not implemented |
| Humidity sensor | Not implemented | Not implemented | Not implemented | Not implemented |
| CO₂ sensor | Not implemented | Not implemented | Not implemented | Not implemented |
| Commissioning diagnostics | Not implemented (ROADMAP.md Phase 4) | Not implemented | Not implemented | Not implemented |

"Role implemented" means the entity role exists in `src/types/entity-roles.ts` and the profile declares it supported (Phase 2 for read-only roles, Phase 3A onward for action roles); it does not mean the real-world facts behind it (exact method, unit, register, resettability) have been verified — those are still TBD per the notes above until confirmed against real hardware documentation.

The only capability confirmed against real product knowledge at time of writing is Altair's lack of bypass. Everything else marked "assumed" should be corrected in the relevant `docs/manufacturers/*.md` file as soon as it's verified, and the capability profile updated to match — this table and the profile source file must never disagree.

## 4. Card configuration schema

```yaml
type: custom:hiper-mvhr-card
manufacturer: <profile id>          # required
name: <string>                      # optional card title override; defaults to "HiPer MVHR Card"
display_mode: homeowner | detailed | system  # default: homeowner
max_airflow: <positive number>       # optional, system-mode gauge maximum in m³/h
entities:                           # required, only supported roles are meaningful
  <role id>: <entity id>
feature_flags:                      # optional, overrides profile defaults
  <flag id>: true | false
```

`display_mode` was named `view` in Phase 1 and accepted `homeowner | installer | commissioning`. Phase 2 renamed it to match the project's terminology and narrowed it to implemented modes; system mode is now the homeowner-friendly visual dashboard. `commissioning` will be added back once it exists (`ROADMAP.md` Phase 4), which is an additive, non-breaking change when it happens. The `title` field mentioned in earlier drafts of this document never matched the implementation; `name` is correct and has been since Phase 1.

Validation rules:

- `manufacturer` must match a registered profile ID; unknown values fail config validation with a clear error (this is a config-time error, not a runtime "unavailable" state).
- `max_airflow`, when provided, must be a positive number. In system mode it is the first-priority maximum for the Airflow gauge; if omitted, the card falls back to a `maximum_airflow` entity, then `high_airflow`, then any manufacturer-profile default, and only finally to the legacy mapped-level gauge behaviour.
- `calibration` and `start_calibration` are accepted as config aliases for the canonical `calibration_start_control` role; `cancel_calibration` maps to `calibration_cancel_control`; `stop_unit` and `off_control` map to `stop_control`.
- Keys under `entities` that aren't roles supported by the active profile are ignored with a non-fatal warning (surfaced in the editor, not thrown at runtime).
- Roles supported by the profile but absent from `entities` are valid — they render as "not configured" (see §6).

## 5. Display modes

| Mode | Audience | Content |
|---|---|---|
| `homeowner` | non-technical residents | mode, configured temps/airflow/status, plain language, unconfigured optional roles omitted entirely, no raw entity IDs |
| `detailed` | installers/technicians | everything in homeowner + "not configured" roles shown, missing-entity configuration warnings (with the entity id), still no raw Modbus/integration-specific detail |
| `system` | residents/home dashboards | full-width visual dashboard with cutaway unit, compact operating controls, lower summary cards, shower banner below those cards, and advanced controls behind disclosure |
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

**Action roles** (Phase 3A: `filter_reset_control`; Phase 3B/3C: `mode_control`, `bypass_control`) go through the same five states 1–4 identically — an unconfigured or missing control degrades exactly like a sensor. Only state 5 differs: instead of rendering the entity's raw value (meaningless for a `button` entity — its state is a last-pressed timestamp), the card renders an interactive control. See `docs/architecture.md` §8 step 6 and `src/data/control-dispatcher.ts`.

## 7. Non-functional requirements

- **Theming**: must respect Home Assistant's light/dark theme CSS variables; no hardcoded colors outside status semantics (ok/warning/error).
- **Responsiveness**: usable from a phone-width dashboard panel up to a desktop panel.
- **Performance**: re-render only on changes to entities the active config actually maps; no polling.
- **Accessibility**: sensible heading hierarchy (card title, then one heading per section); status text must never rely on color alone (an icon or word always accompanies a tone); the availability indicator uses `role="status"`; interactive controls must be keyboard operable and labeled. `filter_reset_control` (Phase 3A) is the first: a native `<button>`, labeled via `aria-label`, natively keyboard-operable. Mode selector and bypass toggle are Phase 3B/3C, see `ROADMAP.md`.
- **Resilience**: see §6 — degrade, never fail.
- **No manufacturer conditionals in `src/components/**`** — enforced by code review, not tooling, for now; may become an ESLint rule later if violations recur.
