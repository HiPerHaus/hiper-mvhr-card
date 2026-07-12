# tests/fixtures

Mock `hass` objects, one per manufacturer profile plus deliberately incomplete variants (missing or unavailable entities). Reused across unit and component tests so scenarios aren't redefined per test file. See `docs/architecture.md` §11 and `CLAUDE.md`'s "Adding a manufacturer" checklist.

Phase 1 fixtures: `hass-altair-160.ts`, `hass-zehnder-comfoair-q.ts`, `hass-aerfresh.ts` (includes one unavailable entity), `hass-generic.ts`.
