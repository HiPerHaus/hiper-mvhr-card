# Roadmap

## Phase 0 — Foundation ✅ complete (on `main`)

- [x] Repository structure reviewed and finalized (`docs/architecture.md` §2)
- [x] Architecture documented: entity role model, capability model, data flow, testing/release strategy
- [x] Specification documented: config schema, entity role table, capability matrix, view definitions
- [x] Contributor-facing docs: README, CONTRIBUTING, CLAUDE.md, CHANGELOG
- [x] Tooling scaffolded: TypeScript, ESLint, Prettier, Vitest, GitHub Actions, HACS metadata
- [x] Open questions in `docs/architecture.md` §13 resolved for launch: Vite as bundler, MIT license, manufacturer-family consolidation kept

## Phase 1 — Core data layer ✅ complete (on `main`)

- [x] Entity role registry (`src/types/entity-roles.ts`) — Phase 1 subset
- [x] `CapabilityProfile` / `MvhrSnapshot` / `CardConfig` types
- [x] Config schema validation (`src/data/config-schema.ts`)
- [x] Capability resolver + entity resolver, with full test coverage of the degradation matrix (`SPECIFICATION.md` §6)
- [x] Manufacturer profiles: `altair`, `zehnder-comfoair-q`, `aerfresh`, `generic`
- [x] Test fixtures for each profile, including deliberately incomplete variants
- [x] Minimal working custom-element registration + smallest complete vertical slice

## Phase 2 — Card layout (homeowner + detailed) ✅ complete (on `main`)

- [x] Header: card name, manufacturer/model, operating mode, overall availability indicator
- [x] Temperature section as a responsive grid (outdoor/supply/extract/exhaust), each with icon + label + value + unit
- [x] Airflow section (supply/extract), shown only when configured and supported
- [x] System status section: summer bypass, filter, fault, frost protection — three new roles added (`filter_remaining`, `fault_active`, `frost_protection_active`)
- [x] Five-state rendering: unsupported / not configured / entity missing / unavailable / value — `entity_missing` split out from `unavailable` this phase
- [x] `display_mode: homeowner | detailed` (renamed from Phase 1's `view`)
- [x] Aerofresh rebranded: profile id `vent_axia_sentinel_econiq` (was `aerfresh`), display name always "Aerofresh"
- [x] HA native theming via CSS custom properties only, no hardcoded palette
- [x] Responsive down to narrow mobile widths, no fixed height
- [x] Accessibility: heading hierarchy, `role="status"` on the availability chip, tone always paired with text/icon, aria-labeled sections
- [x] Reviewed and merged to `main` (PR #1)

## Phase 3 — Interactive controls

Phase 2 covers display only (homeowner + detailed layouts, both read-only). What's left before the card can act on the system, not just show it. Split into three sub-phases rather than one large change, since the three controls named below are not equal in complexity or in how confirmed their manufacturer support is — see `docs/architecture.md` §8 step 6 for the general mechanism (optimistic UI + reconciliation on the next `hass` update) and `SPECIFICATION.md` §7 for the accessibility requirement (keyboard-operable, labeled controls).

### Phase 3A — Control framework + filter reset ✅ complete (on `feature/phase-3`)

The simplest control: a fire-and-forget action with no state to reconcile (pressing a HA `button`/`input_button` entity has no target value to wait for).

- [x] `filter_reset_control` entity role (`src/types/entity-roles.ts`)
- [x] `src/data/control-dispatcher.ts` — generic action dispatch (idle/pending/error state, timeout guard), reusable by Phase 3B/3C rather than rebuilt
- [x] Rendered as a native, labeled, keyboard-operable `<button>` in the system status section; degrades through the same five states as every other role
- [x] `hass.callService` stays optional — the card no-ops safely if it's unavailable (dev preview, tests), rather than requiring it
- [x] Enabled only for the `generic` profile (feature-flaggable) — Altair/Zehnder/Aerofresh do NOT declare it supported by default: filter resettability is still TBD for all three (`docs/manufacturers/*.md`, `SPECIFICATION.md` §3)
- [x] Tests written before implementation: dispatch/service-call correctness, pending state, error state, timeout, double-dispatch guard, all five rendering states, Altair-no-bypass regression unaffected

### Phase 3B — Mode selector

More involved: options, current mode, a service call, and — unlike filter reset — a real optimistic UI with rollback/reconciliation against the next resolved snapshot value.

- `mode_control` entity role
- Extend `control-dispatcher.ts` with a value-reconciliation mode (target value set optimistically, cleared once the snapshot reflects it or a timeout reverts it) rather than a second, parallel mechanism

### Phase 3C — Bypass override

Left until last: manual bypass override is unconfirmed for Zehnder ComfoAir Q and Aerofresh, and explicitly unsupported for Altair (hard-locked, `unsupportedRoles`). Enable per-manufacturer only once each profile's manual-override support is verified against real documentation (`CLAUDE.md`'s "don't guess" rule) — do not enable it broadly just because the mechanism exists.

- `bypass_control` entity role
- Manufacturer-specific enablement once verified, never assumed

## Phase 4 — Commissioning view

- Raw entity/register inspector
- Full diagnostics surface

## Phase 5 — Visual config editor

- `src/editor/` — Lovelace GUI config editor (manufacturer picker, entity mapping, view selector, feature flags)

## Phase 6 — Additional manufacturers & community contributions

- Community-contributed profiles following the checklist in `CLAUDE.md`
- Resolve remaining TBD entries in `SPECIFICATION.md` §3 as real hardware data comes in

## Phase 7 — v1.0 release

- HACS default-repository submission
- Documentation pass (screenshots, `docs/images/`)
- Semantic versioning from here on; see `docs/architecture.md` §12 for release mechanics
