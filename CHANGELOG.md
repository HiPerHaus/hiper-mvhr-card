# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project will adopt [Semantic Versioning](https://semver.org/) starting at the first release.

## [Unreleased]

### Added

- **New `display_mode: system`** — a flagship, full-width visual panel aimed at homeowners: a large animated airflow visual (four ducts around a bigger central unit, heat-recovery badge inside it), a compact primary metrics row (airflow, target, recovery, humidity, filter, fans — deliberately no mapped level), simple Mode/Boost controls, and a "More controls" disclosure (collapsed by default) revealing override, mapped level, calibration internals, and individual fan RPM. Two new config options, `show_airflow_animation` and `show_advanced_controls` (both default `true`), are system-mode-only. `display_mode: homeowner` and `display_mode: detailed` are unchanged by this addition. See the README's "System mode" section.
- The airflow visual's duct animation is direction-aware in system mode (Exhaust/Supply flow away from the unit, Extract/Outdoor flow toward it) and only runs when the measured airflow is genuinely positive, the required temperature entities are available, `show_airflow_animation` is on, and `prefers-reduced-motion` isn't set; a slow fan-rotation animation follows the same gating.
- `src/data/availability-summary.ts` / `_dashboardStatus`'s "System OK / Communication issue / Fault detected / Calibrating… / Calibration required" status vocabulary (introduced for the detailed-dashboard rebuild) is now reused by system mode's header and status strip via a new shared `_statusStrip` method — refactored out of `_dashboard` with no change to detailed mode's rendered output.
- 30 new tests in `tests/unit/card-rendering.test.ts` and 3 in `tests/unit/config-schema.test.ts` covering `display_mode: system`: configuration acceptance, the hero visual and its four air paths, the primary-metrics/advanced-diagnostics split (mapped level only in the drawer), mode/boost/override service calls, status logic (communication issue, fault, calibration required, optional-missing-doesn't-warn), Altair's absent bypass row vs. Zehnder's present one, and responsive/reduced-motion CSS.

### Changed

- **Rebuilt the `display_mode: detailed` layout as a single unified MVHR dashboard.** Previously the legacy compact/diagnostic content (`Temperatures`/`Airflow`/`System status` sections, added in Phase 2) rendered unconditionally *above* the Phase-3 dashboard in every display mode — on a live card this looked like the old compact card with a small dashboard bolted on underneath. `display_mode: detailed` now renders the dashboard alone: a large airflow visual (four labelled air paths around a bigger MVHR unit illustration, with a heat-recovery badge inside it), a restyled controls panel (mode/boost/override, 44px+ touch targets, active-mode highlighting), a metrics tile grid, and a single status strip. `display_mode: homeowner` is unchanged — it still renders the original compact content.
- Header (both display modes): title, a status dot, and the current mode now read together on one line, with the subtitle below (`Altair MVHR ● Home` / `Heat Recovery Ventilation System`). The header's availability indicator now only reflects required-entity failures — an unmapped or unavailable optional entity (fault, frost protection, boost/override controls, calibration metadata) no longer triggers a "1 sensor unavailable"-style warning at the top level (`src/data/availability-summary.ts` gained an `ignoreRoles` option for this).
- Dashboard layout uses CSS grid with `fr`/`minmax()` throughout — no fixed pixel widths — at three breakpoints: desktop (~70/30 visual/controls split), tablet (≤900px, single column, metrics in a denser auto-fit grid), and mobile (≤599px, compact 2×2 air-path grid around the unit, metrics locked to 2 columns, no horizontal scroll).
- The bottom status strip now reports one of "System OK", "Communication issue" (a required, configured entity is unavailable/missing), "Fault detected", "Calibrating…", or "Calibration required", instead of duplicating the filter/calibration text that's already shown in the metrics tiles.

### Added

- `src/utils/format.ts`: `formatTimestampMaybe`, so a raw ISO-8601 timestamp (if a manufacturer's integration ever reports one) is shown locale-formatted rather than verbatim; non-ISO strings (e.g. the manufacturer-formatted timestamps already in use) pass through unchanged.
- 14 new tests in `tests/unit/card-rendering.test.ts` covering the dashboard rebuild: legacy sections absent in detailed mode, exactly one dashboard renders, optional missing entities don't warn, required-entity unavailability produces "Communication issue", calibration/filter each render once, the metrics grid's CSS has no fixed widths, the mobile/tablet breakpoints exist, the confirmed live Altair values (84% heat recovery, Home mode, 95 m³/h, etc.), default vs. `show_airflow_on_all_paths` airflow-path behavior, and cross-manufacturer regressions for Zehnder and Aerofresh.

- Project foundation: `docs/architecture.md`, `SPECIFICATION.md`, `README.md`, `ROADMAP.md`, `CONTRIBUTING.md`, `CLAUDE.md`.
- Repository structure finalized (`docs/architecture.md` §2), including `src/data/`, `src/editor/`, `tests/fixtures/`, `docs/manufacturers/`, and `examples/generic/`.
- Tooling scaffolded: TypeScript, ESLint, Prettier, Vitest, GitHub Actions (`build.yml`, `release.yml`), HACS metadata (`hacs.json`), `package.json`.
- Core data layer: entity role registry, `CapabilityProfile`/`MvhrSnapshot`/`CardConfig` types, config schema validation, capability resolver, entity resolver.
- Manufacturer capability profiles: Altair 160, Zehnder ComfoAir Q (Q350/Q450/Q600), Aerofresh (300/450), Generic — with test fixtures for each.
- Working `custom:hiper-mvhr-card` registration (guarded against duplicate registration on dev-server hot reload) and a minimal rendering vertical slice.
- Local dev preview (`npm run dev` → `dev/preview.html`) rendering the card against realistic mock Home Assistant states, no live HA instance required.
- **Phase 2 card layout** (merged to `main`): header (name, manufacturer/model, operating mode, overall availability indicator), a responsive temperature grid (outdoor/supply/extract/exhaust), an airflow section, and a system status section (summer bypass, filter, fault, frost protection).
- Three new entity roles: `filter_remaining`, `fault_active`, `frost_protection_active`.
- A fifth rendering state, `entity_missing`, distinguishing a misconfigured/renamed entity (a configuration problem) from a real sensor that's currently `unavailable`/`unknown` (a runtime state) — previously conflated in Phase 1.
- `display_mode: homeowner | detailed` — homeowner omits unconfigured optional roles and raw entity IDs; detailed shows "not configured" rows and explicit missing-entity warnings naming the entity id.
- Accessibility: heading hierarchy, `role="status"` on the availability indicator, tone always paired with an icon/word (never color alone), `aria-label`s on each section.
- Icon support via Home Assistant's own `<ha-icon>` (Material Design Icons), no icon package bundled.
- **Phase 3A — first interactive control** (`filter_reset_control`): a fire-and-forget "press" action, rendered as a native, labeled, keyboard-operable `<button>` in the system status section. Enabled today only via the `generic` profile's `feature_flags` — Altair/Zehnder/Aerofresh don't declare it supported by default, since filter resettability is still TBD for all three (`SPECIFICATION.md` §3).
- `src/data/control-dispatcher.ts`: a generic, reusable action-dispatch mechanism (idle/pending/error state, timeout guard) that calls the Home Assistant service convention for "press" actions (`button.press`/`input_button.press`, derived from the entity id's domain — not manufacturer-specific). No optimistic target-value reconciliation yet — that lands with Phase 3B's mode selector, which has a value to reconcile against; filter reset doesn't.
- `hass.callService` remains optional on the `HomeAssistant` type; the dispatcher and component no-op safely when it's absent (dev preview, minimal test fixtures) rather than requiring it.

### Changed

- **Breaking (pre-1.0):** the Aerofresh capability profile's id changed from `aerfresh` to `vent_axia_sentinel_econiq`, reflecting that it's the Vent-Axia Sentinel Econiq control platform sold under the Aerofresh brand — existing `manufacturer: aerfresh` configs need updating to `manufacturer: vent_axia_sentinel_econiq`. The user-facing brand name shown on the card is unchanged: always "Aerofresh."
- **Breaking (pre-1.0):** card config field `view` renamed to `display_mode`; accepted values narrowed from `homeowner | installer | commissioning` to `homeowner | detailed` (only the two implemented so far — `commissioning` will be added back once it's built, ROADMAP.md Phase 4).
- Corrected a spec/implementation mismatch: `SPECIFICATION.md` previously documented a `title` config field that was never implemented; the actual field has always been `name`. The spec now matches the code.

### Fixed

- `filter_reset_control` never reached its interactive "ok" state for a real, never-pressed `button`/`input_button` entity: `entity-resolver.ts` treated every `unknown` state as `unavailable`, but `unknown` is that domain's normal idle state before a first press, not a runtime problem. Fixed with a domain-aware exemption (a documented fact about the `button`/`input_button` HA platforms generically, not a manufacturer-specific check) — `unavailable` itself is still treated as unavailable for these entities.
- `feature_flags` values were coerced with `Boolean(enabled)`, so the truthy string `"false"` silently enabled a flag. `parseConfig` now requires a literal boolean and throws `ConfigValidationError` otherwise.
- Homeowner mode's header availability chip could still show the configuration-jargon fallback label "Not configured" when nothing had been mapped yet, contradicting homeowner mode's "no configuration jargon" rule. The chip is now omitted in that specific case in homeowner mode; detailed mode is unaffected.
- `vite.config.ts` rewritten to be valid native ESM (`import.meta.url` + `fileURLToPath` instead of a nonexistent CommonJS `__dirname`).
- A card-rendering test asserted on raw `shadowRoot.textContent` for the "nothing rendered yet" case, which broke under happy-dom's non-spec-compliant handling of Lit's internal empty-template marker node. Rewritten to check for the absence of an `ha-card` element and of any `Text` node content specifically.
- Upgraded `@typescript-eslint/*` to v8 (was v7, incompatible with TypeScript 5.9+), `vite` to ^6.2.0 and `vitest` to ^4.1.0 (both peer-matched), and `happy-dom` to ^20.0.0 (was ^14.0.0, vulnerable to a VM-context-escape RCE, GHSA-37j7-fg3j-429f — a test-only dependency, never shipped in the bundle). Added `@types/node`.
