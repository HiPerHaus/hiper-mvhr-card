import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { HomeAssistant, LovelaceCard } from '../types/hass';
import type { HiperMvhrCardConfig } from '../types/config';
import type { RoleValue } from '../types/snapshot';
import { ENTITY_ROLES, type EntityRoleId } from '../types/entity-roles';
import { parseConfig } from '../data/config-schema';
import { resolveCapabilities } from '../data/capability-resolver';
import { resolveSnapshot } from '../data/entity-resolver';
import { summarizeAvailability, type AvailabilitySummary } from '../data/availability-summary';
import { ControlDispatcher } from '../data/control-dispatcher';
import { getProfile } from '../manufacturers';
import { formatRoleValue, capitalize, formatTimestampMaybe } from '../utils/format';
import { getRoleIcon } from '../utils/icons';
import { calculateHeatRecovery, type HeatRecoveryResult } from '../utils/heat-recovery';

const CARD_TAG = 'hiper-mvhr-card';

const TEMPERATURE_ROLES: Array<[EntityRoleId, string]> = [
  ['outdoor_air_temp', 'Outdoor air'],
  ['supply_air_temp', 'Supply air'],
  ['extract_air_temp', 'Extract air'],
  ['exhaust_air_temp', 'Exhaust air'],
];

const AIRFLOW_ROLES: Array<[EntityRoleId, string]> = [
  ['supply_airflow', 'Supply airflow'],
  ['extract_airflow', 'Extract airflow'],
];

const FAN_ROLES: Array<[EntityRoleId, string]> = [
  ['supply_fan_speed', 'Supply fan'],
  ['extract_fan_speed', 'Extract fan'],
];

const STATUS_ROLES: Array<[EntityRoleId, string]> = [
  ['bypass_state', 'Summer bypass'],
  ['filter_remaining', 'Filter'],
  ['calibration_result', 'Calibration'],
  ['fault_active', 'Fault'],
  ['frost_protection_active', 'Frost protection'],
];

// Action roles implemented so far. Kept out of STATUS_ROLES/`_present`
// because they render as an interactive control, not read-only text, when
// their snapshot status is 'ok' — see `_controlRow`. Each entry is
// [role, label, action verb, pending verb] — e.g. "Reset"/"Resetting…" for
// the filter, "Run"/"Running…" for calibration — since a single hard-coded
// button caption stopped being enough once there was more than one action
// role (visual-polish follow-up, round 2, added `calibration_start_control`).
const CONTROL_ROLES: Array<[EntityRoleId, string, string, string]> = [
  ['filter_reset_control', 'Filter reset', 'Reset', 'Resetting…'],
  ['calibration_start_control', 'Run calibration', 'Run', 'Running…'],
];

const TONE_ICONS: Record<AvailabilitySummary['tone'], string> = {
  success: 'mdi:check-circle',
  warning: 'mdi:alert',
  muted: 'mdi:information-outline',
};

/**
 * Roles that are diagnostic/optional conveniences rather than the card's
 * core "is this system actually reporting" signal — an unmapped or
 * unavailable fault/frost sensor, boost/override control, or calibration
 * metadata field must never turn the header's top-level availability
 * indicator into a warning (Phase 4: "Only required entity failures should
 * affect the top-level availability status"). `effective_mode` is excluded
 * too — it's a secondary read-out of the same thing `mode` already reports.
 */
const OPTIONAL_AVAILABILITY_ROLES: EntityRoleId[] = [
  'effective_mode',
  'fault_active',
  'frost_protection_active',
  'bypass_state',
  'boost_active',
  'boost_remaining',
  'boost_duration',
  'start_boost',
  'cancel_boost',
  'override_duration',
  'override_remaining',
  'clear_override',
  'calibration_status',
  'calibration_progress',
  'last_calibration',
  'filter_reset_control',
  'shower_detected',
  'shower_trigger_temperature',
  'shower_pipe_temperature',
];
const OPTIONAL_AVAILABILITY_ROLE_SET = new Set(OPTIONAL_AVAILABILITY_ROLES);

/**
 * The shower detector's documented rearm rule (see ha-altair-mvhr's
 * shower_detector.py and CLAUDE.md-equivalent spec for that integration):
 * it rearms once the pipe cools to trigger_temperature - 10°C. This is
 * fixed, generic UI math describing what the `shower_trigger_temperature`
 * role means, not a manufacturer conditional — any profile that supports
 * these roles gets the same derived rearm reading.
 */
const SHOWER_REARM_OFFSET_C = 10;

/** display_mode: system's ordered temperature list (Phase visual redesign). */
const SYSTEM_TEMPERATURE_ROLES: Array<[EntityRoleId, string]> = [
  ['supply_air_temp', 'Supply air'],
  ['extract_air_temp', 'Extract air'],
  ['outdoor_air_temp', 'Outdoor air'],
  ['exhaust_air_temp', 'Exhaust air'],
];

const CALIBRATION_QUIET_STATES = new Set([
  'calibrated',
  'complete',
  'completed',
  'idle',
  'none',
  'unknown',
]);
const FAULT_ACTIVE_STATES = new Set(['on', 'true', 'problem', 'active', 'detected']);

/** What one resolved role should look like once display_mode is applied. */
interface Presentation {
  tone: 'normal' | 'muted' | 'warning';
  text: string;
}

/** One row of the bottom status strip / overall dashboard health signal. */
interface DashboardStatus {
  tone: AvailabilitySummary['tone'];
  label: string;
}

/**
 * No manufacturer-specific logic lives in this component (CLAUDE.md's one
 * rule) — it only ever asks the resolved CapabilityProfile whether a role is
 * supported, and renders the resulting MvhrSnapshot. Which manufacturer
 * produced that profile is never inspected here.
 */
