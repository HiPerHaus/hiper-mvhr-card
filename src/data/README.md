# src/data

Domain logic: capability resolution, entity resolution, card config schema/validation. This is deliberately separate from `src/utils` (generic, stateless helpers) and `src/types` (interfaces only) — see `docs/architecture.md` §2.

Phase 1 implemented: `config-schema.ts` (validation + defaults), `capability-resolver.ts` (profile + feature-flag merge, with hard-locked roles like Altair's bypass), `entity-resolver.ts` (five-state snapshot resolution as of Phase 2 — see `src/types/snapshot.ts`).

Phase 2 added: `availability-summary.ts` (derives the header's overall connection/availability indicator from a snapshot — a UI-level computation, not a new entity role).
