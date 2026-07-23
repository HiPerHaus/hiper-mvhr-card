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
- **System** — the flagship, polished dashboard for homeowners who want to *see* their ventilation system rather than read a list: a compact header with an at-a-glance mode select, Off/run support and boost pill, a large System Overview visual next to a shower-detection panel (when configured), three information cards (Airflow/Environment/System Status), and a "More controls" disclosure for everything else (airflow presets, calibration, override, mapped level, individual fan RPM) collapsed out of the way by default.

A **Commissioning** mode (raw entity/register inspection) is planned but not built yet.

### System mode

`display_mode: system` is aimed at someone who wants to glance at the card and immediately answer: is it working, where's the air coming from and going to, how much heat is being recovered, is boost on, is someone in the shower right now, does the filter need attention? It deliberately doesn't lead with diagnostics — airflow presets, calibration, override, and raw entity availability all live behind the "More controls" disclosure instead of competing for attention with the airflow visual.

Minimal configuration:

```yaml
type: custom:hiper-mvhr-card
manufacturer: altair
display_mode: system
name: Altair MVHR
max_airflow: 120
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
name: Altair MVHR
subtitle: Heat Recovery Ventilation System
max_airflow: 120

show_airflow_animation: true
show_advanced_controls: true
entities:
  mode: select.altair_mvhr_mode
  effective_mode: sensor.altair_mvhr_effective_mode
  stop_control: switch.altair_mvhr_stop_unit
  airflow: sensor.altair_mvhr_airflow
  target_airflow: sensor.altair_mvhr_target_airflow
  maximum_airflow: sensor.altair_mvhr_maximum_airflow
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

  away_airflow: number.altair_mvhr_away_airflow
  low_airflow: number.altair_mvhr_low_airflow
  home_airflow: number.altair_mvhr_home_airflow
  high_airflow: number.altair_mvhr_high_airflow
  calibration_available: binary_sensor.altair_mvhr_airflow_calibration_available
  calibration_start_control: button.altair_mvhr_start_airflow_calibration
  calibration_cancel_control: button.altair_mvhr_cancel_airflow_calibration
  calibration_result: sensor.altair_mvhr_airflow_calibration_result
  calibration_status: sensor.altair_mvhr_airflow_calibration_status
  calibration_progress: sensor.altair_mvhr_airflow_calibration_progress
  last_calibration: sensor.altair_mvhr_last_airflow_calibration

  indoor_humidity: sensor.altair_mvhr_indoor_humidity
  filter_days: sensor.altair_mvhr_filter_days_remaining

  # Optional — see "Shower detection" below. Omit any/all of these and the
  # card renders exactly as if the feature didn't exist.
  shower_detected: binary_sensor.altair_shower_detected
  shower_trigger_temperature: sensor.altair_shower_trigger_temperature
  shower_peak_temperature: sensor.altair_mvhr_shower_peak_temperature
  shower_rearm_temperature: sensor.altair_mvhr_shower_rearm_temperature
  shower_pipe_temperature: sensor.shower_pipe_temperature
  shower_temperature_rise: number.altair_mvhr_shower_temperature_rise
  shower_detection_window: number.altair_mvhr_shower_detection_window
  shower_rearm_temperature_drop: number.altair_mvhr_shower_rearm_temperature_drop

  # Optional — see "Performance analytics" below. Omit any/all of these and
  # the PERFORMANCE section disappears or trims itself automatically.
  heat_recovery: sensor.altair_mvhr_heat_recovery
  cooling_recovery: sensor.altair_mvhr_cooling_recovery
  heat_recovery_efficiency: sensor.altair_mvhr_heat_recovery_efficiency
  heating_recovered_today: sensor.altair_mvhr_heat_recovered_today
  heating_recovered_month: sensor.altair_mvhr_heat_recovered_month
  heating_recovered_lifetime: sensor.altair_mvhr_heat_recovered_total
  cooling_recovered_today: sensor.altair_mvhr_cooling_recovered_today
  cooling_recovered_month: sensor.altair_mvhr_cooling_recovered_month
  cooling_recovered_lifetime: sensor.altair_mvhr_cooling_recovered_total
  heating_savings_today: sensor.altair_mvhr_heating_saving_today
  heating_savings_lifetime: sensor.altair_mvhr_heating_saving_total
  cooling_savings_today: sensor.altair_mvhr_cooling_saving_today
  cooling_savings_lifetime: sensor.altair_mvhr_cooling_saving_total
  avoided_emissions_today: sensor.altair_mvhr_avoided_emissions_today
  avoided_emissions_lifetime: sensor.altair_mvhr_avoided_emissions_total

  # Optional — see "Weekly schedule" below. The backend remains the source
  # of truth; the card only edits and displays these entities/services.
  weekly_schedule: sensor.altair_mvhr_weekly_schedule
  schedule_control: switch.altair_mvhr_weekly_schedule
  schedule_enabled: binary_sensor.altair_mvhr_weekly_schedule_enabled
  current_scheduled_mode: sensor.altair_mvhr_current_scheduled_mode
  next_scheduled_change: sensor.altair_mvhr_next_scheduled_change
  schedule_override_active: binary_sensor.altair_mvhr_schedule_override_active

show_airflow_on_all_paths: false
show_fan_speeds: true
show_filter: true
show_calibration: true
heat_recovery_method: automatic
```