export class HiperMvhrCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) hass?: HomeAssistant;

  @state() private _config?: HiperMvhrCardConfig;
  @state() private _configError?: string;
  // `display_mode: system`'s "More controls" disclosure (Phase 10) — always
  // starts collapsed, per-instance UI state rather than persisted config.
  @state() private _advancedOpen = false;

  // One ControlDispatcher per active action role, created lazily and kept
  // alive across renders (not a @state field — its pending/error state is
  // read on demand in render(), and `onChange` explicitly requests an
  // update, so Lit's own reactivity doesn't need to know about this map).
  private readonly _dispatchers = new Map<EntityRoleId, ControlDispatcher>();

  // Micro-animation change-tracking (visual-polish follow-up, round 3):
  // plain instance fields, not @state — recording "what did this value used
  // to be" is a side effect of rendering, not something that should itself
  // trigger a re-render. Read at the start of the relevant render method
  // (to decide whether to play a one-shot "just changed" animation this
  // pass) and written at the end of that same method, so the comparison is
  // always against the previous hass update, never against itself.
  private _prevRecoveryLabel?: string;
  private _prevAirflowNumber?: number;

  private _getDispatcher(role: EntityRoleId): ControlDispatcher {
    let dispatcher = this._dispatchers.get(role);
    if (!dispatcher) {
      dispatcher = new ControlDispatcher();
      dispatcher.onChange(() => this.requestUpdate());
      this._dispatchers.set(role, dispatcher);
    }
    return dispatcher;
  }

  static getStubConfig(): Partial<HiperMvhrCardConfig> {
    return {
      manufacturer: 'generic',
      display_mode: 'homeowner',
      entities: {},
    };
  }

  static getConfigElement(): HTMLElement {
    return document.createElement('hiper-mvhr-card-editor');
  }

  setConfig(config: Record<string, unknown>): void {
    try {
      this._config = parseConfig(config);
      this._configError = undefined;
    } catch (err) {
      this._config = undefined;
      this._configError = err instanceof Error ? err.message : String(err);
    }
  }

  getCardSize(): number {
    return 4;
  }

  protected render(): TemplateResult {
    if (this._configError) {
      return html`<ha-card><div class="error" role="alert">${this._configError}</div></ha-card>`;
    }
    if (!this._config || !this.hass) {
      return html``;
    }

    const config = this._config;
    const hass = this.hass;
    const detailed = config.display_mode === 'detailed';
    const system = config.display_mode === 'system';
    const profile = resolveCapabilities(config.manufacturer, config.feature_flags);
    const displayProfile = getProfile(config.manufacturer);
    const snapshot = resolveSnapshot(hass, profile, config.entities);
    // Only required-entity failures move the header's top-level indicator —
    // an unmapped/unavailable optional sensor (fault, frost, boost/override
    // controls, calibration metadata) never does (Phase 4).
    const availability = summarizeAvailability(snapshot, profile, {
      ignoreRoles: OPTIONAL_AVAILABILITY_ROLES,
    });
    const showAvailability = detailed || availability.label !== 'Not configured';
    const modePresentation = snapshot.mode ? this._present(snapshot.mode, detailed) : null;
    const title = config.title ?? config.name ?? displayProfile.name;
    const subtitle = config.subtitle ?? 'Heat Recovery Ventilation System';
    const active = availability.tone !== 'warning' && availability.label !== 'Not configured';
    const recovery = this._heatRecovery(snapshot, config.heat_recovery_method);
    const modeLabel = this._modeLabel(
      modePresentation?.text ?? this._text(snapshot.effective_mode),
    );
    const unitBrand = config.title ?? displayProfile.name;

    return html`
      <ha-card class=${system ? 'card-system' : ''}>
        ${
          system
            ? this._systemHeader(title, subtitle, modeLabel, snapshot, config, hass)
            : this._header(title, subtitle, modeLabel, availability, showAvailability)
        }
        ${
          system
            ? this._systemDashboard(snapshot, config, hass, recovery, modeLabel, unitBrand, active)
            : detailed
              ? this._dashboard(snapshot, config, hass, recovery, modeLabel, unitBrand, active)
              : this._legacyContent(snapshot, config, hass, detailed)
        }
      </ha-card>
    `;
  }

  /**
   * Card header — Phase 4. Shared by both display modes: title, a status dot
   * + the current mode read prominently next to it, and the subtitle below.
   * The availability chip only ever reflects required-entity failures (see
   * `OPTIONAL_AVAILABILITY_ROLES` above), never an unconfigured optional
   * sensor like fault/frost.
   */
  private _header(
    title: string,
    subtitle: string,
    modeLabel: string,
    availability: AvailabilitySummary,
    showAvailability: boolean,
  ): TemplateResult {
    return html`
      <div class="header mvhr-header">
        <div class="header-row">
          <div class="header-title-group">
            <h2 class="title">${title}</h2>
            <span class="status-dot dot-${availability.tone}" aria-hidden="true"></span>
            ${modeLabel ? html`<span class="mode-pill">${modeLabel}</span>` : ''}
          </div>
          ${
            showAvailability
              ? html`
                  <div class="availability tone-${availability.tone}" role="status">
                    <ha-icon icon=${TONE_ICONS[availability.tone]} aria-hidden="true"></ha-icon>
                    <span>${availability.label}</span>
                  </div>
                `
              : ''
          }
        </div>
        <div class="subheader">${subtitle}</div>
      </div>
    `;
  }

  /**
   * `display_mode: homeowner`'s content — unchanged since Phase 2: a
   * compact, plain-language read-out (temperatures / airflow / system
   * status), unconfigured optional roles omitted entirely, no raw entity
   * IDs. `display_mode: detailed` no longer renders this at all — see
   * `_dashboard` below, which is its full replacement (ROADMAP.md "Rebuild
   * detailed MVHR dashboard layout").
   */
  private _legacyContent(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    config: HiperMvhrCardConfig,
    hass: HomeAssistant,
    detailed: boolean,
  ): TemplateResult {
    return html`
      <div class="content">
        ${this._metricSection('Temperatures', TEMPERATURE_ROLES, snapshot, detailed)}
        ${this._metricSection('Airflow', AIRFLOW_ROLES, snapshot, detailed)}
        ${this._statusSection('System status', STATUS_ROLES, snapshot, detailed, config, hass)}
      </div>
    `;
  }

  /**
   * `display_mode: detailed`'s entire card body (Phase 2-3/2-17 of the
   * dashboard rebuild) — one unified MVHR dashboard: a large airflow visual
   * + controls side by side, metrics tiles below, a status strip at the
   * bottom. Nothing from the legacy homeowner content (`_legacyContent`)
   * renders alongside it.
   */
  private _dashboard(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    config: HiperMvhrCardConfig,
    hass: HomeAssistant,
    recovery: HeatRecoveryResult,
    modeLabel: string,
    unitBrand: string,
    active: boolean,
  ): TemplateResult {
    const hasControls = config.show_controls && this._hasControls(snapshot, config);

    return html`
      <div class="mvhr-dashboard ${hasControls ? '' : 'no-controls'}">
        <section class="visual-panel" aria-label="MVHR airflow diagram">
          ${this._heroVisual(snapshot, config, active, unitBrand, recovery)}
        </section>
        ${hasControls ? this._controlsPanel(snapshot, config, hass) : ''}
        <section class="metrics-grid" aria-label="MVHR metrics">
          ${this._infoTile('Mode', modeLabel || '—', 'mdi:fan-auto')}
          ${this._infoTile(
            'Measured airflow',
            this._value(snapshot.airflow, true) ??
              this._value(snapshot.supply_airflow, true) ??
              '—',
            'mdi:weather-windy',
          )}
          ${this._infoTile('Target airflow', this._value(snapshot.target_airflow, true) ?? '—', 'mdi:target')}
          ${this._infoTile('Mapped level', this._value(snapshot.mapped_level, true) ?? '—', 'mdi:tune-variant')}
          ${this._infoTile(
            'Heat recovery',
            recovery.label,
            'mdi:heat-wave',
            recovery.status,
            'Apparent temperature recovery',
          )}
          ${
            config.show_fan_speeds
              ? this._infoTile('Fan speeds', this._pair(FAN_ROLES, snapshot, true), 'mdi:fan')
              : ''
          }
          ${this._infoTile('Humidity', this._value(snapshot.indoor_humidity, true) ?? '—', 'mdi:water-percent')}
          ${config.show_filter ? this._filterTile(snapshot, config) : ''}
        </section>
        ${this._statusStrip(snapshot, config)} ${this._extraControls(snapshot, config, hass)}
      </div>
    `;
  }

  /**
   * The bottom health status strip — System OK / Fault detected /
   * Calibrating… / Calibration required / Communication issue, plus a
   * calibration summary and its last-run timestamp. Shared verbatim between
   * `display_mode: detailed` (`_dashboard`) and `display_mode: system`
   * (`_systemDashboard`) — Phase 11 of the system-mode build asks for
   * exactly the same content the dashboard rebuild already produced, so
   * this was extracted rather than re-implemented.
   */
  private _statusStrip(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    config: HiperMvhrCardConfig,
  ): TemplateResult {
    const status = this._dashboardStatus(snapshot);
    const lastCalibration =
      snapshot.last_calibration?.status === 'ok'
        ? formatTimestampMaybe(snapshot.last_calibration.value)
        : null;

    return html`
      <section class="status-strip tone-${status.tone}" aria-label="MVHR status">
        <span class="status-chip">
          <ha-icon icon=${TONE_ICONS[status.tone]} aria-hidden="true"></ha-icon>
          <span>${status.label}</span>
        </span>
        ${
          config.show_calibration
            ? html`
                <span>Calibration: ${this._value(snapshot.calibration_result, true) ?? '—'}</span>
                ${lastCalibration ? html`<span>Last calibration: ${lastCalibration}</span>` : ''}
              `
            : ''
        }
      </section>
    `;
  }

  /**
   * Applies the SPECIFICATION.md §6 / display-mode policy to one resolved
   * role: what should actually appear, and how prominent should it look.
   * Returns null when nothing should render for this role at all.
   */
  private _present(value: RoleValue, detailed: boolean): Presentation | null {
    if (value.status === 'unsupported') {
      return null;
    }
    if (value.status === 'not_configured') {
      // Homeowner: omit unconfigured optional roles entirely.
      // Detailed: show it, quietly, so an installer can see what's left to wire up.
      return detailed ? { tone: 'muted', text: 'Not configured' } : null;
    }
    if (value.status === 'entity_missing') {
      // Homeowner: no raw entity IDs, no configuration jargon — reads the
      // same as a sensor that's simply unavailable right now.
      // Detailed: a real configuration warning, with the entity id that's missing.
      return detailed
        ? { tone: 'warning', text: `Entity not found: ${value.entityId}` }
        : { tone: 'muted', text: 'Unavailable' };
    }
    if (value.status === 'unavailable') {
      return { tone: 'muted', text: 'Unavailable' };
    }
    // status === 'ok' — includes a legitimate zero reading, formatRoleValue
    // renders value.value verbatim so "0" is never mistaken for "no data".
    return { tone: 'normal', text: formatRoleValue(value) };
  }

  private _metricSection(
    heading: string,
    roles: Array<[EntityRoleId, string]>,
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    detailed: boolean,
  ): TemplateResult {
    const cells = roles
      .map(([role, label]) => {
        const value = snapshot[role];
        const presentation = value ? this._present(value, detailed) : null;
        return presentation ? this._metricCell(role, label, presentation) : null;
      })
      .filter((cell): cell is TemplateResult => cell !== null);

    if (cells.length === 0) {
      return html``;
    }

    return html`
      <section class="metric-section" aria-label=${heading}>
        <h3>${heading}</h3>
        <div class="metric-grid">${cells}</div>
      </section>
    `;
  }

  private _metricCell(
    role: EntityRoleId,
    label: string,
    presentation: Presentation,
  ): TemplateResult {
    const icon = getRoleIcon(role);
    return html`
      <div class="metric tone-${presentation.tone}">
        ${icon ? html`<ha-icon icon=${icon} aria-hidden="true"></ha-icon>` : ''}
        <div class="metric-text">
          <span class="metric-label">${label}</span>
          <span class="metric-value">${presentation.text}</span>
        </div>
      </div>
    `;
  }

  private _statusSection(
    heading: string,
    roles: Array<[EntityRoleId, string]>,
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    detailed: boolean,
    config: HiperMvhrCardConfig,
    hass: HomeAssistant,
  ): TemplateResult {
    const valueRows = roles
      .map(([role, label]) => {
        const value = snapshot[role];
        const presentation = value ? this._present(value, detailed) : null;
        return presentation ? this._statusRow(role, label, presentation) : null;
      })
      .filter((row): row is TemplateResult => row !== null);

    const controlRows = CONTROL_ROLES.map(([role, label, actionVerb, pendingVerb]) =>
      this._controlRow(role, label, snapshot[role], detailed, config, hass, actionVerb, pendingVerb),
    ).filter((row): row is TemplateResult => row !== null);

    const rows = [...valueRows, ...controlRows];
    if (rows.length === 0) {
      return html``;
    }

    return html`
      <section class="status-section" aria-label=${heading}>
        <h3>${heading}</h3>
        <div class="status-list">${rows}</div>
      </section>
    `;
  }

  /**
   * The new dashboard's own home for action roles beyond the ones the
   * dashboard already surfaces as first-class controls (mode/boost/
   * override). Today that's just `filter_reset_control` (Phase 3A,
   * `generic`-profile only) — every action role goes through the same five
   * SPECIFICATION.md §6 states as a read-only role, so it degrades exactly
   * like the legacy content's status rows did. Renders nothing for
   * Altair/Zehnder/Aerofresh, which don't declare this role supported.
   */
  private _extraControls(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    config: HiperMvhrCardConfig,
    hass: HomeAssistant,
  ): TemplateResult {
    const rows = CONTROL_ROLES.map(([role, label, actionVerb, pendingVerb]) =>
      this._controlRow(role, label, snapshot[role], true, config, hass, actionVerb, pendingVerb),
    ).filter((row): row is TemplateResult => row !== null);

    if (rows.length === 0) {
      return html``;
    }

    return html`
      <section class="status-section extra-controls" aria-label="Additional controls">
        <div class="status-list">${rows}</div>
      </section>
    `;
  }

  private _statusRow(
    role: EntityRoleId,
    label: string,
    presentation: Presentation,
  ): TemplateResult {
    const icon = getRoleIcon(role);
    return html`
      <div class="status-row tone-${presentation.tone}">
        ${icon ? html`<ha-icon icon=${icon} aria-hidden="true"></ha-icon>` : ''}
        <span class="status-label">${label}</span>
        <span class="status-value">${presentation.text}</span>
      </div>
    `;
  }

  /**
   * Renders one action role. The non-value states (unsupported/not
   * configured/entity missing/unavailable) reuse `_present`/`_statusRow`
   * verbatim, so a control degrades identically to every read-only role
   * (SPECIFICATION.md §6) — only the 'ok' state diverges, showing an
   * interactive button instead of formatted text, since a button entity's
   * raw state (a last-pressed timestamp) isn't meaningful to show.
   */
  private _controlRow(
    role: EntityRoleId,
    label: string,
    value: RoleValue | undefined,
    detailed: boolean,
    config: HiperMvhrCardConfig,
    hass: HomeAssistant,
    actionVerb: string,
    pendingVerb: string,
  ): TemplateResult | null {
    if (!value) {
      return null;
    }
    if (value.status !== 'ok') {
      const presentation = this._present(value, detailed);
      return presentation ? this._statusRow(role, label, presentation) : null;
    }

    const entityId = config.entities[role];
    if (!entityId) {
      // Can't happen in practice — entity-resolver only produces 'ok' when
      // an entity id was mapped — but keeps this method total rather than
      // asserting non-null.
      return null;
    }

    const dispatcher = this._getDispatcher(role);
    const state = dispatcher.state;
    const icon = getRoleIcon(role);

    return html`
      <div class="status-row">
        ${icon ? html`<ha-icon icon=${icon} aria-hidden="true"></ha-icon>` : ''}
        <span class="status-label">${label}</span>
        ${
          state.status === 'error'
            ? html`<span class="status-value tone-warning">Couldn't ${actionVerb.toLowerCase()}</span>`
            : ''
        }
        <button
          type="button"
          class="control-button"
          aria-label=${label}
          ?disabled=${state.status === 'pending'}
          @click=${() => dispatcher.dispatchAction(hass, entityId)}
        >
          ${state.status === 'pending' ? pendingVerb : actionVerb}
        </button>
      </div>
    `;
  }

  /**
   * Phase 5-7: the dashboard's hero element — a large central MVHR unit
   * with the four air paths around it (extract/exhaust/outdoor/supply, no
   * bypass path — this diagram is deliberately generic across every
   * manufacturer profile, which is exactly why Altair, which has none,
   * never gets one) and the heat-recovery badge inside the unit itself.
   */
  private _heroVisual(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    config: HiperMvhrCardConfig,
    active: boolean,
    unitBrand: string,
    recovery: HeatRecoveryResult,
  ): TemplateResult {
    // The Altair integration (and most others) reports one measured airflow
    // value shared by the whole system, not one per duct — so by default it
    // only appears next to the two paths a homeowner actually cares about
    // (extract/supply); `show_airflow_on_all_paths` opts into showing it on
    // all four, and outdoor/exhaust otherwise show temperature only (Phase 5).
    const sharedAirflow =
      this._value(snapshot.airflow, true) ?? this._value(snapshot.supply_airflow, true);
    const showAllAirflows = config.show_airflow_on_all_paths;

    const path = (
      key: string,
      label: string,
      role: EntityRoleId,
      showAirflowByDefault: boolean,
    ) => {
      const airflow = showAllAirflows || showAirflowByDefault ? sharedAirflow : null;
      return html`
        <div class="air-path ${key} ${active ? 'active' : ''}">
          <span class="path-label">${label}</span>
          <span class="path-temp">${this._value(snapshot[role], true) ?? '—'}</span>
          ${airflow ? html`<span class="path-airflow">${airflow}</span>` : ''}
        </div>
      `;
    };

    return html`
      <div class="visual-wrap">
        ${path('extract', 'Extract air', 'extract_air_temp', true)}
        ${path('exhaust', 'Exhaust air', 'exhaust_air_temp', false)}
        <div class="unit" aria-label="Heat recovery unit">
          <div class="brand">
            ${unitBrand}${unitBrand.toLowerCase().includes('mvhr') ? '' : html`<br /><span>MVHR</span>`}
          </div>
          <div class="duct duct-top" aria-hidden="true"></div>
          <div class="duct duct-bottom" aria-hidden="true"></div>
          <div class="duct duct-left" aria-hidden="true"></div>
          <div class="duct duct-right" aria-hidden="true"></div>
          <div class="exchanger" aria-hidden="true"></div>
          <div class="fan fan-a" aria-hidden="true">✦</div>
          <div class="fan fan-b" aria-hidden="true">✦</div>
          <div class="recovery-badge" title="Apparent temperature recovery">
            <span class="recovery-label">Heat Recovery</span>
            <strong class="recovery-value">${recovery.label}</strong>
          </div>
        </div>
        ${path('outdoor', 'Outdoor air', 'outdoor_air_temp', false)}
        ${path('supply', 'Supply air', 'supply_air_temp', true)}
      </div>
    `;
  }

  /**
   * Phase 8: mode / boost / override controls, restyled as three clear
   * groups with large touch targets. Service calls are unchanged from the
   * pre-rebuild dashboard — only markup/CSS and the active-mode highlight
   * are new.
   */
  private _controlsPanel(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    config: HiperMvhrCardConfig,
    hass: HomeAssistant,
  ): TemplateResult {
    const modeEntity = config.entities.mode;
    const durationEntity = config.entities.boost_duration;
    const overrideEntity = config.entities.override_duration;
    const modeOptions = this._modeOptions(snapshot.mode);
    const overrideOptions = this._selectOptions(snapshot.override_duration);
    const currentModeRaw = this._state(snapshot.mode)?.toLowerCase();
    const boostActive = this._state(snapshot.boost_active) === 'on';
    // Boost/override "remaining" is a nice-to-have, not a required reading —
    // shown only when there's a genuine value, never as a prominent
    // "Unavailable remaining"/"Not configured remaining" (Phase 8).
    const boostRemaining =
      snapshot.boost_remaining?.status === 'ok' ? this._value(snapshot.boost_remaining) : null;
    const overrideRemaining =
      snapshot.override_remaining?.status === 'ok'
        ? this._value(snapshot.override_remaining)
        : null;

    return html`
      <aside class="controls-panel" aria-label="MVHR controls">
        <div class="panel-heading">Controls</div>

        <div class="control-group">
          <span class="control-group-label">Mode</span>
          <div class="mode-buttons" role="group" aria-label="Operating mode">
            ${modeOptions.map((option) => {
              const isActive =
                currentModeRaw !== undefined && option.toLowerCase() === currentModeRaw;
              return html`
                <button
                  type="button"
                  class="chip ${isActive ? 'active' : ''}"
                  ?disabled=${!modeEntity}
                  aria-pressed=${isActive}
                  aria-label=${`Set mode ${this._modeLabel(option)}`}
                  @click=${() =>
                    modeEntity &&
                    this._call(hass, 'select', 'select_option', { entity_id: modeEntity, option })}
                >
                  ${this._modeLabel(option)}
                </button>
              `;
            })}
          </div>
        </div>

        <div class="control-block">
          <div class="control-block-head">
            <span>Boost</span>
            <strong class="state-pill ${boostActive ? 'is-active' : ''}"
              >${boostActive ? 'Active' : 'Ready'}</strong
            >
          </div>
          ${boostRemaining ? html`<small>${boostRemaining} remaining</small>` : ''}
          <label class="field">
            <span>Duration (minutes)</span>
            <input
              type="number"
              min="1"
              step="1"
              .value=${this._state(snapshot.boost_duration) ?? ''}
              ?disabled=${!durationEntity}
              aria-label="Boost duration"
              @change=${(event: Event) => {
                const value = Number((event.currentTarget as HTMLInputElement).value);
                if (durationEntity && Number.isFinite(value)) {
                  void this._call(hass, 'number', 'set_value', {
                    entity_id: durationEntity,
                    value,
                  });
                }
              }}
            />
          </label>
          <div class="button-row">
            <button
              type="button"
              class="cta"
              aria-label="Start Boost"
              ?disabled=${boostActive || !config.entities.start_boost}
              @click=${() => this._press(hass, config.entities.start_boost)}
            >
              Start Boost
            </button>
            <button
              type="button"
              class="cta ghost"
              aria-label="Cancel Boost"
              ?disabled=${!boostActive || !config.entities.cancel_boost}
              @click=${() => this._press(hass, config.entities.cancel_boost)}
            >
              Cancel Boost
            </button>
          </div>
        </div>

        <div class="control-block">
          <div class="control-block-head">
            <span>Override</span>
            <strong
              >${this._value(snapshot.override_duration) ?? 'Until next schedule change'}</strong
            >
          </div>
          ${overrideRemaining ? html`<small>${overrideRemaining} remaining</small>` : ''}
          <label class="field">
            <span>Duration</span>
            <select
              ?disabled=${!overrideEntity}
              aria-label="Override duration"
              @change=${(event: Event) => {
                const option = (event.currentTarget as HTMLSelectElement).value;
                if (overrideEntity) {
                  void this._call(hass, 'select', 'select_option', {
                    entity_id: overrideEntity,
                    option,
                  });
                }
              }}
            >
              ${overrideOptions.map(
                (option) => html`
                  <option
                    .value=${option}
                    ?selected=${this._state(snapshot.override_duration) === option}
                  >
                    ${this._modeLabel(option)}
                  </option>
                `,
              )}
            </select>
          </label>
          <button
            type="button"
            class="cta ghost full"
            aria-label="Clear override"
            ?disabled=${!config.entities.clear_override}
            @click=${() => this._press(hass, config.entities.clear_override)}
          >
            Clear override
          </button>
        </div>
      </aside>
    `;
  }

  /**
   * `display_mode: system`'s header (Phase 4 of the system-mode build,
   * redesigned for the visual-polish pass) — title/dot/mode-pill/subtitle
   * shape as before, the right-hand status text uses the same System OK /
   * Communication issue / Fault detected / Calibration required vocabulary
   * as the status strip (`_dashboardStatus`), and — new in the redesign —
   * a compact "at a glance" operating-mode select and a boost status/toggle
   * pill, in place of the old full-width Mode chip row and Boost card that
   * used to live below the visual (see `_systemAdvancedToggle` for where
   * boost duration/Start/Cancel and override now live, for anyone who wants
   * the fuller controls). No power/off control is rendered: no manufacturer
   * profile in this repo declares any kind of "turn off" role, and inventing
   * one the integration doesn't actually expose would violate the "don't
   * invent unsupported device controls" rule — see docs/manufacturers/*.md.
   * A separate method from `_header` on purpose — `display_mode: detailed`
   * is not touched by the system-mode build.
   */
  private _systemHeader(
    title: string,
    subtitle: string,
    modeLabel: string,
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    config: HiperMvhrCardConfig,
    hass: HomeAssistant,
  ): TemplateResult {
    const status = this._dashboardStatus(snapshot);

    return html`
      <div class="header mvhr-header">
        <div class="header-row">
          <div class="header-title-group">
            <h2 class="title">${title}</h2>
            <span class="status-dot dot-${status.tone}" aria-hidden="true"></span>
            <span class="availability tone-${status.tone}" role="status">
              <ha-icon icon=${TONE_ICONS[status.tone]} aria-hidden="true"></ha-icon>
              <span>${status.label}</span>
            </span>
          </div>
          ${this._systemHeaderControls(snapshot, config, hass, modeLabel)}
        </div>
        <div class="subheader">${subtitle}</div>
      </div>
    `;
  }

  /**
   * The redesign's compact header controls: a small labelled operating-mode
   * `<select>` and a boost status pill that doubles as a toggle button
   * (Start Boost when ready, Cancel Boost when active) — "compact dashboard
   * controls" per the visual-redesign brief, replacing the old full-width
   * chip row and boost card for the primary interaction. Wrapped in
   * `.system-controls` (kept from the pre-redesign markup) so it stays
   * structurally outside `.system-visual-panel`, same as before.
   *
   * Mode keeps showing a passive read-out (the plain `.mode-pill`, same as
   * every other display mode) even when `show_controls` is off or no mode
   * entity is mapped — that part of the header has never been gated by
   * controls visibility. The boost pill is a genuine control, so it only
   * appears when `show_controls` is on and a boost role is actually mapped,
   * matching how boost has always been gated everywhere else in this file.
   */
  private _systemHeaderControls(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    config: HiperMvhrCardConfig,
    hass: HomeAssistant,
    modeLabel: string,
  ): TemplateResult {
    const modeEntity = config.entities.mode;
    const modeOptions = this._modeOptions(snapshot.mode);
    const currentModeRaw = this._state(snapshot.mode)?.toLowerCase();
    const canEditMode = config.show_controls && Boolean(modeEntity) && snapshot.mode?.status === 'ok';
    const hasBoost =
      config.show_controls &&
      [snapshot.boost_duration, snapshot.start_boost, snapshot.cancel_boost].some(
        (value) => value?.status === 'ok',
      );
    const boostActive = this._state(snapshot.boost_active) === 'on';
    // Surfaced next to "Active" so the countdown is visible at a glance
    // without opening the System Status card below — "make the boost
    // remaining time more prominent" (visual-polish follow-up).
    const boostRemaining =
      boostActive && snapshot.boost_remaining?.status === 'ok'
        ? this._value(snapshot.boost_remaining)
        : null;
    // A read-only status indicator, not a control — shown regardless of
    // `show_controls`, same as the passive mode pill.
    const shower = this._shower(snapshot);

    if (!canEditMode && !modeLabel && !hasBoost && !shower.render) {
      return html``;
    }

    return html`
      <div class="system-controls header-controls" role="group" aria-label="MVHR quick controls">
        ${
          canEditMode
            ? html`
                <label class="header-control">
                  <span class="header-control-label">Operating Mode</span>
                  <select
                    class="mode-select-pill"
                    aria-label="Operating mode"
                    @change=${(event: Event) => {
                      const option = (event.currentTarget as HTMLSelectElement).value;
                      if (modeEntity) {
                        void this._call(hass, 'select', 'select_option', {
                          entity_id: modeEntity,
                          option,
                        });
                      }
                    }}
                  >
                    ${modeOptions.map(
                      (option) => html`
                        <option
                          .value=${option}
                          ?selected=${currentModeRaw !== undefined && option.toLowerCase() === currentModeRaw}
                        >
                          ${this._modeLabel(option)}
                        </option>
                      `,
                    )}
                  </select>
                </label>
              `
            : modeLabel
              ? html`<span class="mode-pill">${modeLabel}</span>`
              : ''
        }
        ${
          hasBoost
            ? html`
                <div class="header-control">
                  <span class="header-control-label">Boost</span>
                  <button
                    type="button"
                    class="boost-pill-button ${boostActive ? 'is-active' : ''}"
                    aria-label=${boostActive ? 'Cancel Boost' : 'Start Boost'}
                    ?disabled=${
                      boostActive ? !config.entities.cancel_boost : !config.entities.start_boost
                    }
                    @click=${() =>
                      boostActive
                        ? this._press(hass, config.entities.cancel_boost)
                        : this._press(hass, config.entities.start_boost)}
                  >
                    <ha-icon icon="mdi:rocket-launch" aria-hidden="true"></ha-icon>
                    ${boostActive ? 'Active' : 'Ready'}
                    ${boostRemaining ? html`<small>${boostRemaining} left</small>` : ''}
                  </button>
                </div>
              `
            : ''
        }
        ${shower.render ? this._systemShowerPill(shower) : ''}
      </div>
    `;
  }

  /**
   * `display_mode: system`'s entire card body — redesigned as a polished
   * dashboard (visual-redesign brief): a two-column main section (a larger
   * System Overview visual on the left, a shower-detection panel on the
   * right when configured), three lower information cards (Airflow /
   * Temperatures / System Status), and a "More controls" disclosure for
   * override + calibration internals + any extra action roles — everything
   * still driven by the resolved snapshot, nothing hard-coded. Neither
   * `_legacyContent` nor `_dashboard` render alongside this —
   * `display_mode: detailed`/`homeowner` are unaffected by this method
   * existing.
   */
  private _systemDashboard(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    config: HiperMvhrCardConfig,
    hass: HomeAssistant,
    recovery: HeatRecoveryResult,
    modeLabel: string,
    unitBrand: string,
    active: boolean,
  ): TemplateResult {
    // The airflow animation additionally requires a genuinely positive
    // measured reading — `active` alone (required entities reporting) isn't
    // enough on its own here (Phase 7: "stop animation when ... airflow is
    // zero"), and the config can turn the whole animation off outright.
    const airflowNumber = this._number(snapshot.airflow) ?? this._number(snapshot.supply_airflow);
    const animated = config.show_airflow_animation && active && (airflowNumber ?? 0) > 0;
    const shower = this._shower(snapshot);
    // A real boost mode raises fan speed noticeably — the fans/particles
    // speeding up visually during boost reinforces that instead of
    // adding new elements to the exchanger graphic itself ("particles
    // accelerate slightly during Boost", visual-polish follow-up round 3).
    const boostActive = this._state(snapshot.boost_active) === 'on';

    return html`
      <div class="mvhr-system">
        ${shower.active ? this._systemShowerBanner(shower) : ''}
        <section class="system-main">
          <section class="visual-panel system-visual-panel system-overview" aria-label="System overview">
            <div class="panel-heading-row">
              <h3>System Overview</h3>
            </div>
            ${this._systemHeroVisual(snapshot, config, animated, unitBrand, recovery, boostActive)}
          </section>
        </section>

        <section class="system-lower-grid" aria-label="MVHR details">
          ${this._systemAirflowCard(snapshot, config)}
          ${this._systemTemperaturesCard(snapshot, recovery)}
          ${this._systemStatusCard(snapshot, config)}
        </section>

        ${config.show_advanced_controls ? this._systemAdvancedToggle() : ''}
        ${config.show_advanced_controls ? this._advancedDrawer(snapshot, config, hass) : ''}
      </div>
    `;
  }

  /**
   * The redesign's "More controls" entry point — a single real disclosure
   * toggle (not a fake tab: it genuinely shows/hides `_advancedDrawer`),
   * kept as its own small section below the lower cards so it reads as an
   * escape hatch for override/calibration internals rather than a primary
   * control.
   */
  private _systemAdvancedToggle(): TemplateResult {
    return html`
      <section class="system-more" aria-label="More controls">
        <button
          type="button"
          class="disclosure-toggle"
          aria-expanded=${this._advancedOpen}
          aria-controls="mvhr-advanced-drawer"
          @click=${() => {
            this._advancedOpen = !this._advancedOpen;
          }}
        >
          ${this._advancedOpen ? 'Hide advanced' : 'More controls'}
        </button>
      </section>
    `;
  }

  /**
   * Derives everything the shower-detection panel needs from the snapshot,
   * without rendering anything itself — kept separate from
   * `_systemShowerPanel` so the "should we even show a shower column at
   * all" decision is easy to unit test and reason about on its own.
   *
   * Three outcomes, per the visual-redesign brief:
   *  - `shower_detected` isn't supported/configured at all (no shower
   *    entities wired up) → `render: false`; the overview panel expands
   *    to fill the row (`.system-main.no-shower`).
   *  - Configured but not currently on (including a momentarily
   *    unavailable/missing detector — that's not an active shower) →
   *    `render: true, active: false`, a compact inactive card.
   *  - Configured and on → `render: true, active: true`, the full purple
   *    panel with pipe/trigger/rearm temperatures and boost status, each
   *    shown only when its own entity actually has a value (never a fake
   *    reading for an unavailable sensor).
   */
  private _shower(snapshot: Partial<Record<EntityRoleId, RoleValue>>): {
    render: boolean;
    active: boolean;
    boostActive: boolean;
    pipeTemperature: string | null;
    triggerTemperature: string | null;
    rearmTemperature: string | null;
    boostRemaining: string | null;
  } {
    const detected = snapshot.shower_detected;
    const configured = Boolean(detected) && detected?.status !== 'unsupported' && detected?.status !== 'not_configured';
    const active = detected?.status === 'ok' && detected.value.toLowerCase() === 'on';

    const triggerValue = snapshot.shower_trigger_temperature;
    const triggerNumber = this._number(triggerValue);
    const rearmTemperature =
      triggerNumber === undefined
        ? null
        : `${(triggerNumber - SHOWER_REARM_OFFSET_C).toFixed(1)}${
            triggerValue?.status === 'ok' && triggerValue.unit ? ` ${triggerValue.unit}` : ''
          }`;

    return {
      render: configured,
      active,
      boostActive: this._state(snapshot.boost_active) === 'on',
      // Each fact is shown only when its own entity is genuinely 'ok' — an
      // unavailable/missing sensor omits its row entirely rather than
      // showing a hollow "Pipe temperature: Unavailable" line, per the
      // redesign's "never a fake reading" rule.
      pipeTemperature:
        snapshot.shower_pipe_temperature?.status === 'ok'
          ? this._value(snapshot.shower_pipe_temperature, true)
          : null,
      triggerTemperature: triggerValue?.status === 'ok' ? this._value(triggerValue, true) : null,
      rearmTemperature: active ? rearmTemperature : null,
      // Gated on boost actually being on, not just the sensor having a
      // value — otherwise an idle "0 min"/"0" reading renders as if a
      // countdown were running (visual-polish follow-up, round 2).
      boostRemaining:
        this._state(snapshot.boost_active) === 'on' && snapshot.boost_remaining?.status === 'ok'
          ? this._value(snapshot.boost_remaining)
          : null,
    };
  }

  /**
   * The compact, always-on shower status indicator, next to the boost pill
   * in the header — "float it as a small status card in the header"
   * (visual-polish follow-up, round 2). Rendered whenever shower detection
   * is configured at all; a quiet muted pill reading "No shower detected"
   * when idle, so the main content area never has to spend space on an
   * inactive card (the previous round's `.shower-inactive` card was exactly
   * the "creates a lot of empty whitespace" complaint). The full illustrated
   * detail only appears in `_systemShowerBanner`, and only while active.
   */
  private _systemShowerPill(shower: ReturnType<HiperMvhrCard['_shower']>): TemplateResult {
    return html`
      <div class="header-control">
        <span class="header-control-label">Shower</span>
        <span class="shower-pill ${shower.active ? 'is-active' : ''}" role="status">
          <ha-icon icon="mdi:shower-head" aria-hidden="true"></ha-icon>
          ${shower.active ? 'Detected' : 'No shower detected'}
        </span>
      </div>
    `;
  }

  /**
   * The full illustrated "Shower detected" banner — pipe/trigger/re-arm
   * temperatures, boost status — only rendered while a shower is actually
   * active (`_shower` gates this; see `_systemShowerPill` for the idle
   * state). Moved to a full-width banner directly above System Overview
   * (visual-polish follow-up, round 2) rather than a side column, so
   * Overview can always use the full card width — "let it dominate the
   * page" — while the shower detail still sits immediately next to it, not
   * off in a separate part of the layout. Config's `show_airflow_animation`
   * doesn't gate this panel's own droplet animation — it's a separate,
   * lightweight CSS effect — but `prefers-reduced-motion` always does (see
   * the reduced-motion media query in `static styles`).
   */
  private _systemShowerBanner(shower: ReturnType<HiperMvhrCard['_shower']>): TemplateResult {
    return html`
      <section class="shower-panel shower-active" aria-label="Shower detection" role="status">
        <div class="shower-banner-head">
          <div class="shower-illustration" aria-hidden="true">${this._showerIllustration()}</div>
          <div class="shower-banner-titles">
            <h3 class="shower-heading">Shower Detection</h3>
            <strong class="shower-title">Shower detected</strong>
            <span class="shower-subtitle">${shower.boostActive ? 'Boost active' : 'Boost not active'}</span>
          </div>
        </div>
        <dl class="shower-facts">
          ${
            shower.pipeTemperature
              ? html`
                  <div class="shower-fact">
                    <dt>Pipe temperature</dt>
                    <dd>${shower.pipeTemperature}</dd>
                  </div>
                `
              : ''
          }
          ${
            shower.triggerTemperature
              ? html`
                  <div class="shower-fact">
                    <dt>Trigger temperature</dt>
                    <dd>${shower.triggerTemperature}</dd>
                  </div>
                `
              : ''
          }
          ${
            shower.rearmTemperature
              ? html`
                  <div class="shower-fact">
                    <dt>Re-arm at</dt>
                    <dd>${shower.rearmTemperature}<small>(${SHOWER_REARM_OFFSET_C}°C below trigger)</small></dd>
                  </div>
                `
              : ''
          }
          ${
            shower.boostRemaining
              ? html`
                  <div class="shower-fact">
                    <dt>Boost remaining</dt>
                    <dd>${shower.boostRemaining}</dd>
                  </div>
                `
              : ''
          }
        </dl>
      </section>
    `;
  }

  /**
   * A lightweight inline-SVG shower head + falling droplets — deliberately
   * simple geometry (no externally hosted image, per the visual-redesign
   * brief) so it stays cheap to animate and legible at small sizes. The
   * droplet animation is plain CSS (`.droplet` + `@keyframes shower-fall`
   * in `static styles`) and is disabled entirely under
   * `prefers-reduced-motion: reduce`.
   */
  private _showerIllustration(): TemplateResult {
    return html`
      <svg viewBox="0 0 120 100" class="shower-svg" focusable="false">
        <path
          d="M30 8 h40 a10 10 0 0 1 10 10 v4 a10 10 0 0 1 -10 10 h-40 a10 10 0 0 1 -10 -10 v-4 a10 10 0 0 1 10 -10 z"
          class="shower-head"
        />
        <circle cx="40" cy="36" r="1.6" class="shower-hole" />
        <circle cx="50" cy="36" r="1.6" class="shower-hole" />
        <circle cx="60" cy="36" r="1.6" class="shower-hole" />
        <circle cx="70" cy="36" r="1.6" class="shower-hole" />
        <circle cx="80" cy="36" r="1.6" class="shower-hole" />
        <line x1="40" y1="44" x2="34" y2="92" class="droplet" style="animation-delay:0ms" />
        <line x1="50" y1="44" x2="46" y2="92" class="droplet" style="animation-delay:180ms" />
        <line x1="60" y1="44" x2="60" y2="92" class="droplet" style="animation-delay:360ms" />
        <line x1="70" y1="44" x2="74" y2="92" class="droplet" style="animation-delay:120ms" />
        <line x1="80" y1="44" x2="86" y2="92" class="droplet" style="animation-delay:300ms" />
      </svg>
    `;
  }

  /**
   * Lower-panel "Airflow" card: current airflow with a semicircular SVG/CSS
   * gauge (no charting library, per the brief), target airflow, fan speed
   * (the existing supply/extract RPM pair — there's no separate
   * "percentage fan speed" role backed by any real entity, so this reuses
   * `FAN_ROLES` rather than inventing one), and mapped level. Rows only
   * render when their role is actually supported/configured.
   */
  private _systemAirflowCard(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    config: HiperMvhrCardConfig,
  ): TemplateResult {
    const airflowValue = snapshot.airflow ?? snapshot.supply_airflow;
    // Split into the bare number and its unit so the gauge can stack them
    // ("120" / "m³/h" on separate lines) rather than one run-on string
    // (visual-polish follow-up, round 2: "enlarge the value slightly...
    // instead of everything on one line").
    const airflowRole = airflowValue?.status === 'ok' ? airflowValue : undefined;
    const airflowNumberText = airflowRole ? airflowRole.value : null;
    const airflowUnitText = airflowRole?.unit ?? null;
    const airflowNumber = this._number(snapshot.airflow) ?? this._number(snapshot.supply_airflow);
    const targetNumber = this._number(snapshot.target_airflow);
    const fraction =
      airflowNumber !== undefined && targetNumber
        ? Math.max(0, Math.min(1, airflowNumber / targetNumber))
        : 0;
    // "Airflow cards brighten when airflow increases" — a one-shot
    // brightening, only when the reading genuinely went up from the
    // previous render (never on first load, and never on a decrease —
    // visual-polish follow-up, round 3).
    const airflowIncreased =
      airflowNumber !== undefined &&
      this._prevAirflowNumber !== undefined &&
      airflowNumber > this._prevAirflowNumber;
    this._prevAirflowNumber = airflowNumber ?? this._prevAirflowNumber;

    const rows: TemplateResult[] = [];
    if (config.show_fan_speeds && snapshot.supply_fan_speed && snapshot.extract_fan_speed) {
      rows.push(this._diagnosticRow('mdi:fan', 'Fan speed', this._pair(FAN_ROLES, snapshot, true)));
    }
    if (snapshot.mapped_level) {
      // "Mapped level" is an implementation detail (it names the internal
      // role that reconciles a manufacturer's raw speed value against the
      // profile's speed options) — shown to a homeowner as "Current
      // profile" instead, per the visual-polish follow-up. Same role, same
      // value, just a label a homeowner would actually recognise.
      rows.push(
        this._diagnosticRow('mdi:tune-variant', 'Current profile', this._value(snapshot.mapped_level, true)),
      );
    }
    if (snapshot.target_airflow) {
      rows.push(
        this._diagnosticRow('mdi:target', 'Target airflow', this._value(snapshot.target_airflow, true)),
      );
    }

    return html`
      <section class="lower-card airflow-card ${airflowIncreased ? 'airflow-brighten' : ''}" aria-label="Airflow">
        <h3>Airflow</h3>
        <div class="airflow-card-body">
          ${
            airflowValue
              ? this._airflowGauge(fraction, airflowNumberText, airflowUnitText)
              : ''
          }
          <div class="airflow-card-rows">${rows}</div>
        </div>
      </section>
    `;
  }

  /**
   * A semicircular gauge built from a single SVG stroked arc — no charting
   * library. `fraction` (0-1, already clamped by the caller) controls how
   * much of the arc is filled; the big central number/unit are the actual
   * formatted role value split apart (or "—"/nothing), never a synthesized
   * figure. Stacked on separate lines — "enlarge the value slightly...
   * instead of everything on one line" (visual-polish follow-up, round 2).
   */
  private _airflowGauge(
    fraction: number,
    valueText: string | null,
    unitText: string | null,
  ): TemplateResult {
    const radius = 40;
    const circumference = Math.PI * radius; // semicircle
    const offset = circumference * (1 - fraction);
    const ariaLabel = valueText
      ? `Current airflow ${valueText}${unitText ? ` ${unitText}` : ''}`
      : 'Current airflow unavailable';
    return html`
      <div class="gauge" role="img" aria-label=${ariaLabel}>
        <svg viewBox="0 0 100 56" class="gauge-svg">
          <path d="M10 50 A40 40 0 0 1 90 50" class="gauge-track" />
          <path
            d="M10 50 A40 40 0 0 1 90 50"
            class="gauge-fill"
            style=${`stroke-dasharray:${circumference};stroke-dashoffset:${offset}`}
          />
        </svg>
        <div class="gauge-value">
          <strong>${valueText ?? '—'}</strong>
          ${unitText ? html`<b class="gauge-unit">${unitText}</b>` : ''}
          <span>Current Airflow</span>
        </div>
      </div>
    `;
  }

  /**
   * Lower-panel "Temperatures" card: the same four temperature roles the
   * hero visual shows, in a clean aligned list (icons + values, per the
   * brief), plus the heat-recovery percentage.
   */
  private _systemTemperaturesCard(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    recovery: HeatRecoveryResult,
  ): TemplateResult {
    const rows = SYSTEM_TEMPERATURE_ROLES.map(([role, label]) => {
      const value = snapshot[role];
      return value ? this._diagnosticRow('mdi:thermometer', label, this._value(value, true)) : null;
    }).filter((row): row is TemplateResult => row !== null);

    return html`
      <section class="lower-card temperatures-card" aria-label="Temperatures">
        <h3>Temperatures</h3>
        <div class="status-list">
          ${rows}
          ${this._diagnosticRow('mdi:heat-wave', 'Heat recovery', recovery.label)}
        </div>
      </section>
    `;
  }

  /**
   * Lower-panel "System Status" card: boost state, override state, boost
   * remaining, filter status (if configured), and the same overall
   * System OK / Communication issue / Fault detected / Calibration required
   * status the header shows. Read-only by design — the interactive
   * override/calibration controls live in `_advancedDrawer`, not here.
   */
  private _systemStatusCard(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    config: HiperMvhrCardConfig,
  ): TemplateResult {
    const status = this._dashboardStatus(snapshot);
    const boostActive = this._state(snapshot.boost_active) === 'on';
    const hasBoostRole = [snapshot.boost_active, snapshot.boost_duration, snapshot.start_boost].some(
      (value) => value?.status === 'ok',
    );
    const overrideText =
      snapshot.override_duration?.status === 'ok'
        ? this._modeLabel(snapshot.override_duration.value)
        : null;
    // Gated on boost actually being on — otherwise an idle "0 min" reading
    // renders the prominent countdown callout even when boost isn't
    // running ("tone down the '0 min' box... only show the countdown while
    // boost is actually active", visual-polish follow-up round 2).
    const boostRemaining =
      boostActive && snapshot.boost_remaining?.status === 'ok'
        ? this._value(snapshot.boost_remaining)
        : null;
    const filterDays = this._number(snapshot.filter_remaining);
    const filterTone: AvailabilitySummary['tone'] =
      filterDays === undefined
        ? 'muted'
        : filterDays / config.filter_max_days <= 0.15
          ? 'warning'
          : 'success';

    const badges: TemplateResult[] = [];
    if (hasBoostRole) {
      badges.push(this._statusBadge(boostActive ? 'Boost Active' : 'Boost Ready', boostActive ? 'success' : 'muted'));
    }
    if (overrideText) {
      badges.push(this._statusBadge(`Override: ${overrideText}`, 'muted'));
    }
    if (config.show_filter && snapshot.filter_remaining) {
      badges.push(
        this._statusBadge(`Filter ${this._value(snapshot.filter_remaining, true)}`, filterTone),
      );
    }
    badges.push(this._statusBadge(status.label, status.tone));

    return html`
      <section class="lower-card system-status-card" aria-label="System status">
        <h3>System Status</h3>
        ${
          // "Make the boost remaining time more prominent" — a big countdown
          // callout above the badge row, rather than one more small row
          // buried among everything else, and only when there's an active
          // boost with a real remaining-time reading to show.
          boostRemaining
            ? html`
                <div class="boost-remaining-highlight" role="status">
                  <ha-icon icon="mdi:timer-sand" aria-hidden="true"></ha-icon>
                  <div>
                    <strong>${boostRemaining}</strong>
                    <span>Boost remaining</span>
                  </div>
                </div>
              `
            : ''
        }
        <div class="status-badge-row">${badges}</div>
      </section>
    `;
  }

  /**
   * A small coloured-dot status badge ("🟢 Boost Active", "🟡 Filter 12
   * days") in place of a label/value row — visual-polish follow-up. The dot
   * is decorative (`aria-hidden`) reinforcement only; the tone is never the
   * sole indicator since the text itself always states the state in words
   * (e.g. "Boost Active", not just a coloured dot).
   */
  private _statusBadge(label: string, tone: AvailabilitySummary['tone']): TemplateResult {
    return html`
      <span class="status-badge tone-${tone}">
        <span class="status-badge-dot" aria-hidden="true"></span>
        ${label}
      </span>
    `;
  }

  /**
   * Phase 10's collapsible "More controls" contents: override, calibration
   * internals, individual fan RPM diagnostics, and the bypass row on
   * profiles that support it — everything the redesigned primary view and
   * lower cards deliberately leave out so they don't dominate the main
   * dashboard. Collapsed by default (`_advancedOpen` starts `false`);
   * renders nothing until opened.
   */
  private _advancedDrawer(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    config: HiperMvhrCardConfig,
    hass: HomeAssistant,
  ): TemplateResult {
    if (!this._advancedOpen) {
      return html``;
    }

    const overrideEntity = config.entities.override_duration;
    const overrideOptions = this._selectOptions(snapshot.override_duration);
    const overrideRemaining =
      snapshot.override_remaining?.status === 'ok'
        ? this._value(snapshot.override_remaining)
        : null;
    const hasOverride = [snapshot.override_duration, snapshot.clear_override].some(
      (value) => value?.status === 'ok',
    );
    const durationEntity = config.entities.boost_duration;
    const boostActive = this._state(snapshot.boost_active) === 'on';
    const hasBoostDetail = [snapshot.boost_duration, snapshot.start_boost, snapshot.cancel_boost].some(
      (value) => value?.status === 'ok',
    );

    return html`
      <section class="advanced-drawer" id="mvhr-advanced-drawer" aria-label="Advanced diagnostics">
        ${
          hasBoostDetail
            ? html`
                <div class="control-block">
                  <div class="control-block-head">
                    <span>Boost duration</span>
                  </div>
                  <label class="field">
                    <span>Duration (minutes)</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      .value=${this._state(snapshot.boost_duration) ?? ''}
                      ?disabled=${!durationEntity}
                      aria-label="Boost duration"
                      @change=${(event: Event) => {
                        const value = Number((event.currentTarget as HTMLInputElement).value);
                        if (durationEntity && Number.isFinite(value)) {
                          void this._call(hass, 'number', 'set_value', {
                            entity_id: durationEntity,
                            value,
                          });
                        }
                      }}
                    />
                  </label>
                  <div class="button-row">
                    <button
                      type="button"
                      class="cta"
                      aria-label="Start Boost"
                      ?disabled=${boostActive || !config.entities.start_boost}
                      @click=${() => this._press(hass, config.entities.start_boost)}
                    >
                      Start Boost
                    </button>
                    <button
                      type="button"
                      class="cta ghost"
                      aria-label="Cancel Boost"
                      ?disabled=${!boostActive || !config.entities.cancel_boost}
                      @click=${() => this._press(hass, config.entities.cancel_boost)}
                    >
                      Cancel Boost
                    </button>
                  </div>
                </div>
              `
            : ''
        }
        ${
          hasOverride
            ? html`
                <div class="control-block">
                  <div class="control-block-head">
                    <span>Override</span>
                    <strong
                      >${
                        this._value(snapshot.override_duration) ?? 'Until next schedule change'
                      }</strong
                    >
                  </div>
                  ${overrideRemaining ? html`<small>${overrideRemaining} remaining</small>` : ''}
                  <label class="field">
                    <span>Duration</span>
                    <select
                      ?disabled=${!overrideEntity}
                      aria-label="Override duration"
                      @change=${(event: Event) => {
                        const option = (event.currentTarget as HTMLSelectElement).value;
                        if (overrideEntity) {
                          void this._call(hass, 'select', 'select_option', {
                            entity_id: overrideEntity,
                            option,
                          });
                        }
                      }}
                    >
                      ${overrideOptions.map(
                        (option) => html`
                          <option
                            .value=${option}
                            ?selected=${this._state(snapshot.override_duration) === option}
                          >
                            ${this._modeLabel(option)}
                          </option>
                        `,
                      )}
                    </select>
                  </label>
                  <button
                    type="button"
                    class="cta ghost full"
                    aria-label="Clear override"
                    ?disabled=${!config.entities.clear_override}
                    @click=${() => this._press(hass, config.entities.clear_override)}
                  >
                    Clear override
                  </button>
                </div>
              `
            : ''
        }
        ${this._advancedCompactStats(snapshot, config)}
        ${
          // Summer bypass is not part of the primary hero visual, lower
          // cards, or compact header controls in system mode for any
          // manufacturer (deliberately bypass-free, generically — not an
          // Altair-specific carve-out). It only ever appears here, and
          // only when the active profile actually declares it supported
          // (Zehnder/Aerofresh) — Altair's profile marks it unsupported, so
          // `_value` returns null and this omits the row entirely, exactly
          // like every other unsupported role (SPECIFICATION.md §6), with
          // no manufacturer conditional written here to make that happen.
          snapshot.bypass_state && snapshot.bypass_state.status !== 'unsupported'
            ? html`
                <div class="status-list">
                  ${this._diagnosticRow(
                    'mdi:valve',
                    'Summer bypass',
                    this._value(snapshot.bypass_state, true),
                  )}
                </div>
              `
            : ''
        }
        ${this._extraControls(snapshot, config, hass)}
      </section>
    `;
  }

  /**
   * Calibration status/progress and individual fan RPM, as a small grid of
   * compact label/value tiles rather than a full-width row each — "I don't
   * think these need an entire row... could all fit inside a small
   * expandable card" (visual-polish follow-up). Still just as gated on
   * `show_calibration`/`show_fan_speeds` and role availability as before;
   * only the presentation changed.
   */
  private _advancedCompactStats(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    config: HiperMvhrCardConfig,
  ): TemplateResult {
    const stats: TemplateResult[] = [];
    if (config.show_calibration) {
      stats.push(this._compactStat('Calibration', this._value(snapshot.calibration_status, true)));
      stats.push(this._compactStat('Progress', this._value(snapshot.calibration_progress, true)));
    }
    if (config.show_fan_speeds) {
      stats.push(this._compactStat('Supply fan', this._value(snapshot.supply_fan_speed, true)));
      stats.push(this._compactStat('Extract fan', this._value(snapshot.extract_fan_speed, true)));
    }
    if (stats.length === 0) {
      return html``;
    }
    return html`<div class="compact-stats-card">${stats}</div>`;
  }

  private _compactStat(label: string, value: string | null): TemplateResult {
    return html`
      <div class="compact-stat">
        <span>${label}</span>
        <strong>${value ?? '—'}</strong>
      </div>
    `;
  }

  private _diagnosticRow(icon: string, label: string, value: string | null): TemplateResult {
    return html`
      <div class="status-row">
        <ha-icon icon=${icon} aria-hidden="true"></ha-icon>
        <span class="status-label">${label}</span>
        <span class="status-value">${value ?? '—'}</span>
      </div>
    `;
  }

  /**
   * Phase 5-7 (system mode variant), enlarged and recoloured for the
   * visual-redesign brief: the same four-air-path-around-a-unit concept as
   * `_heroVisual`, but a distinct method — `display_mode: detailed` keeps
   * its own left/right (inbound-left/outbound-right) arrangement and colour
   * scheme untouched, while system mode uses the top/bottom
   * (outbound-top/inbound-bottom) arrangement its spec calls for: Exhaust
   * (top-left) and Supply (top-right) both flow away from the unit; Extract
   * (bottom-left) and Outdoor (bottom-right) both flow toward it. Each path
   * also gets a small directional arrow icon (redesign requirement:
   * "directional arrows", without relying on colour alone) and a colour
   * family scoped to `.system-visual-panel` only — supply/outdoor cool
   * blue, extract warm orange, exhaust neutral grey — that never touches
   * `_heroVisual`'s own `.supply`/`.extract`/etc. base colours. Per the
   * visual-polish follow-up, the heat-recovery figure now lives inside the
   * unit itself (a large circular badge centred over the exchanger graphic,
   * `.recovery-badge-circular`) rather than as a small pill in the panel
   * heading — "make the heat exchanger the hero" / "move the heat recovery
   * number into the centre of the HRV" — so this method takes a `recovery`
   * argument again. Per the round-3 micro-animation follow-up ("I wouldn't
   * make the exchanger itself any more complicated — instead spend time on
   * micro-animations"), `boostActive` doesn't add any new visual element:
   * it just shortens the existing particle/fan animation durations via a
   * `.boost-active` class, and the recovery badge plays a one-shot pulse
   * (`_recoveryPulseClass`) when the figure actually changes, tracked via
   * `_prevRecoveryLabel`.
   */
  private _systemHeroVisual(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    config: HiperMvhrCardConfig,
    animated: boolean,
    unitBrand: string,
    recovery: HeatRecoveryResult,
    boostActive: boolean,
  ): TemplateResult {
    const sharedAirflow =
      this._value(snapshot.airflow, true) ?? this._value(snapshot.supply_airflow, true);
    const showAllAirflows = config.show_airflow_on_all_paths;
    // "Heat recovery badge gently pulses when efficiency changes" — a
    // one-shot animation, not a permanently-looping one, so it only plays
    // when this render's figure actually differs from the previous one.
    // Comparing against `undefined` on the very first render would count
    // as "changed" and pulse immediately on load, which isn't a real
    // change — guarded against explicitly.
    const recoveryPulse =
      recovery.status === 'ok' &&
      this._prevRecoveryLabel !== undefined &&
      this._prevRecoveryLabel !== recovery.label;
    this._prevRecoveryLabel = recovery.status === 'ok' ? recovery.label : this._prevRecoveryLabel;

    const path = (
      key: string,
      label: string,
      role: EntityRoleId,
      showAirflowByDefault: boolean,
      endpointIcon: string,
      arrowIcon: string,
      arrowLabel: string,
    ) => {
      const airflow = showAllAirflows || showAirflowByDefault ? sharedAirflow : null;
      return html`
        <div class="air-path ${key} ${animated ? 'active' : ''} ${animated && boostActive ? 'boost-active' : ''}">
          <span class="path-label">
            <ha-icon icon=${endpointIcon} aria-hidden="true"></ha-icon>
            ${label}
            <ha-icon class="path-arrow" icon=${arrowIcon} aria-label=${arrowLabel}></ha-icon>
          </span>
          <span class="path-temp">${this._value(snapshot[role], true) ?? '—'}</span>
          ${
            airflow
              ? html`<span class="path-airflow"
                  ><ha-icon icon="mdi:weather-windy" aria-hidden="true"></ha-icon>${airflow}</span
                >`
              : ''
          }
        </div>
      `;
    };

    return html`
      <div class="visual-wrap system-visual-wrap">
        ${path(
          'exhaust',
          'Exhaust air',
          'exhaust_air_temp',
          false,
          'mdi:tree',
          'mdi:arrow-top-left-thin',
          'Flowing outdoors',
        )}
        ${path(
          'supply',
          'Supply air',
          'supply_air_temp',
          true,
          'mdi:home',
          'mdi:arrow-top-right-thin',
          'Flowing into the home',
        )}
        <div
          class="unit ${animated ? 'active' : ''} ${animated && boostActive ? 'boost-active' : ''}"
          aria-label="Heat recovery unit"
        >
          <div class="brand">
            ${unitBrand}${unitBrand.toLowerCase().includes('mvhr') ? '' : html`<br /><span>MVHR</span>`}
          </div>
          <div class="duct duct-top" aria-hidden="true"></div>
          <div class="duct duct-bottom" aria-hidden="true"></div>
          <div class="duct duct-left" aria-hidden="true"></div>
          <div class="duct duct-right" aria-hidden="true"></div>
          <div class="exchanger" aria-hidden="true"></div>
          <ha-icon class="fan fan-a" icon="mdi:fan" aria-hidden="true"></ha-icon>
          <ha-icon class="fan fan-b" icon="mdi:fan" aria-hidden="true"></ha-icon>
          ${
            recovery.status === 'ok'
              ? html`
                  <div
                    class="recovery-badge-circular ${recoveryPulse ? 'recovery-pulse' : ''}"
                    title="Apparent temperature recovery"
                    role="img"
                    aria-label=${`Heat recovery ${recovery.label}`}
                  >
                    <strong>${recovery.label}</strong>
                    <span>Heat Recovery</span>
                  </div>
                `
              : ''
          }
        </div>
        ${path(
          'extract',
          'Extract air',
          'extract_air_temp',
          true,
          'mdi:home',
          'mdi:arrow-bottom-left-thin',
          'Drawn from the home',
        )}
        ${path(
          'outdoor',
          'Outdoor air',
          'outdoor_air_temp',
          false,
          'mdi:tree',
          'mdi:arrow-bottom-right-thin',
          'Drawn from outdoors',
        )}
      </div>
    `;
  }

  private _infoTile(
    label: string,
    value: string,
    icon: string,
    status: HeatRecoveryResult['status'] | 'ok' = 'ok',
    tooltip?: string,
  ): TemplateResult {
    return html`
      <div class="info-tile tone-${status}" title=${tooltip ?? nothing}>
        <ha-icon icon=${icon} aria-hidden="true"></ha-icon>
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `;
  }

  private _filterTile(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    config: HiperMvhrCardConfig,
  ): TemplateResult {
    const days = this._number(snapshot.filter_remaining);
    const percent =
      days === undefined ? 0 : Math.max(0, Math.min(100, (days / config.filter_max_days) * 100));
    const label = days === undefined ? '—' : `${Math.round(days)} days`;
    return html`
      <div class="info-tile">
        <ha-icon icon="mdi:air-filter" aria-hidden="true"></ha-icon>
        <span>Filter</span>
        <strong>${label}</strong>
        <div class="bar" aria-hidden="true"><span style=${`width:${percent}%`}></span></div>
      </div>
    `;
  }

  private _heatRecovery(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    method: HiperMvhrCardConfig['heat_recovery_method'],
  ): HeatRecoveryResult {
    return calculateHeatRecovery({
      outdoor: this._number(snapshot.outdoor_air_temp),
      extract: this._number(snapshot.extract_air_temp),
      supply: this._number(snapshot.supply_air_temp),
      method,
    });
  }

  private _pair(
    roles: Array<[EntityRoleId, string]>,
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    detailed = false,
  ): string {
    return roles
      .map(
        ([role, label]) =>
          `${label.replace(' fan', '')}: ${this._value(snapshot[role], detailed) ?? '—'}`,
      )
      .join(' · ');
  }

  private _value(value: RoleValue | undefined, detailed = false): string | null {
    if (!value) {
      return null;
    }
    const presentation = this._present(value, detailed);
    return presentation?.text ?? null;
  }

  private _text(value: RoleValue | undefined): string {
    return this._value(value) ?? '';
  }

  private _state(value: RoleValue | undefined): string | undefined {
    return value?.status === 'ok' ? value.value : undefined;
  }

  private _number(value: RoleValue | undefined): number | undefined {
    return value?.status === 'ok' ? value.numericValue : undefined;
  }

  private _modeLabel(value: string): string {
    const normalized = value.toLowerCase();
    if (normalized === 'medium' || normalized === 'normal') {
      return 'Home';
    }
    if (normalized === 'boost') {
      return 'Boost';
    }
    return value ? capitalize(value) : '';
  }

  private _modeOptions(value: RoleValue | undefined): string[] {
    const options =
      value?.status === 'ok' && Array.isArray(value.attributes.options)
        ? value.attributes.options.filter((option): option is string => typeof option === 'string')
        : ['Away', 'Low', 'Home', 'High'];
    return options.filter((option) => option.toLowerCase() !== 'boost');
  }

  private _selectOptions(value: RoleValue | undefined): string[] {
    return value?.status === 'ok' && Array.isArray(value.attributes.options)
      ? value.attributes.options.filter((option): option is string => typeof option === 'string')
      : [];
  }

  private _hasControls(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    config: HiperMvhrCardConfig,
  ): boolean {
    return [
      snapshot.mode,
      snapshot.boost_duration,
      snapshot.start_boost,
      snapshot.cancel_boost,
      snapshot.override_duration,
      snapshot.clear_override,
    ].some((value) => value?.status === 'ok' && Boolean(config.entities));
  }

  /**
   * Phase 10's bottom status strip signal. "Communication issue" takes
   * priority over everything else: a required role that's mapped but
   * unreachable (entity missing or unavailable) is the most actionable
   * problem. A configured, active fault entity is next, then calibration
   * state, falling back to "System OK". Optional roles that simply aren't
   * configured never factor in here — same rule as the header (Phase 4/10).
   */
  private _dashboardStatus(snapshot: Partial<Record<EntityRoleId, RoleValue>>): DashboardStatus {
    for (const role of ENTITY_ROLES) {
      if (OPTIONAL_AVAILABILITY_ROLE_SET.has(role)) {
        continue;
      }
      const value = snapshot[role];
      if (value?.status === 'entity_missing' || value?.status === 'unavailable') {
        return { tone: 'warning', label: 'Communication issue' };
      }
    }

    const fault = snapshot.fault_active;
    if (fault?.status === 'ok' && FAULT_ACTIVE_STATES.has(fault.value.toLowerCase())) {
      return { tone: 'warning', label: 'Fault detected' };
    }

    const calibrationStatus =
      snapshot.calibration_status?.status === 'ok'
        ? snapshot.calibration_status.value.toLowerCase()
        : '';
    if (calibrationStatus && !CALIBRATION_QUIET_STATES.has(calibrationStatus)) {
      return { tone: 'muted', label: 'Calibrating…' };
    }
    if (
      snapshot.calibration_result?.status === 'ok' &&
      snapshot.calibration_result.value === 'not_calibrated'
    ) {
      return { tone: 'warning', label: 'Calibration required' };
    }

    return { tone: 'success', label: 'System OK' };
  }

  private _press(hass: HomeAssistant, entityId: string | undefined): void {
    if (!entityId) {
      return;
    }
    void this._call(hass, 'button', 'press', { entity_id: entityId });
  }

  private async _call(
    hass: HomeAssistant,
    domain: string,
    service: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await hass.callService?.(domain, service, data);
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    ha-card {
      width: 100%;
      max-width: none;
      box-sizing: border-box;
      overflow: hidden;
    }

    .header {
      padding: 16px 16px 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .header-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .header-title-group {
      display: flex;
      align-items: center;
      gap: 9px;
      flex-wrap: wrap;
      min-width: 0;
    }
    .title {
      margin: 0;
      font-size: 1.3em;
      font-weight: 700;
      color: var(--primary-text-color);
    }
    .status-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      flex-shrink: 0;
      background: var(--secondary-text-color);
    }
    .status-dot.dot-success {
      background: var(--success-color);
    }
    .status-dot.dot-warning {
      background: var(--warning-color);
    }
    .status-dot.dot-muted {
      background: var(--secondary-text-color);
    }
    .mode-pill {
      font-size: 0.78em;
      font-weight: 700;
      padding: 3px 11px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--primary-color), transparent 85%);
      color: var(--primary-color);
      white-space: nowrap;
    }
    .subheader {
      color: var(--secondary-text-color);
      font-size: 0.9em;
    }
    .availability {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.85em;
    }
    .availability ha-icon {
      --mdc-icon-size: 16px;
    }
    /* Tone classes are scoped to .availability explicitly — metric/status
       rows below reuse the same tone-* class names but only ever color
       their .metric-value/.status-value text, never the label or icon,
       so labels stay legible and consistent regardless of tone. */
    .availability.tone-success {
      color: var(--success-color);
    }
    .availability.tone-warning {
      color: var(--warning-color);
    }
    .availability.tone-muted {
      color: var(--secondary-text-color);
    }

    /* ---- display_mode: homeowner — legacy compact content ---- */
    .content {
      padding: 0 16px 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* ---- display_mode: detailed — unified dashboard (Phase 2-3 rebuild) ---- */
    .mvhr-dashboard {
      width: 100%;
      box-sizing: border-box;
      padding: 4px 16px 16px;
      display: grid;
      grid-template-columns: minmax(0, 7fr) minmax(240px, 3fr);
      grid-template-areas:
        'visual controls'
        'metrics metrics'
        'status status'
        'extra extra';
      gap: 16px;
      align-items: start;
    }
    .mvhr-dashboard.no-controls {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas:
        'visual'
        'metrics'
        'status'
        'extra';
    }
    .visual-panel {
      grid-area: visual;
      min-width: 0;
      box-sizing: border-box;
      border: 1px solid var(--divider-color);
      border-radius: 16px;
      background:
        linear-gradient(145deg, rgba(40, 90, 130, 0.14), transparent),
        var(--ha-card-background, var(--card-background-color));
      padding: 18px;
    }
    .controls-panel {
      grid-area: controls;
      min-width: 0;
      box-sizing: border-box;
      border: 1px solid var(--divider-color);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: color-mix(
        in srgb,
        var(--ha-card-background, var(--card-background-color)),
        var(--primary-color) 4%
      );
    }
    .extra-controls {
      grid-area: extra;
    }

    .visual-wrap {
      min-height: 340px;
      display: grid;
      grid-template-columns: minmax(190px, 1fr) minmax(260px, 340px) minmax(190px, 1fr);
      grid-template-rows: 1fr 1fr;
      gap: 16px;
      align-items: center;
      width: 100%;
      box-sizing: border-box;
    }
    .unit {
      grid-column: 2;
      grid-row: 1 / span 2;
      width: 100%;
      min-height: 220px;
      border-radius: 22px;
      border: 1px solid var(--divider-color);
      background: linear-gradient(155deg, rgba(255, 255, 255, 0.18), rgba(128, 128, 128, 0.08));
      display: grid;
      place-items: center;
      position: relative;
      overflow: hidden;
      color: var(--primary-text-color);
      box-shadow:
        inset 0 0 0 1px rgba(255, 255, 255, 0.08),
        0 8px 22px rgba(0, 0, 0, 0.1);
    }
    .brand {
      position: absolute;
      top: 16px;
      left: 18px;
      font-weight: 800;
      line-height: 1.05;
      z-index: 2;
    }
    .brand span {
      color: var(--secondary-text-color);
      font-size: 0.72em;
      font-weight: 600;
      letter-spacing: 0.06em;
    }
    .exchanger {
      width: 84px;
      height: 84px;
      transform: rotate(45deg);
      border: 2px solid var(--primary-color);
      background:
        linear-gradient(90deg, transparent 45%, var(--divider-color) 45% 55%, transparent 55%),
        linear-gradient(0deg, transparent 45%, var(--divider-color) 45% 55%, transparent 55%);
      opacity: 0.8;
    }
    .fan {
      position: absolute;
      color: var(--secondary-text-color);
      font-size: 26px;
      z-index: 1;
    }
    .fan-a {
      right: 26px;
      top: 40px;
    }
    .fan-b {
      left: 28px;
      bottom: 40px;
    }
    .duct {
      position: absolute;
      background: color-mix(in srgb, var(--divider-color), transparent 5%);
      z-index: 1;
    }
    .duct-top {
      top: -1px;
      left: 50%;
      transform: translateX(-50%);
      width: 40px;
      height: 10px;
      border-radius: 4px 4px 0 0;
    }
    .duct-bottom {
      bottom: -1px;
      left: 50%;
      transform: translateX(-50%);
      width: 40px;
      height: 10px;
      border-radius: 0 0 4px 4px;
    }
    .duct-left {
      left: -1px;
      top: 50%;
      transform: translateY(-50%);
      width: 10px;
      height: 40px;
      border-radius: 4px 0 0 4px;
    }
    .duct-right {
      right: -1px;
      top: 50%;
      transform: translateY(-50%);
      width: 10px;
      height: 40px;
      border-radius: 0 4px 4px 0;
    }
    .recovery-badge {
      position: absolute;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 6px 16px;
      border-radius: 10px;
      background: color-mix(
        in srgb,
        var(--ha-card-background, var(--card-background-color)),
        transparent 8%
      );
      border: 1px solid var(--divider-color);
      text-align: center;
      z-index: 2;
      cursor: default;
    }
    .recovery-label {
      font-size: 0.66em;
      color: var(--secondary-text-color);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .recovery-value {
      font-size: 1.35em;
      font-weight: 800;
      color: var(--success-color);
    }
    .air-path {
      border-radius: 14px;
      padding: 14px;
      min-height: 92px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
      border: 1px solid color-mix(in srgb, var(--divider-color), transparent 20%);
      position: relative;
      overflow: hidden;
    }
    .air-path::after {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        90deg,
        transparent 0 16px,
        rgba(255, 255, 255, 0.18) 16px 20px
      );
      opacity: 0.18;
      transform: translateX(-20px);
    }
    .air-path.active::after {
      animation: flow 1.8s linear infinite;
    }
    .extract {
      background: color-mix(in srgb, var(--error-color), transparent 82%);
    }
    .exhaust {
      background: color-mix(in srgb, #ff9800, transparent 84%);
    }
    .outdoor {
      background: color-mix(in srgb, #009688, transparent 84%);
    }
    .supply {
      background: color-mix(in srgb, var(--primary-color), transparent 84%);
    }
    .path-label,
    .path-airflow {
      color: var(--secondary-text-color);
      font-size: 0.82em;
      z-index: 1;
    }
    .path-temp {
      color: var(--primary-text-color);
      font-size: 1.35em;
      font-weight: 700;
      z-index: 1;
    }

    .panel-heading {
      font-weight: 700;
      color: var(--primary-text-color);
    }
    .control-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .control-group-label {
      font-size: 0.76em;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--secondary-text-color);
    }
    .mode-buttons {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(64px, 1fr));
      gap: 8px;
    }
    .button-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .chip,
    .controls-panel button {
      font: inherit;
      font-size: 0.92em;
      border: 1px solid var(--divider-color);
      border-radius: 999px;
      background: var(--ha-card-background, var(--card-background-color));
      color: var(--primary-text-color);
      padding: 10px 14px;
      min-height: 44px;
      box-sizing: border-box;
      cursor: pointer;
    }
    .chip {
      font-weight: 700;
      text-align: center;
    }
    .chip.active {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      border-color: var(--primary-color);
    }
    .cta {
      flex: 1;
      font-weight: 700;
      min-width: 120px;
    }
    .cta.ghost {
      background: none;
    }
    .cta.full {
      width: 100%;
      flex: none;
    }
    .chip:focus-visible,
    .controls-panel button:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .chip:disabled,
    .controls-panel button:disabled {
      cursor: default;
      color: var(--secondary-text-color);
      opacity: 0.6;
    }
    .control-block {
      display: grid;
      gap: 6px;
      color: var(--primary-text-color);
      padding-top: 10px;
      border-top: 1px solid var(--divider-color);
    }
    .control-block-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .control-block small {
      color: var(--secondary-text-color);
    }
    .state-pill {
      font-size: 0.78em;
      font-weight: 700;
      padding: 2px 10px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--divider-color), transparent 20%);
      color: var(--secondary-text-color);
    }
    .state-pill.is-active {
      background: color-mix(in srgb, var(--success-color), transparent 78%);
      color: var(--success-color);
    }
    .field {
      display: grid;
      gap: 4px;
      color: var(--secondary-text-color);
      font-size: 0.78em;
    }
    .field input,
    .field select {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      background: var(--ha-card-background, var(--card-background-color));
      color: var(--primary-text-color);
      padding: 10px 9px;
      min-height: 44px;
      font: inherit;
      font-size: 1.05em;
    }
    .field input:focus-visible,
    .field select:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .field input:disabled,
    .field select:disabled {
      opacity: 0.6;
    }

    .metrics-grid {
      grid-area: metrics;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      width: 100%;
      box-sizing: border-box;
    }
    .info-tile {
      border: 1px solid var(--divider-color);
      border-radius: 12px;
      padding: 12px;
      display: grid;
      gap: 4px;
      color: var(--primary-text-color);
      min-width: 0;
      box-sizing: border-box;
    }
    .info-tile ha-icon {
      color: var(--primary-color);
    }
    .info-tile span {
      color: var(--secondary-text-color);
      font-size: 0.78em;
    }
    .info-tile strong {
      font-size: 1.1em;
      word-break: break-word;
    }
    .info-tile.tone-unavailable strong,
    .info-tile.tone-not_applicable strong,
    .info-tile.tone-calculating strong {
      color: var(--secondary-text-color);
    }
    .bar {
      height: 5px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--divider-color), transparent 20%);
      overflow: hidden;
    }
    .bar span {
      display: block;
      height: 100%;
      background: var(--success-color);
    }

    .status-strip {
      grid-area: status;
      border-top: 1px solid var(--divider-color);
      padding-top: 12px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px 20px;
      color: var(--secondary-text-color);
      font-size: 0.88em;
    }
    .status-chip {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
      color: var(--primary-text-color);
    }
    .status-chip ha-icon {
      --mdc-icon-size: 18px;
    }
    .status-strip.tone-success .status-chip {
      color: var(--success-color);
    }
    .status-strip.tone-warning .status-chip {
      color: var(--warning-color);
    }
    .status-strip.tone-muted .status-chip {
      color: var(--secondary-text-color);
    }

    @keyframes flow {
      to {
        transform: translateX(20px);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .air-path.active::after,
      .unit.active .fan,
      .system-visual-panel .exhaust.active::after,
      .system-visual-panel .outdoor.active::after,
      .system-visual-panel .supply.active::after,
      .system-visual-panel .extract.active::after,
      .system-visual-panel .unit.active .fan,
      .system-visual-panel .unit.active .duct-top::after,
      .system-visual-panel .unit.active .duct-right::after,
      .system-visual-panel .unit.active .duct-bottom::after,
      .system-visual-panel .unit.active .duct-left::after,
      .recovery-badge-circular.recovery-pulse,
      .airflow-card.airflow-brighten,
      .droplet {
        animation: none;
      }
      /* The droplets still shouldn't render as solid opaque lines once their
         animation is disabled — hide them outright rather than leave a
         static streak, since opacity:0 -> opacity:0.9 was entirely what the
         animation provided. */
      .droplet {
        opacity: 0.35;
      }
      /* Same reasoning for the duct particles: a static dot pattern reads
         as decoration, not motion, so just leave them off rather than
         freeze mid-animation. */
      .system-visual-panel .unit.active .duct-top::after,
      .system-visual-panel .unit.active .duct-right::after,
      .system-visual-panel .unit.active .duct-bottom::after,
      .system-visual-panel .unit.active .duct-left::after {
        opacity: 0;
      }
    }

    section h3 {
      margin: 0 0 8px;
      font-size: 0.8em;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--secondary-text-color);
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
      gap: 12px;
    }
    .metric {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .metric-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .metric-label {
      font-size: 0.8em;
      color: var(--secondary-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .metric-value {
      font-size: 1em;
      color: var(--primary-text-color);
      word-break: break-word;
    }
    .metric.tone-muted .metric-value {
      color: var(--secondary-text-color);
    }
    .metric.tone-warning .metric-value {
      color: var(--warning-color);
    }

    .status-list {
      display: flex;
      flex-direction: column;
    }
    .status-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      border-bottom: 1px solid var(--divider-color);
      font-size: 0.95em;
      color: var(--primary-text-color);
    }
    .status-row:last-child {
      border-bottom: none;
    }
    .status-label {
      flex: 1;
      min-width: 0;
    }
    .status-value {
      text-align: right;
      word-break: break-word;
      max-width: 60%;
    }
    .status-row.tone-muted .status-value {
      color: var(--secondary-text-color);
    }
    .status-row.tone-warning .status-value {
      color: var(--warning-color);
    }
    /* Used only by an action row's own error state (e.g. filter reset
       failed) — the row itself carries no overall tone, unlike the
       value-role rows above, so this is scoped to the value span directly. */
    .status-value.tone-warning {
      color: var(--warning-color);
      font-size: 0.85em;
    }

    /* System Status card badges (visual-polish follow-up): "🟢 Boost
       Active / 🟢 System OK / 🟡 Filter 352 days" instead of label/value
       rows. Colour is always paired with the state spelled out in words, so
       the dot is decorative reinforcement, never the only signal. */
    .status-badge-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85em;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid var(--divider-color);
      color: var(--primary-text-color);
      background: var(--ha-card-background, var(--card-background-color));
    }
    .status-badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--secondary-text-color);
      flex-shrink: 0;
    }
    .status-badge.tone-success {
      border-color: color-mix(in srgb, var(--success-color), transparent 55%);
      background: color-mix(in srgb, var(--success-color), transparent 88%);
    }
    .status-badge.tone-success .status-badge-dot {
      background: var(--success-color);
    }
    .status-badge.tone-warning {
      border-color: color-mix(in srgb, var(--warning-color), transparent 55%);
      background: color-mix(in srgb, var(--warning-color), transparent 88%);
    }
    .status-badge.tone-warning .status-badge-dot {
      background: var(--warning-color);
    }
    .status-badge.tone-muted .status-badge-dot {
      background: var(--secondary-text-color);
    }

    /* The boost-remaining countdown gets its own prominent callout above
       the badge row instead of being one more small line — "make the boost
       remaining time more prominent" — since it's a live, time-sensitive
       value someone glancing at the card is likely looking for. */
    .boost-remaining-highlight {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      margin-bottom: 12px;
      border-radius: 12px;
      border: 1px solid color-mix(in srgb, var(--success-color), transparent 55%);
      background: color-mix(in srgb, var(--success-color), transparent 90%);
    }
    .boost-remaining-highlight ha-icon {
      --mdc-icon-size: 26px;
      color: var(--success-color);
      flex-shrink: 0;
    }
    .boost-remaining-highlight strong {
      display: block;
      font-size: 1.5em;
      font-weight: 800;
      color: var(--success-color);
      line-height: 1.1;
    }
    .boost-remaining-highlight span {
      font-size: 0.78em;
      color: var(--secondary-text-color);
    }

    .control-button {
      font: inherit;
      font-size: 0.85em;
      color: var(--primary-color);
      background: none;
      border: 1px solid var(--primary-color);
      border-radius: 4px;
      padding: 4px 10px;
      cursor: pointer;
      flex-shrink: 0;
    }
    .control-button:disabled {
      color: var(--secondary-text-color);
      border-color: var(--divider-color);
      cursor: default;
    }
    .control-button:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }

    .error {
      padding: 16px;
      color: var(--error-color);
    }

    /* ---- display_mode: system — flagship full-width visual panel (visual
       redesign: a full-width shower banner + System Overview hero, three
       lower information cards, compact header controls). Every colour here
       is a plain CSS variable or a color-mix() tint against the current
       theme's own card background — nothing is a hard-coded dark surface,
       so this stays legible in a light Home Assistant theme and simply
       reads darker automatically under a dark one. ---- */
    .mvhr-system {
      width: 100%;
      box-sizing: border-box;
      padding: 4px 16px 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      /* Scoped to system mode only — the shower banner's one deliberately
         fixed brand accent, chosen so it never gets confused with the
         success/warning/primary tones the rest of the card already uses. */
      --shower-color: #a855f7;
      /* Lets the @container rules below react to the card's own rendered
         width instead of the browser viewport — see the comment above
         those rules for why that distinction matters on a real Home
         Assistant dashboard. */
      container-type: inline-size;
    }
    /* System Overview's own wrapper — always full width. "Let the System
       Overview dominate the page" (visual-polish follow-up, round 2): the
       shower banner moved above it and the header pill replaced the old
       side-column layout, so there's no longer a competing column here at
       all, on any screen size. */
    .system-main {
      display: block;
    }
    /* A Home Assistant dashboard routinely gives a card far less width than
       the browser viewport (masonry/sidebar columns, grid sections, etc.),
       so a plain @media breakpoint can stay stuck on the wide desktop
       layout — even though the card itself is genuinely narrow, which is
       what an earlier layout bug in this card turned out to be. These
       @container rules duplicate (never replace) the equivalent @media
       rules further down using the card's own width instead, so the layout
       reflows correctly regardless of where Lovelace decides to place it.
       Where a browser doesn't support container queries yet, the @media
       rules remain as the fallback. */
    @container (max-width: 640px) {
      .system-lower-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .shower-active {
        flex-direction: column;
        align-items: stretch;
        text-align: left;
      }
    }
    @container (max-width: 420px) {
      .system-lower-grid {
        grid-template-columns: minmax(0, 1fr);
      }
      .header-controls {
        width: 100%;
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
      }
      .header-control {
        width: 100%;
      }
      .mode-select-pill,
      .boost-pill-button,
      .shower-pill {
        width: 100%;
        justify-content: center;
      }
      .airflow-card-body {
        flex-direction: column;
        align-items: stretch;
      }
      .gauge {
        width: 100%;
        max-width: 260px;
        margin: 0 auto;
      }
    }
    .panel-heading-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 12px;
    }
    .panel-heading-row h3,
    .lower-card h3 {
      margin: 0;
      font-size: 1em;
      font-weight: 700;
      color: var(--primary-text-color);
    }
    .recovery-pill {
      font-size: 0.82em;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--success-color), transparent 85%);
      color: var(--success-color);
      white-space: nowrap;
    }
    .system-visual-panel {
      min-width: 0;
    }
    /* "Let the System Overview dominate the page" (visual-polish follow-up,
       round 2) — with the shower panel now a header pill/full-width banner
       instead of a competing side column, Overview always gets the full
       card width, so it's sized considerably larger again here. */
    .system-visual-wrap {
      min-height: 560px;
      grid-template-columns: minmax(180px, 1fr) minmax(320px, 480px) minmax(180px, 1fr);
    }
    .system-visual-panel .unit {
      min-height: 480px;
      border-radius: 32px;
    }
    .system-visual-panel .fan {
      --mdc-icon-size: 48px;
    }
    .system-visual-panel .exchanger {
      width: 150px;
      height: 150px;
    }
    /* Colour the duct stubs on the unit itself so the exchanger graphic
       reads as "the hero" even before the surrounding air-path panels are
       scanned — outgoing (top/right, toward supply/exhaust) picks up the
       same cool-blue family as the supply path; incoming (bottom/left,
       toward extract/outdoor) picks up the warm-orange extract family.
       Never the only indicator of direction — the arrow icons and labels
       on each .air-path already carry that meaning; this is reinforcement
       on the unit graphic itself. */
    .system-visual-panel .duct-top,
    .system-visual-panel .duct-right {
      background: color-mix(in srgb, #3b82f6, transparent 35%);
    }
    .system-visual-panel .duct-bottom,
    .system-visual-panel .duct-left {
      background: color-mix(in srgb, #f59e0b, transparent 35%);
    }
    /* The heat-recovery figure, centred over the exchanger graphic — "make
       the heat exchanger the hero" / "move the heat recovery number into
       the centre of the HRV" (visual-polish follow-up). A plain circle so
       it reads instantly at a glance, success-toned since it only renders
       when the calculation is actually valid (recovery.status === 'ok';
       see _heatRecovery/calculateHeatRecovery). */
    .recovery-badge-circular {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 3;
      width: 132px;
      height: 132px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      text-align: center;
      background: color-mix(in srgb, var(--ha-card-background, var(--card-background-color)), transparent 4%);
      border: 3px solid color-mix(in srgb, var(--success-color), transparent 25%);
      box-shadow: 0 0 0 6px color-mix(in srgb, var(--success-color), transparent 90%);
      cursor: default;
    }
    .recovery-badge-circular strong {
      font-size: 1.9em;
      font-weight: 800;
      color: var(--success-color);
      line-height: 1.1;
    }
    .recovery-badge-circular span {
      font-size: 0.68em;
      font-weight: 700;
      color: var(--secondary-text-color);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    /* "Heat recovery badge gently pulses when efficiency changes" — a
       single, subtle scale pulse, not a loop (visual-polish follow-up,
       round 3). Only ever applied for one render, the instant the figure
       actually changes (see _systemHeroVisual's recoveryPulse), so it
       naturally plays once and stops rather than needing to be removed. */
    .recovery-badge-circular.recovery-pulse {
      animation: recovery-pulse 0.7s ease-out;
    }
    @keyframes recovery-pulse {
      0% {
        transform: translate(-50%, -50%) scale(1);
      }
      35% {
        transform: translate(-50%, -50%) scale(1.08);
        box-shadow: 0 0 0 10px color-mix(in srgb, var(--success-color), transparent 82%);
      }
      100% {
        transform: translate(-50%, -50%) scale(1);
      }
    }
    .system-visual-panel .path-label {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .system-visual-panel .path-label ha-icon,
    .system-visual-panel .path-airflow ha-icon {
      --mdc-icon-size: 15px;
    }
    /* Directional arrow icon per path (visual redesign — "directional
       arrows", never relying on colour alone). Pushed to the end of the
       label row. */
    .path-arrow {
      --mdc-icon-size: 14px;
      margin-left: auto;
      opacity: 0.8;
    }
    /* Redesign colour families, scoped to .system-visual-panel only so
       _heroVisual's own .supply/.extract/.outdoor/.exhaust colours
       (detailed mode) are completely untouched: supply/outdoor read as a
       cool blue family, extract as a warm orange family, exhaust as a
       neutral grey family. Labels/icons still carry the meaning too, never
       colour alone. */
    .system-visual-panel .air-path.supply,
    .system-visual-panel .air-path.outdoor {
      background: color-mix(in srgb, #3b82f6, transparent 84%);
      border-color: color-mix(in srgb, #3b82f6, transparent 55%);
    }
    .system-visual-panel .air-path.extract {
      background: color-mix(in srgb, #f59e0b, transparent 84%);
      border-color: color-mix(in srgb, #f59e0b, transparent 55%);
    }
    .system-visual-panel .air-path.exhaust {
      background: color-mix(in srgb, var(--secondary-text-color), transparent 84%);
      border-color: color-mix(in srgb, var(--secondary-text-color), transparent 55%);
    }
    /* Direction-aware duct animation for system mode's top/bottom
       arrangement (Phase 6/7): Exhaust (top-left) and Supply (top-right)
       both flow away from the unit; Extract (bottom-left) and Outdoor
       (bottom-right) both flow toward it. The detailed-mode hero visual's
       own single "flow" keyframe is untouched — these selectors only match
       elements inside .system-visual-panel. */
    .system-visual-panel .exhaust.active::after {
      animation: flow-left 1.8s linear infinite;
    }
    .system-visual-panel .outdoor.active::after {
      animation: flow-left 1.8s linear infinite;
    }
    .system-visual-panel .supply.active::after {
      animation: flow-right 1.8s linear infinite;
    }
    .system-visual-panel .extract.active::after {
      animation: flow-right 1.8s linear infinite;
    }
    .system-visual-panel .unit.active .fan {
      animation: spin 6s linear infinite;
    }
    /* "Moving particles" instead of a plain translating stripe — a row of
       small dots drifting through each air-path panel (visual-polish
       follow-up, round 2: "make the exchanger look more alive"). Reuses the
       exact same flow-left/flow-right keyframes and active/reduced-motion
       gating already in place above; only the dot pattern is new, and it's
       scoped to .system-visual-panel so display_mode: detailed's own
       striped .air-path::after is untouched. */
    .system-visual-panel .air-path::after {
      background: radial-gradient(circle, rgba(255, 255, 255, 0.85) 1.6px, transparent 1.8px);
      background-size: 20px 20px;
      background-repeat: repeat;
      opacity: 0.4;
    }
    /* A few small droplets travelling along each duct stub on the unit
       itself, so motion is visible right at the exchanger, not just out in
       the surrounding panels — same gating as the fans (.unit.active) and
       same reduced-motion rule as everything else in this panel. */
    .system-visual-panel .duct {
      overflow: hidden;
    }
    .system-visual-panel .duct::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.9) 1.4px, transparent 1.6px);
      background-size: 9px 9px;
      opacity: 0;
    }
    .system-visual-panel .unit.active .duct-top::after,
    .system-visual-panel .unit.active .duct-right::after {
      opacity: 0.9;
      animation: duct-particles-out 1s linear infinite;
    }
    .system-visual-panel .unit.active .duct-bottom::after,
    .system-visual-panel .unit.active .duct-left::after {
      opacity: 0.9;
      animation: duct-particles-in 1s linear infinite;
    }
    @keyframes duct-particles-out {
      to {
        background-position: 18px 0;
      }
    }
    @keyframes duct-particles-in {
      to {
        background-position: -18px 0;
      }
    }
    /* "Particles accelerate slightly during Boost" and the fans spin a
       little faster with them — a real boost mode raises fan speed
       noticeably, so this reinforces that state through the animations
       that already exist rather than adding anything new to the exchanger
       graphic (visual-polish follow-up, round 3). Same elements, same
       keyframes, just a shorter duration — .boost-active is only ever
       applied alongside .active, so this never overrides a stopped
       animation into a running one. */
    .system-visual-panel .exhaust.active.boost-active::after,
    .system-visual-panel .outdoor.active.boost-active::after {
      animation-duration: 1s;
    }
    .system-visual-panel .supply.active.boost-active::after,
    .system-visual-panel .extract.active.boost-active::after {
      animation-duration: 1s;
    }
    .system-visual-panel .unit.active.boost-active .fan {
      animation-duration: 3.5s;
    }
    .system-visual-panel .unit.active.boost-active .duct-top::after,
    .system-visual-panel .unit.active.boost-active .duct-right::after,
    .system-visual-panel .unit.active.boost-active .duct-bottom::after,
    .system-visual-panel .unit.active.boost-active .duct-left::after {
      animation-duration: 0.6s;
    }

    /* ---- shower-detection banner (full-width, active only — the idle
       state is the header's .shower-pill instead, see above) ---- */
    .shower-panel {
      border-radius: 16px;
      padding: 16px;
      box-sizing: border-box;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    /* A horizontal banner (illustration + heading on the left, facts as a
       row on the right) rather than a narrow vertical column — it now spans
       the full card width, directly above System Overview, instead of
       sitting in its own side column (visual-polish follow-up, round 2). */
    .shower-active {
      border: 1px solid color-mix(in srgb, var(--shower-color), transparent 55%);
      background: color-mix(in srgb, var(--shower-color), transparent 92%);
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      gap: 20px;
    }
    .shower-banner-head {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-shrink: 0;
    }
    .shower-banner-titles {
      display: flex;
      flex-direction: column;
      text-align: left;
    }
    .shower-heading {
      color: var(--shower-color);
      font-size: 0.85em;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 0;
    }
    .shower-illustration {
      width: 72px;
      height: 60px;
      flex-shrink: 0;
    }
    .shower-svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .shower-head {
      fill: var(--secondary-text-color);
      opacity: 0.85;
    }
    .shower-hole {
      fill: var(--ha-card-background, var(--card-background-color));
    }
    .droplet {
      stroke: var(--shower-color);
      stroke-width: 2;
      stroke-linecap: round;
      opacity: 0;
      animation: shower-fall 1.1s linear infinite;
    }
    .shower-title {
      color: var(--shower-color);
      font-size: 1.15em;
      font-weight: 800;
    }
    .shower-subtitle {
      color: var(--secondary-text-color);
      font-size: 0.88em;
    }
    .shower-facts {
      flex: 1 1 auto;
      margin: 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 10px 20px;
      text-align: left;
      min-width: 260px;
    }
    .shower-fact {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding-left: 14px;
      border-left: 1px solid color-mix(in srgb, var(--shower-color), transparent 70%);
    }
    .shower-fact dt {
      margin: 0;
      color: var(--secondary-text-color);
      font-size: 0.85em;
    }
    .shower-fact dd {
      margin: 0;
      color: var(--shower-color);
      font-size: 1.2em;
      font-weight: 800;
    }
    .shower-fact dd small {
      display: block;
      color: var(--secondary-text-color);
      font-size: 0.6em;
      font-weight: 500;
    }

    @keyframes shower-fall {
      0% {
        opacity: 0;
        stroke-dashoffset: 12;
      }
      30% {
        opacity: 0.9;
      }
      100% {
        opacity: 0;
        stroke-dashoffset: -12;
      }
    }

    /* ---- lower dashboard panels: Airflow / Temperatures / System Status ---- */
    .system-lower-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }
    .lower-card {
      border: 1px solid var(--divider-color);
      border-radius: 16px;
      padding: 16px;
      box-sizing: border-box;
      min-width: 0;
      background: var(--ha-card-background, var(--card-background-color));
      transition: border-color 0.3s ease;
    }
    /* "Airflow cards brighten when airflow increases" — a brief border/glow
       flash, not a permanent state change (visual-polish follow-up, round
       3); only ever applied for the one render where the reading just went
       up (see _systemAirflowCard's airflowIncreased), so like the
       recovery pulse it plays once and stops on its own. */
    .airflow-card.airflow-brighten {
      animation: airflow-brighten 0.9s ease-out;
    }
    @keyframes airflow-brighten {
      0% {
        border-color: var(--divider-color);
        box-shadow: none;
      }
      30% {
        border-color: color-mix(in srgb, #3b82f6, transparent 30%);
        box-shadow: 0 0 0 4px color-mix(in srgb, #3b82f6, transparent 85%);
      }
      100% {
        border-color: var(--divider-color);
        box-shadow: none;
      }
    }
    .airflow-card-body {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .airflow-card-rows {
      flex: 1 1 140px;
      min-width: 0;
    }
    .gauge {
      /* "Airflow is probably the single most important metric" — almost
         doubled from the original 140px per the visual-polish follow-up. */
      width: 260px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .gauge-svg {
      width: 100%;
      height: auto;
      overflow: visible;
    }
    .gauge-track {
      fill: none;
      stroke: var(--divider-color);
      stroke-width: 10;
      stroke-linecap: round;
    }
    .gauge-fill {
      fill: none;
      stroke: #3b82f6;
      stroke-width: 10;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.4s ease;
    }
    .gauge-value {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: -18px;
    }
    .gauge-value strong {
      font-size: 2.6em;
      line-height: 1;
      color: var(--primary-text-color);
    }
    /* The unit sits on its own line under the number rather than run on
       inline ("120" / "m³/h", not "120 m³/h") — visual-polish follow-up,
       round 2. */
    .gauge-value b.gauge-unit {
      font-size: 1em;
      font-weight: 600;
      color: var(--secondary-text-color);
      margin-top: 2px;
    }
    .gauge-value span {
      font-size: 0.8em;
      color: var(--secondary-text-color);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-top: 4px;
    }

    /* ---- compact header controls (visual redesign) ---- */
    /* A single bordered "control panel" strip instead of loose floating
       pills in the corner — "integrate it into the header so it feels like
       part of the appliance" (visual-polish follow-up, round 2). The pills
       themselves keep their own border/background so they still read as
       individually pressable/selectable, but the strip around them ties
       Mode/Boost/Shower together as one physical-feeling control group. */
    .system-controls.header-controls {
      border: 1px solid var(--divider-color);
      border-radius: 14px;
      background: color-mix(in srgb, var(--divider-color), transparent 88%);
      padding: 10px 14px;
      display: flex;
      align-items: flex-end;
      gap: 14px;
      flex-wrap: wrap;
    }
    .header-control {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .header-control-label {
      font-size: 0.72em;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--secondary-text-color);
    }
    .mode-select-pill,
    .boost-pill-button {
      font: inherit;
      font-weight: 700;
      font-size: 0.95em;
      border: 1px solid var(--divider-color);
      border-radius: 999px;
      padding: 8px 14px;
      min-height: 40px;
      background: var(--ha-card-background, var(--card-background-color));
      color: var(--primary-text-color);
      box-sizing: border-box;
      cursor: pointer;
    }
    .boost-pill-button {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      justify-content: center;
      gap: 4px 6px;
    }
    .boost-pill-button ha-icon {
      --mdc-icon-size: 16px;
    }
    /* The remaining-time readout wraps onto its own line under Active/Ready
       rather than squeezing onto the same line (visual-polish follow-up:
       "make the boost remaining time more prominent"). */
    .boost-pill-button small {
      flex-basis: 100%;
      text-align: center;
      font-size: 0.75em;
      font-weight: 600;
      opacity: 0.85;
    }
    .boost-pill-button.is-active {
      background: color-mix(in srgb, var(--success-color), transparent 82%);
      border-color: color-mix(in srgb, var(--success-color), transparent 45%);
      color: var(--success-color);
    }
    .boost-pill-button:disabled {
      opacity: 0.6;
      cursor: default;
    }
    .mode-select-pill:focus-visible,
    .boost-pill-button:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    /* The always-on shower status indicator in the header ("float it as a
       small status card in the header" — visual-polish follow-up, round
       2). Read-only, so it's a plain pill, not a button. */
    .shower-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
      font-size: 0.95em;
      border: 1px solid var(--divider-color);
      border-radius: 999px;
      padding: 8px 14px;
      min-height: 40px;
      box-sizing: border-box;
      background: var(--ha-card-background, var(--card-background-color));
      color: var(--secondary-text-color);
      white-space: nowrap;
    }
    .shower-pill ha-icon {
      --mdc-icon-size: 16px;
    }
    .shower-pill.is-active {
      background: color-mix(in srgb, var(--shower-color, #a855f7), transparent 82%);
      border-color: color-mix(in srgb, var(--shower-color, #a855f7), transparent 45%);
      color: var(--shower-color, #a855f7);
    }

    .system-more {
      display: flex;
      justify-content: center;
    }
    .disclosure-toggle {
      align-self: center;
      font: inherit;
      font-weight: 700;
      font-size: 0.9em;
      color: var(--primary-color);
      background: none;
      border: 1px solid var(--divider-color);
      border-radius: 999px;
      padding: 10px 16px;
      min-height: 44px;
      cursor: pointer;
      box-sizing: border-box;
    }
    .disclosure-toggle:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .advanced-drawer {
      border-top: 1px solid var(--divider-color);
      padding-top: 14px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    /* Calibration + fan-speed diagnostics as compact tiles rather than
       full-width rows (visual-polish follow-up). */
    .compact-stats-card {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 20px;
      border: 1px solid var(--divider-color);
      border-radius: 12px;
      padding: 12px 16px;
      background: var(--ha-card-background, var(--card-background-color));
    }
    .compact-stat {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .compact-stat span {
      font-size: 0.75em;
      color: var(--secondary-text-color);
    }
    .compact-stat strong {
      font-size: 1em;
      color: var(--primary-text-color);
      overflow-wrap: break-word;
    }

    @keyframes flow-left {
      to {
        transform: translateX(-20px);
      }
    }
    @keyframes flow-right {
      to {
        transform: translateX(20px);
      }
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (max-width: 360px) {
      .metric-grid {
        grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
      }
      .header,
      .content {
        padding-left: 12px;
        padding-right: 12px;
      }
    }

    /* Tablet (~768-1024px): visual full width, controls below, metrics in
       a slightly denser auto-fit grid. */
    @media (max-width: 900px) {
      .mvhr-dashboard,
      .mvhr-dashboard.no-controls {
        grid-template-columns: minmax(0, 1fr);
        grid-template-areas:
          'visual'
          'controls'
          'metrics'
          'status'
          'extra';
      }
      .visual-wrap {
        grid-template-columns: minmax(150px, 1fr) minmax(220px, 280px) minmax(150px, 1fr);
        min-height: 300px;
      }
      .unit {
        min-height: 200px;
      }
      .metrics-grid {
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      }
      .system-visual-wrap {
        grid-template-columns: minmax(150px, 1fr) minmax(260px, 340px) minmax(150px, 1fr);
        min-height: 440px;
      }
      .system-visual-panel .unit {
        min-height: 320px;
      }
      .recovery-badge-circular {
        width: 108px;
        height: 108px;
      }
      /* Tablet: the three lower cards wrap to two columns instead of
         three, and the shower banner stacks to a column. */
      .system-lower-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .shower-active {
        flex-direction: column;
        align-items: stretch;
        text-align: left;
      }
    }

    /* Mobile (<600px): compact 2x2 endpoint grid around the unit, controls
       stacked, metrics locked to 2 columns — never horizontal scroll. */
    @media (max-width: 599px) {
      .mvhr-dashboard {
        padding-left: 12px;
        padding-right: 12px;
      }
      .visual-panel {
        padding: 12px;
      }
      .visual-wrap {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        grid-template-rows: auto auto auto;
        min-height: 0;
        gap: 10px;
      }
      .unit {
        grid-column: 1 / -1;
        grid-row: 1;
        min-height: 150px;
        border-radius: 18px;
      }
      .exchanger {
        width: 60px;
        height: 60px;
      }
      .air-path {
        grid-column: auto;
        grid-row: auto;
        min-height: 66px;
        padding: 10px;
      }
      .path-temp {
        font-size: 1.1em;
      }
      .metrics-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .status-strip {
        gap: 6px 14px;
      }
      .mvhr-system {
        padding-left: 12px;
        padding-right: 12px;
      }
      .system-visual-panel {
        padding: 12px;
      }
      .system-visual-wrap {
        min-height: 0;
      }
      .system-visual-panel .unit {
        min-height: 170px;
      }
      .system-visual-panel .fan {
        --mdc-icon-size: 26px;
      }
      /* Single column everywhere on mobile: lower cards and the header's
         compact controls all stack, the shower banner drops to a column
         layout, and the gauge shrinks so nothing overlaps or forces
         horizontal scroll. */
      .system-lower-grid {
        grid-template-columns: minmax(0, 1fr);
      }
      .header-controls {
        width: 100%;
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
      }
      .header-control {
        width: 100%;
      }
      .mode-select-pill,
      .boost-pill-button,
      .shower-pill {
        width: 100%;
        justify-content: center;
      }
      .shower-active {
        flex-direction: column;
        align-items: stretch;
        text-align: left;
      }
      .shower-illustration {
        width: 60px;
        height: 50px;
      }
      .airflow-card-body {
        flex-direction: column;
        align-items: stretch;
      }
      .gauge {
        width: 100%;
        max-width: 300px;
        margin: 0 auto;
      }
      .disclosure-toggle {
        width: 100%;
      }
    }
  `;
}

// Defined manually (no @customElement decorator) and guarded so that a Vite
// dev-server hot reload re-evaluating this module doesn't throw
// "this name has already been used with this registry".
if (!customElements.get(CARD_TAG)) {
  customElements.define(CARD_TAG, HiperMvhrCard);
}

declare global {
  interface Window {
    customCards?: Array<Record<string, unknown>>;
  }
  interface HTMLElementTagNameMap {
    'hiper-mvhr-card': HiperMvhrCard;
  }
}

// Home Assistant's card picker reads window.customCards to list custom
// cards. Guarded the same way as the element registration above.
window.customCards = window.customCards ?? [];
if (!window.customCards.some((card) => card.type === CARD_TAG)) {
  window.customCards.push({
    type: CARD_TAG,
    name: 'HiPer MVHR Card',
    description: 'Universal MVHR dashboard card for Home Assistant',
  });
}
