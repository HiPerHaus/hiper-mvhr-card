# Architecture

This document is the technical backbone of HiPer MVHR Card. `SPECIFICATION.md` defines *what* the card does (schemas, contracts, acceptance criteria); this document explains *why* it is built this way and how the pieces fit together. `CLAUDE.md` is the short operational guide for anyone (human or AI) making changes day to day. If those three ever disagree, this document wins for architectural intent, `SPECIFICATION.md` wins for exact contracts.

## 1. Philosophy

Three ideas drive every decision below:

**The UI never knows about manufacturers.** No component may contain an `if (manufacturer === 'altair')` branch, or equivalent. Manufacturer differences are data, not code — declared once in a capability profile and consumed generically everywhere else. When a new MVHR unit is added, the change should be "add one capability profile," never "touch the rendering code."

**Missing data is a normal state, not an error.** Sensors get renamed, integrations get reconfigured, users don't wire up every entity. Every piece of UI must have a defined appearance for "not configured" and "unavailable" in addition to "has a value." A blank dashboard on a misconfigured install is a bug; a card that throws or shows `undefined` is a worse one.

**Optimize for the tenth manufacturer, not the first.** Altair, Zehnder, and Aerofresh are the launch set, but the entire point of the project is that the eleventh contributor can add their own MVHR unit by writing one small, declarative file and a test fixture — without reading the rendering code at all.

## 2. Repository structure

```
docs/
  architecture.md        this file
  design/                UX notes, wireframes, layout references
  images/                screenshots for README/HACS listing
  manufacturers/         one doc per capability-profile family (register maps,
                          entity-naming quirks, known integration paths)
examples/
  altair-160/             example Lovelace YAML + notes
  zehnder-q/              covers Q350 / Q450 / Q600 (shared control platform)
  aerofresh/              covers 300 / 450 (shared Vent-Axia control platform)
  generic/                 NEW — DIY / ESPHome / template-sensor example
src/
  types/                  CapabilityProfile, EntityRole, MvhrSnapshot, CardConfig
  manufacturers/          capability profile factories (one file per family) + registry
  data/                   NEW — entity resolution, capability resolution, config
                          schema/validation. Domain logic, not generic helpers.
  components/             LitElement views and shared presentational atoms
  editor/                 NEW — Lovelace visual config editor (separate lifecycle
                          from the display card, kept out of components/)
  styles/                 shared CSS custom properties, theme tokens
  icons/                  custom SVG icons not covered by MDI
  utils/                  generic helpers only (formatting, math) — no domain logic
tests/
  unit/                   NEW subfolder
  fixtures/               NEW — mock `hass` objects per manufacturer/scenario
```

Changes from the initial scaffold, and why:

- **`docs/manufacturers/`** and **`examples/generic/`** are new. Every manufacturer family listed in the spec needs both a technical doc and a worked example; `generic` was the one family missing an example.
- **`src/data/`** is new. Entity resolution and capability resolution are core domain logic — they decide what the card believes about the world. Bundling that into `src/utils/` (intended for generic, stateless helpers like `formatTemperature()`) would blur the one boundary this project most depends on: domain logic stays out of both the UI layer and the "just helpers" layer.
- **`src/editor/`** is new. The Lovelace config editor implements a different custom-element contract (`setConfig`/`configChanged` on a `hui-*-card-editor` shape) than the display card, and is only loaded when a user is editing their dashboard. Keeping it physically separate makes it obvious it isn't part of the render-critical path and easy to code-split later if bundle size becomes a concern.
- **`tests/fixtures/`** is new. Every manufacturer profile and every "missing sensor" scenario needs a reusable, realistic mock `hass` state object. Fixtures are the thing a new contributor copies when adding a manufacturer, so they need a first-class home rather than being inlined in test files.
- **Manufacturer files are consolidated by control platform, not by SKU.** Zehnder Q350/Q450/Q600 and Aerofresh 300/450 are treated as one capability profile each (`zehnder-comfoair-q.ts`, `vent-axia-sentinel-econiq.ts`), with the specific model handled as metadata/capacity, not a duplicated file. This is an assumption, not a confirmed fact — see §15.

## 3. The core simplification: Home Assistant already abstracts the transport

The brief asks for the card to work "regardless of whether data comes from native integrations, Modbus, MQTT, ESPHome, template sensors, or future custom integrations." It's tempting to read that as "build an adapter layer per protocol." That would be over-engineering: by the time any of those integrations reach the card, Home Assistant has already turned them into entities with a `state` and `attributes`. A `sensor.mvhr_supply_temp` looks identical to the card whether it's backed by Modbus, MQTT, or ESPHome.

