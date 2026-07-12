# src/components

LitElement views and shared presentational atoms. See `docs/architecture.md` §9.

**No manufacturer-specific logic belongs here** — see `CLAUDE.md`. Components ask the active `CapabilityProfile` whether a role is supported; they never check which manufacturer they're looking at.

Phase 1 implements a single component, `hiper-mvhr-card.ts` — the whole card as one "smallest complete vertical slice" (title, status, temps, airflow, bypass-if-supported), rendered the same way regardless of `view` config value. The `views/*` and `atoms/*` split described in `docs/architecture.md` §9 (separate homeowner/installer/commissioning layouts and shared atoms) starts in ROADMAP.md Phases 2–4, once there's enough content to justify splitting it.
