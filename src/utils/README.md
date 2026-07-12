# src/utils

Generic, stateless helpers only (formatting, math, unit conversion) — no domain logic. Domain logic (entity/capability resolution) belongs in `src/data` instead. See `docs/architecture.md` §2.

Phase 1 implemented: `format.ts` (renders a `RoleValue` to display text).