**Compact header controls.** Mode and Boost sit together inside one bordered "control panel" strip in the header, not floating loose in the corner. Mode is a small select and Boost a status/toggle pill, not full-width form fields — the fuller boost-duration input, Start/Cancel Boost buttons, and the override control still exist, just inside "More controls." If the mapped mode select exposes `Off` (any casing, such as `off`, `Off`, or `OFF`), it appears as the first mode option and is sent back using the exact option value Home Assistant exposed. For the Altair backend, `stop_control` maps Coil 00004 (`switch.altair_mvhr_stop_unit`): choosing Off turns that switch on, and choosing a running mode turns it off before sending the selected Away/Low/Home/High mode. When stopped, the card clearly reports "Stopped", mutes the airflow state, disables particles and fan rotation, and retains any live temperature readings that remain available. Manufacturers without an Off mode or supported stop control simply do not show the Off option.

**System Overview.** This is the hero of the card and always gets the card's full width — no side column competes with it. The visual shows a polished cutaway unit with outdoor air on the left, indoor air on the right, internal filters, cleaner centrifugal blower graphics, formed duct passages, cabinet seams/collars, and a visible plate exchanger. Air colours are temperature-driven, not permanently assigned by air type: each stream uses live endpoint temperatures and gradients through the exchanger, with neutral styling when readings are unavailable. Extract and Supply show both temperature and the shared measured airflow reading by default. Exhaust and Outdoor show temperature only, since most integrations — Altair included — report one measured airflow value for the whole system, not one per duct. Set `show_airflow_on_all_paths: true` to show that shared reading on all four. When `show_airflow_animation` is on, the measured airflow is genuinely positive, the unit is not stopped, and the required temperature entities are available, the fans spin, the duct stubs on the unit show a small travelling particle animation in the correct direction, and the air-path panels animate too — all of it disabled under `prefers-reduced-motion`. While boost is active, those same animations run a little faster (a real boost mode raises fan speed noticeably) rather than adding anything new to the graphic itself. The heat-recovery percentage sits in a compact plate just above the exchanger, with the exchanger left readable, and gently pulses for a moment whenever the figure actually changes between updates (never on load, never if it's unchanged).

**Shower detection.** Entirely optional, and driven by the same entity-role/availability model as everything else in the card — map none, some, or all of `shower_detected` / `shower_trigger_temperature` / `shower_peak_temperature` / `shower_rearm_temperature` / `shower_pipe_temperature` plus the editable `shower_temperature_rise`, `shower_detection_window`, and `shower_rearm_temperature_drop` number roles, and the card adapts:

- **Not configured at all** — nothing shower-related renders anywhere.
- **Configured, but no shower right now** — a calm full-width banner below the lower Environment/Airflow/System Status cards and directly above "More controls" reads "Shower detection ready." If the number entities are mapped, the same banner includes native editable controls for the temperature rise, detection window, and re-arm temperature drop.
- **Detector unavailable or missing** — the same banner location shows a neutral unavailable state and never claims no shower was detected.
- **Shower detected** (`shower_detected` is `on`) — the full banner changes to an active purple state with a lightweight inline-SVG shower illustration, "Boost active"/"Boost not active" (from the same `boost_active` role the header and status card use), the pipe temperature, the stored trigger temperature, optional peak temperature, optional boost remaining, editable detection settings when mapped, and a **re-arm temperature** from the mapped `shower_rearm_temperature` sensor. The card does not calculate re-arm temperature from trigger temperature. Any unavailable/missing setting or sensor is handled independently: missing controls are hidden, unavailable controls are safely disabled, and the banner never shows a fake sensor reading.

**Performance analytics.** Optional MVHR performance sensors render as a full-width **PERFORMANCE** section below Shower Detection and above "More controls." The section appears only when at least one mapped performance entity has a real value, and each group trims itself independently — no blank cards, no "Unavailable" placeholders. Live recovered power (`heat_recovery`, `cooling_recovery`) is displayed in kW when the entity reports W; `heat_recovery_efficiency` keeps the entity's percentage unit. Recovered energy roles (`heating_recovered_today`, `heating_recovered_month`, `heating_recovered_lifetime`, `cooling_recovered_today`, `cooling_recovered_month`, `cooling_recovered_lifetime`) use the entity units, normally kWh. Savings roles (`heating_savings_today`, `heating_savings_lifetime`, `cooling_savings_today`, `cooling_savings_lifetime`) use currency formatting when the entity unit is a currency code such as `AUD`. Emissions roles (`avoided_emissions_today`, `avoided_emissions_lifetime`) use the entity unit, such as `kg CO₂`.

**Weekly schedule.** Optional backend-owned scheduling roles render as a full-width **SCHEDULE** editor below Performance and above "More controls." The schedule is not stored in the Lovelace card: `weekly_schedule` provides the day/period model and status, `schedule_control` or the backend service enables/disables it, and the card calls the `altair_mvhr` schedule services to set a day, copy one day to others, clear a day, or clear the week. Each day supports multiple start-time periods targeting Off, Away, Low, Home or High; duplicate start times are rejected before the service call. Missing schedule entities hide the section cleanly, so installations without backend scheduling keep the existing layout.

**Lower cards.** Airflow (a semicircular SVG/CSS gauge, no charting library — the number and its unit stack on separate lines — plus target airflow/fan speed/current profile) now scales measured airflow against the best available capacity: `max_airflow`, then `maximum_airflow`, then `high_airflow`, then a profile default, with mapped level retained only as a final fallback. It also shows a quiet scale hint such as `70 of 120 m³/h` and briefly brightens whenever the current-airflow reading increases from the previous update (never on load, never on a decrease). Environment shows Supply air, Extract air, optional Indoor humidity, Outdoor air, Exhaust air, and Heat recovery in that order. System Status shows coloured badges for boost/filter/overall state, plus a prominent countdown callout when boost is actually active — never a stray "0 min" when it isn't. Each row only renders when its role is actually configured or supported.

**More controls.** Airflow preset number entities (`away_airflow`, `low_airflow`, `home_airflow`, `high_airflow`) render as native number inputs when mapped and supported, using the entity's min/max/step/unit attributes, debounced writes, pending state, service-error feedback, and Away ≤ Low ≤ Home ≤ High validation. If no preset number entities are configured, the drawer says so instead of silently hiding the section. Airflow calibration renders as its own compact panel when any supported calibration backend is configured: `calibration_available`, `calibration_start_control`, `calibration_cancel_control`, `calibration_status`, `calibration_progress`, `calibration_result`, and `last_calibration`. It shows Start Calibration, Cancel Calibration while running, a progress bar, status, percentage, last timestamp, and result. `calibration` and `start_calibration` are accepted as config aliases for `calibration_start_control`; `cancel_calibration` is accepted for `calibration_cancel_control`.

**Apparent heat-recovery limitation.** Same caveat as detailed mode below: it's `(supply − outdoor) / (extract − outdoor) × 100`, a dashboard-friendly estimate, not a certified efficiency figure, and it correctly reports "Not applicable" for temperature combinations that aren't physically consistent with straightforward recovery (for example a supply temperature above the extract temperature).

