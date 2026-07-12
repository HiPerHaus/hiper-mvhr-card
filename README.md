# HiPer MVHR Card

A universal [Home Assistant](https://www.home-assistant.io/) Lovelace card for Mechanical Ventilation with Heat Recovery (MVHR) systems — one dashboard, any manufacturer, any integration path.

> **Status: pre-alpha.** Foundation and core data layer are complete. The card now renders a real homeowner/detailed layout (Phase 2, in review) — interactive controls, a visual config editor, and commissioning diagnostics are still to come. See [Roadmap](ROADMAP.md).

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

No screenshots yet — this is still pre-release and the design is actively changing. The fastest way to see it is the local preview:

```bash
npm install
npm run dev
```

This opens `dev/preview.html`, which renders the card against several realistic mock Home Assistant states (one per supported manufacturer, plus an invalid-config example) without needing a real Home Assistant instance.

## Installation

Not yet published. Once released, this will be installable via [HACS](https://hacs.xyz/) as a custom repository, or manually by copying `dist/hiper-mvhr-card.js` into `config/www/` and registering it as a Lovelace resource.

## Configuration

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

Full schema in [`SPECIFICATION.md`](SPECIFICATION.md#4-card-configuration-schema).

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — how and why the card is built the way it is
- [`SPECIFICATION.md`](SPECIFICATION.md) — config schema, entity roles, capability matrix
- [`ROADMAP.md`](ROADMAP.md) — what's built, what's next
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — how to contribute, including adding a new manufacturer
- [`CLAUDE.md`](CLAUDE.md) — working conventions for AI-assisted contributions to this repo

## License

[MIT](LICENSE)
