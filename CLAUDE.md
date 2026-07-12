# Working in this repository

This file is the short, operational version of `docs/architecture.md` and `SPECIFICATION.md` — read those two for reasoning and contracts; read this one for "what do I do right now."

## The one rule that matters most

**Never put manufacturer-specific logic in `src/components/**` or `src/editor/**`.** No `if (manufacturer === '...')`, no reading a manufacturer ID to decide what to render. Components ask the active `CapabilityProfile` whether a role is supported (`profile.supportedRoles.bypass_state`); they never ask which manufacturer they're looking at. If a change seems to require a manufacturer check inside a component, the change belongs in a capability profile instead (`src/manufacturers/*.ts`) or, if the concept doesn't exist yet, in the entity role registry (`src/types/entity-roles.ts`).

## Where things live

| I need to... | Go to |
|---|---|
| Add/change what a manufacturer supports | `src/manufacturers/<family>.ts` |
| Add a brand-new sensor/control concept | `src/types/entity-roles.ts`, then reference it from profiles |
| Change how config maps to entities | `src/data/config-schema.ts`, `src/data/entity-resolver.ts` |
| Change what a view shows | `src/components/views/<audience>.ts` |
| Add a UI primitive (badge, gauge, etc.) | `src/components/atoms/` |
| Touch the Lovelace config editor | `src/editor/` |
| Add a test fixture for a manufacturer/scenario | `tests/fixtures/` |

## Adding a manufacturer (checklist)

1. Confirm real capability facts before writing anything — bypass support, frost protection method, filter unit, operating modes. If you don't have a verified source, mark fields `TBD` rather than guessing (see `SPECIFICATION.md` §3 for the current TBD list).
2. Add `src/manufacturers/<family>.ts` implementing `CapabilityProfile`. Prefer one profile per control platform, not one per SKU, unless models genuinely differ in capability — see `docs/architecture.md` §13 for the reasoning and the open question this creates.
3. Add a fixture in `tests/fixtures/` (a mock `hass` object) and at least one deliberately incomplete variant (a missing or unavailable entity).
4. Add `docs/manufacturers/<family>.md` with the facts backing the profile (register maps, known entity-naming patterns for the integrations people commonly use).
5. Add an example under `examples/<family>/`.
6. Update the capability matrix in `SPECIFICATION.md` §3 — the table and the profile source must never disagree.

## Every role must survive being unmapped or unavailable

Any UI code touching a role must handle all three non-value states from `SPECIFICATION.md` §6 (unsupported / not configured / unavailable) — this is enforced by review, not by the type system, so check it explicitly before approving a PR that renders a new role.

## Before opening a PR

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass.
- No new manufacturer conditional anywhere under `src/components/` or `src/editor/`.
- `CHANGELOG.md` updated under `Unreleased`.
- If a capability assumption from `SPECIFICATION.md` §3 was resolved or changed, both the table and the profile file were updated together.

## Current phase

The project is in the foundation phase (see `ROADMAP.md`, Phase 0/1) — architecture and specification exist, but no `src/` implementation has been written yet. Do not add card implementation code without checking `ROADMAP.md` first; there is a deliberate decision not to write UI code until the entity/capability model in `docs/architecture.md` has been reviewed and confirmed.