**Altair has no bypass**, so system mode never shows a bypass row for it — for Zehnder and Aerofresh, where the profile does support and map it, it appears inside "More controls," never in the main visual, lower cards, or header, and never via a manufacturer check in the rendering code (see [`CLAUDE.md`](CLAUDE.md)'s one rule).

**Responsive behaviour.** The card and its host always take the full width Lovelace gives them (no fixed or max card width), and it stays usable in both light and dark Home Assistant themes (every colour is a theme CSS variable or a `color-mix()` tint against it — nothing is a hard-coded dark surface). The layout reacts to the card's own rendered width (via a CSS container query), not just the browser viewport, since a Home Assistant dashboard often gives a card less room than the window itself would allow. The three lower cards form one row on desktop, wrap to two around ~900px of card width, and stack to one below ~600px, where the shower banner and header controls also drop to a single column and every touch target stays at least 40-44px with no horizontal scrolling.

## What it looks like

The fastest way to see it is the local preview:

```bash
npm install
npm run dev
```

This opens `dev/preview.html`, which renders the card against realistic mock Home Assistant states, including Altair detailed/homeowner/system layouts, running and Off modes, boost active, override active, calibration running/required controls, editable airflow presets, MVHR performance analytics, weekly schedule editing/status, configured-maximum gauge scaling, an unavailable required entity, a Zehnder system-mode scenario with bypass mapped, light/dark themes, and desktop/tablet/430px/375px widths.

## Installation

Not yet published. Once released, this will be installable via [HACS](https://hacs.xyz/) as a custom repository, or manually by copying `dist/hiper-mvhr-card.js` into `config/www/` and registering it as a Lovelace resource.

## Configuration

```yaml
type: custom:hiper-mvhr-card
name: Altair MVHR
subtitle: Heat Recovery Ventilation System
manufacturer: altair
display_mode: detailed
entities:
  mode: select.altair_mvhr_mode
  effective_mode: sensor.altair_mvhr_effective_mode
  stop_control: switch.altair_mvhr_stop_unit
  airflow: sensor.altair_mvhr_airflow
  target_airflow: sensor.altair_mvhr_target_airflow
  maximum_airflow: sensor.altair_mvhr_maximum_airflow
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
  away_airflow: number.altair_mvhr_away_airflow
  low_airflow: number.altair_mvhr_low_airflow
  home_airflow: number.altair_mvhr_home_airflow
  high_airflow: number.altair_mvhr_high_airflow
  calibration_available: binary_sensor.altair_mvhr_airflow_calibration_available
  calibration_start_control: button.altair_mvhr_start_airflow_calibration
  calibration_cancel_control: button.altair_mvhr_cancel_airflow_calibration
  calibration_result: sensor.altair_mvhr_airflow_calibration_result
  calibration_status: sensor.altair_mvhr_airflow_calibration_status
  calibration_progress: sensor.altair_mvhr_airflow_calibration_progress
  last_calibration: sensor.altair_mvhr_last_airflow_calibration
  shower_detected: binary_sensor.altair_shower_detected
  shower_trigger_temperature: sensor.altair_shower_trigger_temperature
  shower_peak_temperature: sensor.altair_mvhr_shower_peak_temperature
  shower_rearm_temperature: sensor.altair_mvhr_shower_rearm_temperature
  shower_pipe_temperature: sensor.shower_pipe_temperature
  shower_temperature_rise: number.altair_mvhr_shower_temperature_rise
  shower_detection_window: number.altair_mvhr_shower_detection_window
  shower_rearm_temperature_drop: number.altair_mvhr_shower_rearm_temperature_drop
  weekly_schedule: sensor.altair_mvhr_weekly_schedule
  schedule_control: switch.altair_mvhr_weekly_schedule
  schedule_enabled: binary_sensor.altair_mvhr_weekly_schedule_enabled
  current_scheduled_mode: sensor.altair_mvhr_current_scheduled_mode
  next_scheduled_change: sensor.altair_mvhr_next_scheduled_change
  schedule_override_active: binary_sensor.altair_mvhr_schedule_override_active
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