The actual abstraction boundary the card needs is **entity-role mapping**, not protocol adapters: the card config maps vendor-neutral roles (`supply_air_temp`, `bypass_state`, ...) to whatever entity IDs the user's setup happens to produce. This is one schema, defined once, and it is the entirety of the "works with any data source" requirement. No per-protocol code is needed anywhere in this project.

## 4. The entity role model

An **entity role** is a canonical, vendor-neutral concept (e.g. `supply_air_temp`, `bypass_state`, `filter_remaining`). Roles are declared in a single open-ended registry (`src/types/entity-roles.ts`) with metadata:

| Field | Purpose |
|---|---|
| `id` | stable key, e.g. `bypass_state` |
| `category` | `core` \| `diagnostic` \| `commissioning` — default visibility grouping |
| `valueType` | `numeric` \| `enum` \| `binary` \| `text` |
| `unit` | display unit hint, if numeric |
| `defaultViews` | which audience views show this role by default |

Roles are additive: adding CO₂ or a new alarm type is "add a role," never a change to `CapabilityProfile` or `MvhrSnapshot`'s shape, because both are keyed by role ID (`Partial<Record<EntityRole, ...>>`), not by a fixed set of named fields. This is what makes the model survive "many years of new manufacturers" without breaking changes — a fixed interface with one field per sensor (`supplyAirTemp`, `extractAirTemp`, ...) would require a type change for every new sensor any manufacturer ever exposes.

## 5. The manufacturer capability model

A **capability profile** declares, for one manufacturer/control-platform family, which roles are supported and how:

```ts
interface CapabilityProfile {
  id: string;                 // 'altair', 'zehnder-comfoair-q', 'vent_axia_sentinel_econiq' (Aerofresh brand, see docs/manufacturers/aerofresh.md), 'generic'
  name: string;
  vendor: string;
  models?: string[];          // e.g. ['Q350', 'Q450', 'Q600'] — capacity metadata only
  supportedRoles: Partial<Record<EntityRole, RoleSupport>>;
  operatingModes: OperatingMode[];
  featureFlags?: Record<string, boolean>; // escape hatch, see §7
}

interface RoleSupport {
  required?: boolean;   // profile expects this role to normally be configured
  notes?: string;        // e.g. "Altair 160 has no summer bypass"
}
```

Concretely: the Altair profile simply omits `bypass_state`/`bypass_control` from `supportedRoles`. No component ever asks "is this an Altair?" — it asks "does the active profile support `bypass_state`?", which is exactly the same question it asks for every other manufacturer. This is also how the requirement "Altair 160 has no summer bypass, never show a bypass control for it" gets enforced structurally rather than by a conditional that someone could accidentally bypass (no pun intended) in a future PR.

## 6. Card configuration & entity mapping

The user's Lovelace card config selects a manufacturer profile and maps roles to entity IDs:

```yaml
type: custom:hiper-mvhr-card
manufacturer: zehnder-comfoair-q
display_mode: detailed
entities:
  supply_air_temp: sensor.mvhr_supply_temp
  extract_air_temp: sensor.mvhr_extract_temp
  bypass_state: binary_sensor.mvhr_bypass
  mode: select.mvhr_mode
  filter_remaining: sensor.mvhr_filter_days
```

Only roles the active profile supports are meaningful in `entities:`; unknown roles are ignored with a validation warning. Any profile-supported role that isn't mapped renders its "not configured" state rather than being treated as an error.

## 7. Feature flags

Capability profiles cover the common case; real installations vary. `featureFlags` is a per-profile, per-config override so a user (or a future profile author) can enable/disable an individual role without forking the whole profile — e.g. a Generic-profile user manually turning on `co2_level` because they wired up an extra sensor. Config-level flags always take precedence over profile defaults; profile defaults always take precedence over role registry defaults.

## 8. Data flow

1. Home Assistant calls `set hass(hass)` on the custom element on every state change.
2. The card diffs only the entity IDs it has mapped in config; unrelated `hass` churn does not trigger a re-render (performance).
3. **Capability resolution**: `manufacturer` + `featureFlags` from config produce an effective `CapabilityProfile` for this render.
4. **Entity resolution**: for each role the effective profile supports, look up the mapped entity ID (if any) in `hass.states` and produce an `MvhrSnapshot` — a plain object keyed by role, where each entry is one of `{ status: 'ok', value, raw }`, `{ status: 'unavailable' }`, or `{ status: 'not-configured' }`.
5. The active **view** (homeowner / installer / commissioning) selects which roles to render and in what layout, filtered by the effective profile's `supportedRoles` and each role's snapshot status.
6. User actions (change mode, toggle bypass) call `hass.callService`; the UI shows an optimistic pending state and reconciles on the next `hass` update rather than assuming the call succeeded.

## 9. Component hierarchy

