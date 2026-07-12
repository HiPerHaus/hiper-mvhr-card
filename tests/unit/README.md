# tests/unit

Vitest unit tests for `src/data` (capability resolution, entity resolution, config schema) and `src/manufacturers` (profile/role registry integrity). No DOM, no live Home Assistant instance. See `docs/architecture.md` §11.

Phase 1 tests: `config-schema.test.ts`, `capability-resolver.test.ts`, `entity-resolver.test.ts`, `card-rendering.test.ts` (this last one needs `happy-dom`, configured as the vitest environment in `vite.config.ts`).
