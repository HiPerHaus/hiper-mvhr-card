# HiPer MVHR Card

A universal [Home Assistant](https://www.home-assistant.io/) Lovelace card for Mechanical Ventilation with Heat Recovery (MVHR) systems — one dashboard, any manufacturer, any integration path.

> **Status: pre-alpha.** Foundation, core data layer, homeowner/detailed/system layouts, native controls, and the first visual configuration editor are in place. Commissioning diagnostics are still evolving. See [Roadmap](ROADMAP.md).

## Why

MVHR dashboards today are either manufacturer-specific or a pile of generic entity rows with no domain knowledge of what an MVHR system actually is. HiPer MVHR Card is built the other way around: a single, vendor-neutral data model for "what an MVHR system can do," with manufacturer differences expressed as data (capability profiles), not code.

It doesn't matter whether your system exposes entities via a native Home Assistant integration, Modbus, MQTT, ESPHome, or hand-built template sensors — if you can map its entities to the card's roles, the card understands it.

## Supported systems

| Manufacturer | Models | Notes |
|---|---|---|
| Altair | 160 | no summer bypass — not shown for this model |
| Zehnder | ComfoAir Q350 / Q450 / Q600 | |
| Aerofresh | 300 / 450 | |
| Generic | any | manually configure supported features |

See [`SPECIFICATION.md`](SPECIFICATION.md) for the full capability matrix, and [`docs/manufacturers/`](docs/manufacturers/) for per-manufacturer detail.

## Display modes

The card shows the same data three ways today, chosen with `display_mode` in your config:

- **Homeowner** — clean and minimal; unconfigured optional roles are omitted entirely; no raw entity IDs.
- **Detailed** — a full installer dashboard: a large airflow visual and controls side by side, a metrics grid, and a status strip, plus "not configured" indicators and explicit warnings when a mapped entity doesn't exist in Home Assistant, so an installer can see exactly what's left to wire up.
- **System** — the flagship, polished dashboard for homeowners who want to *see* their ventilation system rather than read a list: a compact header with an at-a-glance mode select and boost pill, a large System Overview visual next to a shower-detection panel (when configured), three information cards (Airflow/Temperatures/System Status), and a "More controls" disclosure for everything else (override, mapped level, calibration internals, individual fan RPM) collapsed out of the way by default.

A **Commissioning** mode (raw entity/register inspection) is planned but not built yet.

### System mode

`display_mode: system` is aimed at someone who wants to glance at the card and immediately answer: is it working, where's the air coming from and going to, how much heat is being recovered, is boost on, is someone in the shower right now, does the filter need attention? It deliberately doesn't lead with diagnostics — override, calibration internals, and raw entity availability all live behind the "More controls" disclosure instead of competing for attention with the airflow visual.

Minimal configuration:

```yaml
type: custom:hiper-mvhr-card
manufacturer: altair
display_mode: system
title: Altair MVHR
entities:
  mode: select.altair_mvhr_mode
  airflow: sensor.altair_mvhr_airflow
  target_airflow: sensor.altair_mvhr_target_airflow
  supply_temperature: sensor.altair_mvhr_supply_air_temperature
  extract_temperature: sensor.altair_mvhr_extract_air_temperature
  outdoor_temperature: sensor.altair_mvhr_outdoor_air_temperature
  exhaust_temperature: sensor.altair_mvhr_exhaust_air_temperature
  indoor_humidity: sensor.altair_mvhr_indoor_humidity
  filter_days: sensor.altair_mvhr_filter_days_remaining
```

Full configuration, including the boost/override/calibration entities that populate the "More controls" disclosure, the optional shower-detection panel, and the two system-mode-only display options:

```yaml
type: custom:hiper-mvhr-card
manufacturer: altair
display_mode: system
title: Altair MVHR
subtitle: Heat Recovery Ventilation System

show_airflow_animation: true
show_advanced_controls: true

entities:
  mode: select.altair_mvhr_mode
  effective_mode: sensor.altair_mvhr_effective_mode
  airflow: sensor.altair_mvhr_airflow
  target_airflow: sensor.altair_mvhr_target_airflow
  mapped_level: sensor.altair_mvhr_mapped_airflow_level

  supply_temperature: sensor.altair_mvhr_supply_air_temperature
  extract_temperature: sensor.altair_mvhr_extract_air_temperature
  outdoor_temperature: sensor.altair_mvhr_outdoor_air_temperature
  exhaust_temperature: sensor.altair_mvhr_exhaust_air_temperature

  supply_fan_speed: sensor.altair_mvhr_supply_fan_speed
  extract_fan_speed: sensor.altair_mvhr_extract_fan_speed

  boost_active: binary_sensor.altair_mvhr_boost_active
  boost_remaining: sensor.altair_mvhr_boost_remaining
  boost_duration: number.altair_mvhr_boost_duration
  start_boost: button.altair_mvhr_start_boost
  cancel_boost: button.altair_mvhr_cancel_boost
  override_duration: select.altair_mvhr_override_duration
  clear_override: button.altair_mvhr_clear_override
  calibration_result: sensor.altair_mvhr_airflow_calibration_result
  calibration_status: sensor.altair_mvhr_airflow_calibration_status
  last_calibration: sensor.altair_mvhr_last_airflow_calibration

  indoor_humidity: sensor.altair_mvhr_indoor_humidity
  filter_days: sensor.altair_mvhr_filter_days_remaining

  # Optional — see "Shower detection" below. Omit any/all of these and the
  # card renders exactly as if the feature didn't exist.
  shower_detected: binary_sensor.altair_shower_detected
  shower_trigger_temperature: sensor.altair_shower_trigger_temperature
  shower_pipe_temperature: sensor.shower_pipe_temperature

show_airflow_on_all_paths: false
show_fan_speeds: true
show_filter: true
show_calibration: true
heat_recovery_method: automatic
```

**Compact header controls.** Mode and Boost are a small select and a status/toggle pill in the header, not full-width form fields — the fuller boost-duration input, Start/Cancel Boost buttons, and the override control still exist, just inside "More controls." There's no power/off button: no manufacturer profile in this card declares an "off" role today, so one isn't invented for the header.

**System Overview.** The visual shows four ducts around a larger central unit, each with a directional arrow icon as well as a label (never colour alone): Supply and Outdoor read as a cool blue family, Extract as a warm orange family, and Exhaust as a neutral grey family. Extract and Supply show both temperature and the shared measured airflow reading by default; Exhaust and Outdoor show temperature only, since most integrations — Altair included — report one measured airflow value for the whole system, not one per duct. Set `show_airflow_on_all_paths: true` to show that shared reading on all four. The duct/fan animation only runs when `show_airflow_animation` is true, the measured airflow is genuinely positive, and the required temperature entities are available, and it respects `prefers-reduced-motion`. The heat-recovery percentage badge sits in the panel's own heading.

**Shower detection.** Entirely optional, and driven by the same entity-role/availability model as everything else in the card — map none, some, or all three of `shower_detected` / `shower_trigger_temperature` / `shower_pipe_temperature` and the card adapts:

- **Not configured at all** — no shower panel renders; the System Overview panel expands to fill the row.
- **Configured, but no shower right now** — a small "No shower detected" card next to the overview (this also covers a momentarily unavailable detector — that's treated as inactive, not as an active shower).
- **Shower detected** (`shower_detected` is `on`) — a prominent purple panel with a lightweight inline-SVG shower illustration, "Boost active"/"Boost not active" (from the same `boost_active` role the header and status card use), the pipe temperature, the stored trigger temperature, and a **re-arm temperature** the card computes itself as trigger temperature − 10°C (never a separate entity) — matching the shower detector's own rearm rule in the [`ha-altair-mvhr`](https://github.com/HiPerHaus/ha-altair-mvhr) integration. Any one of the three sensors being unavailable simply omits that row; the panel never shows a placeholder or synthesized reading.

**Lower cards.** Airflow (a semicircular SVG/CSS gauge, no charting library, plus target airflow/fan speed/mapped level), Temperatures (the same four readings as the visual, plus heat recovery), and System Status (boost/override/boost-remaining/filter/overall status) — each row only renders when its role is actually configured or supported.

**Apparent heat-recovery limitation.** Same caveat as detailed mode below: it's `(supply − outdoor) / (extract − outdoor) × 100`, a dashboard-friendly estimate, not a certified efficiency figure, and it correctly reports "Not applicable" for temperature combinations that aren't physically consistent with straightforward recovery (for example a supply temperature above the extract temperature).

**Altair has no bypass**, so system mode never shows a bypass row for it — for Zehnder and Aerofresh, where the profile does support and map it, it appears inside "More controls," never in the main visual, lower cards, or header, and never via a manufacturer check in the rendering code (see [`CLAUDE.md`](CLAUDE.md)'s one rule).

**Responsive behaviour.** The card and its host always take the full width Lovelace gives them (no fixed or max card width), and it stays usable in both light and dark Home Assistant themes (every colour is a theme CSS variable or a `color-mix()` tint against it — nothing is a hard-coded dark surface). On desktop the System Overview and shower panel sit side by side and the three lower cards form one row; around ~900px both sections stack to a single column with the lower cards wrapping to two; below ~600px everything — including the header controls — is a single column, the shower illustration and airflow gauge shrink to fit, and every touch target stays at least 40-44px with no horizontal scrolling.

## What it looks like

The fastest way to see it is the local preview:

```bash
npm install
npm run dev
```

This opens `dev/preview.html`, which renders the card against realistic mock Home Assistant states, including Altair detailed/homeowner/system layouts, boost active, override active, calibration running/required, an unavailable required entity, a Zehnder system-mode scenario with bypass mapped, light/dark themes, and desktop/tablet/430px/375px widths.

## Installation

Not yet published. Once released, this will be installable via [HACS](https://hacs.xyz/) as a custom repository, or manually by copying `dist/hiper-mvhr-card.js` into `config/www/` and registering it as a Lovelace resource.

## Configuration

```yaml
type: custom:hiper-mvhr-card
title: Altair MVHR
subtitle: Heat Recovery Ventilation System
manufacturer: altair
display_mode: detailed
entities:
  mode: select.altair_mvhr_mode
  effective_mode: sensor.altair_mvhr_effective_mode
  airflow: sensor.altair_mvhr_airflow
  target_airflow: sensor.altair_mvhr_target_airflow
  mapped_level: sensor.altair_mvhr_mapped_airflow_level
  supply_temperature: sensor.altair_mvhr_supply_air_temperature
  extract_temperature: sensor.altair_mvhr_extract_air_temperature
  outdoor_temperature: sensor.altair_mvhr_outdoor_air_temperature
  exhaust_temperature: sensor.altair_mvhr_exhaust_air_temperature
  supply_fan_speed: sensor.altair_mvhr_supply_fan_speed
  extract_fan_speed: sensor.altair_mvhr_extract_fan_speed
  indoor_humidity: sensor.altair_mvhr_indoor_humidity
  filter_days: sensor.altair_mvhr_filter_days_remaining
  boost_active: binary_sensor.altair_mvhr_boost_active
  boost_remaining: sensor.altair_mvhr_boost_remaining
  boost_duration: number.altair_mvhr_boost_duration
  start_boost: button.altair_mvhr_start_boost
  cancel_boost: button.altair_mvhr_cancel_boost
  override_duration: select.altair_mvhr_override_duration
  override_remaining: sensor.altair_mvhr_override_remaining
  clear_override: button.altair_mvhr_clear_override
  calibration_result: sensor.altair_mvhr_airflow_calibration_result
  calibration_status: sensor.altair_mvhr_airflow_calibration_status
  calibration_progress: sensor.altair_mvhr_airflow_calibration_progress
  last_calibration: sensor.altair_mvhr_last_airflow_calibration
show_airflow_on_all_paths: false
show_controls: true
show_fan_speeds: true
show_filter: true
show_calibration: true
filter_max_days: 365
heat_recovery_method: automatic
```

Full schema in [`SPECIFICATION.md`](SPECIFICATION.md#4-card-configuration-schema).

Altair 160 does not have a summer bypass, so this card deliberately never shows bypass status, bypass controls, or bypass animation for the Altair profile. Boost uses the integration's normal `number.set_value` and `button.press` entities; it does not use unsupported experimental Modbus boost coils.

Heat recovery is an apparent sensible estimate based on temperatures, using `(supply - outdoor) / (extract - outdoor) * 100` when heating-recovery conditions are plausible. It is useful dashboard context, not an independently certified unit efficiency. Set `heat_recovery_method: disabled` to hide the calculation.

The visual editor covers the primary display settings and options. YAML remains the best way to maintain large explicit entity maps.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — how and why the card is built the way it is
- [`SPECIFICATION.md`](SPECIFICATION.md) — config schema, entity roles, capability matrix
- [`ROADMAP.md`](ROADMAP.md) — what's built, what's next
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — how to contribute, including adding a new manufacturer
- [`CLAUDE.md`](CLAUDE.md) — working conventions for AI-assisted contributions to this repo

## License

[MIT](LICENSE)
