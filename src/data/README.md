# src/data

Domain logic: capability resolution, entity resolution, card config schema/validation. This is deliberately separate from `src/utils` (generic, stateless helpers) and `src/types` (interfaces only) — see `docs/architecture.md` §2.

Phase 1 implemented: `config-schema.ts` (validation + defaults), `capability-resolver.ts` (profile + feature-flag merge, with hard-locked roles like Altair's bypass), `entity-resolver.ts` (three-state snapshot resolution).