```
hiper-mvhr-card                 (root custom element, src/components/hiper-mvhr-card.ts)
├─ config parsing/validation     (src/data/config-schema.ts)
├─ capability resolution         (src/data/capability-resolver.ts)
├─ entity resolution             (src/data/entity-resolver.ts)
├─ availability summary          (src/data/availability-summary.ts)
└─ presentation policy + render  (private methods on the same component)
     ├─ header (name, manufacturer/model, mode, availability)
     ├─ temperature grid section
     ├─ airflow section
     └─ system status section
hiper-mvhr-card-editor           (src/editor — separate custom element, Lovelace config UI, not built yet)
```

**Revised in Phase 2** from the original plan below: this shipped as one component with a presentation-policy function (`_present(value, detailed)`) driven by `display_mode`, not three separate view components. Reasoning: `homeowner` and `detailed` turned out to differ only in *which* roles show and *how much detail* accompanies them (not-configured rows, missing-entity warnings) — not in fundamentally different layouts. A single component with a policy function is less code to keep in sync and the difference is easy to see in one place. This may need revisiting again once `commissioning` is designed (Phase 4) if it turns out to need a genuinely different layout rather than "more detail still" — see the open question this replaces in §13.

Original Phase 0/1 plan, kept for context: separate `homeowner`/`installer`/`commissioning` view components under `src/components/views/*` sharing atoms under `src/components/atoms/*`, on the theory that each audience wants a different layout (e.g. a gauge-based summary vs. a dense diagnostic table), not just a different row count. That may still turn out to be true for commissioning specifically; it wasn't true for homeowner vs. detailed.

## 10. Graceful degradation rules

For every role a view considers showing:

1. Not in `supportedRoles` for the active profile → don't render it at all (not even "not configured"), in any display mode.
2. In `supportedRoles` but not mapped in config → `homeowner` omits it entirely; `detailed` renders a muted "not configured" affordance.
3. Mapped to an entity id Home Assistant has no record of (**added in Phase 2**, previously conflated with state 4) → `homeowner` shows a quiet "Unavailable"; `detailed` shows an explicit warning naming the missing entity id — a config mistake is more actionable than a runtime hiccup, so it's surfaced more prominently where the audience can act on it.
4. Mapped to a real entity whose state is `unavailable`/`unknown` → render "Unavailable" in both modes, never a stale or blank value.
5. Mapped and available → render the value, including a legitimate numeric zero (only the literal states `unavailable`/`unknown` count as unavailable).

No component should be able to throw because a sensor is missing or misconfigured; this is enforced by making both "missing" and "misconfigured" snapshot statuses rather than `undefined`.

## 11. Testing strategy

- **Unit tests** (Vitest) for the parts with real logic and no DOM: config schema validation, capability resolution, entity resolution (especially the degradation matrix in §10), and role-registry integrity (e.g. every role referenced by a profile actually exists in the registry).
- **Fixtures**: one realistic mock `hass` object per manufacturer plus deliberately incomplete variants (missing bypass entity, unavailable filter sensor, etc.) in `tests/fixtures/`, reused across unit and component tests so scenarios aren't redefined per test file.
- **Component tests**: Lit component rendering against fixtures, verifying the degradation behavior (five states as of Phase 2 — see §10) actually shows up in markup, not just in resolver output.
- No test depends on a live Home Assistant instance.

## 12. Release strategy

- Semantic versioning; `CHANGELOG.md` in Keep a Changelog format.
- `build.yml`: lint + typecheck + test + build on every push/PR.
- `release.yml`: on tag push, build and attach the bundled `dist/` artifact to a GitHub Release; HACS distributes directly from GitHub releases, so no separate publish step is needed.
- `main` is the only long-lived branch; releases are cut from tags on `main`.

## 13. Open questions / assumptions to confirm

These are decisions made to keep the foundation moving, not settled facts:

- **Zehnder Q350/Q450/Q600 sharing one profile, Aerofresh 300/450 sharing one profile.** Assumed because they share a control platform per the brief. If any specific model actually exposes/lacks a capability the others don't (e.g. only Q600 has a CO₂ sensor option), that model needs to either become its own profile or the profile needs a per-model capability override — flag this the moment it's known.
- **Bundler choice.** `package.json` (below) picks Vite for the build, since it needs the least configuration for a single-file custom-element bundle. Rollup is the more common choice in older HA custom card examples; happy to switch before any code is written if there's a preference.
- **License.** `LICENSE` is scaffolded as MIT (typical for HACS community cards) pending confirmation.
- **View-per-audience vs. single role-driven renderer** (§9) — **resolved for homeowner/detailed in Phase 2**: one component with a presentation-policy function, not separate view components; the two modes differ in role visibility and detail level, not layout. **Still open for `commissioning`** (Phase 4): if raw entity/register inspection needs a genuinely different layout (e.g. a table rather than grid/list), it may warrant splitting out as its own component after all — decide once that phase's real screens exist, the same way this question got answered for Phase 2.
