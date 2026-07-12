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

## Phase 2 — Card layout (homeowner + detailed) — in progress (`feature/phase-2-card-layout`)

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
- [ ] Awaiting review before merge to `main`

## Phase 3 — Interactive controls

Phase 2 covers display only (homeowner + detailed layouts, both read-only). What's left before the card can act on the system, not just show it:

- Manual entity actions: mode change, bypass override, filter reset — with optimistic UI + reconciliation on the next `hass` update
- Keyboard-operable, labeled controls (`SPECIFICATION.md` §7)

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
