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
- **System** — the flagship, full-width visual panel for homeowners who want to *see* their ventilation system rather than read a dashboard: a large animated airflow visual is the main event, with a compact primary metrics row, simple Mode/Boost controls, and a "More controls" disclosure for everything else (override, mapped level, calibration internals, individual fan RPM) collapsed out of the way by default.

A **Commissioning** mode (raw entity/register inspection) is planned but not built yet.

### System mode

`display_mode: system` is aimed at someone who wants to glance at the card and immediately answer: is it working, where's the air coming from and going to, how much heat is being recovered, is boost on, does the filter need attention? It deliberately doesn't lead with diagnostics — mapped airflow level, calibration internals, and raw entity availability all live behind the "More controls" disclosure instead of competing for attention with the airflow visual.

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

Full configuration, including the boost/override/calibration entities that populate the "More controls" disclosure and the two system-mode-only display options:

```yaml
type: custom:hiper-mvhr-card
manufacturer: altair
display_mode: system
title: Altair MVHR
subtitle: Heat Recovery Ventilation System
entities:
  mode: select.altair_mvhr_mode
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
  clear_override: button.altair_mvhr_clear_override
  calibration_result: sensor.altair_mvhr_airflow_calibration_result
  calibration_status: sensor.altair_mvhr_airflow_calibration_status
  last_calibration: sensor.altair_mvhr_last_airflow_calibration
show_airflow_on_all_paths: false
show_airflow_animation: true
show_advanced_controls: true
show_fan_speeds: true
show_filter: true
show_calibration: true
heat_recovery_method: automatic
```

**Advanced controls.** The "More controls" disclosure is collapsed the first time the card renders — `show_advanced_controls: false` removes it entirely (for a homeowner who should never need it), rather than changing whether it starts open. When shown, it reveals override duration/remaining and the clear-override action, the mapped airflow level, calibration status/progress, and the individual supply/extract fan RPM readings a homeowner doesn't need at a glance.

**Airflow direction.** The visual shows four ducts around the central unit: Extract (home → unit, red) and Supply (unit → home, blue) show both temperature and the shared measured airflow reading by default; Exhaust (unit → outdoors, orange) and Outdoor (outdoors → unit, teal) show temperature only, since most integrations — Altair included — report one measured airflow value for the whole system, not one per duct. Set `show_airflow_on_all_paths: true` to show that shared reading on all four. The duct animation only runs when the measured airflow is genuinely positive and the required temperature entities are available, and it respects `prefers-reduced-motion`.

**Apparent heat-recovery limitation.** Same caveat as detailed mode below: it's `(supply − outdoor) / (extract − outdoor) × 100`, a dashboard-friendly estimate, not a certified efficiency figure, and it correctly reports "Not applicable" for temperature combinations that aren't physically consistent with straightforward recovery (for example a supply temperature above the extract temperature).

**Altair has no bypass**, so system mode never shows a bypass row for it — for Zehnder and Aerofresh, where the profile does support and map it, it appears inside "More controls," never in the main visual or metrics row, and never via a manufacturer check in the rendering code (see [`CLAUDE.md`](CLAUDE.md)'s one rule).

**Responsive behaviour.** The card and its host always take the full width Lovelace gives them (no fixed or max card width). On desktop the visual and controls sit side by side; below ~900px the layout stacks to one column; below ~600px the four duct panels rearrange into a 2×2 grid around the unit and the metrics row locks to two columns, with the "More controls" disclosure still collapsed by default and every touch target at least 44px.

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
