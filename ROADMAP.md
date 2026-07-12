# Roadmap

## Phase 0 — Foundation (this session)

- [x] Repository structure reviewed and finalized (`docs/architecture.md` §2)
- [x] Architecture documented: entity role model, capability model, data flow, testing/release strategy
- [x] Specification documented: config schema, entity role table, capability matrix, view definitions
- [x] Contributor-facing docs: README, CONTRIBUTING, CLAUDE.md, CHANGELOG
- [x] Tooling scaffolded: TypeScript, ESLint, Prettier, Vitest, GitHub Actions, HACS metadata
- [ ] Open questions in `docs/architecture.md` §13 resolved (bundler choice, license, manufacturer model consolidation, license)

No card source code is written in this phase, deliberately.

## Phase 1 — Core data layer

- Entity role registry (`src/types/entity-roles.ts`)
- `CapabilityProfile` / `MvhrSnapshot` / `CardConfig` types
- Config schema validation (`src/data/config-schema.ts`)
- Capability resolver + entity resolver, with full test coverage of the degradation matrix (`SPECIFICATION.md` §6)
- Manufacturer profiles: `altair`, `zehnder-comfoair-q`, `aerfresh`, `generic` — capability facts confirmed against real documentation before implementation, not assumed
- Test fixtures for each profile, including deliberately incomplete variants

## Phase 2 — Homeowner view

- Shared UI atoms (status badge, gauge, mode selector, filter indicator, bypass indicator, fault banner)
- Homeowner view implemented against the resolvers from Phase 1
- Manual verification against all four launch profiles, including Altair (bypass must not appear)

## Phase 3 — Installer view

- Airflow, full temperature set, bypass control, fault codes
- Manual entity actions (mode change, bypass override, filter reset) with optimistic UI + reconciliation

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
