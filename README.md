# HiPer MVHR Card

A universal [Home Assistant](https://www.home-assistant.io/) Lovelace card for Mechanical Ventilation with Heat Recovery (MVHR) systems — one dashboard, any manufacturer, any integration path.

> **Status: pre-alpha.** Foundation, core data layer, homeowner/detailed layouts, native controls, and the first visual configuration editor are in place. Commissioning diagnostics are still evolving. See [Roadmap](ROADMAP.md).

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

The card shows the same data two ways today, chosen with `display_mode` in your config:

- **Homeowner** — clean and minimal; unconfigured optional roles are omitted entirely; no raw entity IDs.
- **Detailed** — adds "not configured" indicators and explicit warnings when a mapped entity doesn't exist in Home Assistant, so an installer can see exactly what's left to wire up.

A **Commissioning** mode (raw entity/register inspection) is planned but not built yet.

## What it looks like

The fastest way to see it is the local preview:

```bash
npm install
npm run dev
```

This opens `dev/preview.html`, which renders the card against realistic mock Home Assistant states, including Altair detailed/homeowner layouts, boost active, calibration running, unavailable entities, light/dark themes, mobile width, and desktop width.

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
