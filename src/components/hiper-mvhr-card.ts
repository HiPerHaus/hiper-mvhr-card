import { LitElement, html, svg, css, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { HomeAssistant, LovelaceCard } from '../types/hass';
import type { HiperMvhrCardConfig } from '../types/config';
import type { CapabilityProfile } from '../types/capability';
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
import { calculateAirflowGauge } from '../utils/airflow-gauge';

const CARD_TAG = 'hiper-mvhr-card';

const TEMPERATURE_COLOUR_STOPS: ReadonlyArray<readonly [number, number, number, number]> = [
  [0, 30, 90, 210],
  [10, 70, 145, 220],
  [15, 198, 211, 220],
  [17.5, 224, 226, 220],
  [18, 239, 226, 194],
  [20, 244, 207, 137],
  [25, 236, 125, 50],
  [35, 205, 45, 45],
];

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

const PRESET_AIRFLOW_ROLES: Array<[EntityRoleId, string]> = [
  ['away_airflow', 'Away'],
  ['low_airflow', 'Low'],
  ['home_airflow', 'Home'],
  ['high_airflow', 'High'],
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
  'stop_control',
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
  'calibration_available',
  'calibration_progress',
  'last_calibration',
  'calibration_start_control',
  'calibration_cancel_control',
  'filter_reset_control',
  'maximum_airflow',
  'away_airflow',
  'low_airflow',
  'home_airflow',
  'high_airflow',
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
  @state() private _pendingMode?: string;
  @state() private _modeError?: string;
  @state() private _calibrationFeedback?: string;
  private readonly _presetDrafts = new Map<EntityRoleId, number>();
  private readonly _presetPending = new Set<EntityRoleId>();
  private readonly _presetErrors = new Map<EntityRoleId, string>();
  private readonly _presetTimers = new Map<EntityRoleId, ReturnType<typeof setTimeout>>();

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
    const stopped = this._isStopped(snapshot);

    return html`
      <ha-card class=${system ? 'card-system' : ''}>
        ${
          system
            ? this._systemHeader(title, subtitle, modeLabel, snapshot, config, hass)
            : this._header(title, subtitle, modeLabel, availability, showAvailability)
        }
        ${
          system
            ? this._systemDashboard(
                snapshot,
                config,
                hass,
                recovery,
                modeLabel,
                active && !stopped,
                displayProfile,
              )
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
      this._controlRow(
        role,
        label,
        snapshot[role],
        detailed,
        config,
        hass,
        actionVerb,
        pendingVerb,
      ),
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
    const rows = CONTROL_ROLES.filter(([role]) => role !== 'calibration_start_control').map(
      ([role, label, actionVerb, pendingVerb]) =>
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
            ? html`<span class="status-value tone-warning"
                >Couldn't ${actionVerb.toLowerCase()}</span
              >`
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
    const stopped = this._isStopped(snapshot);
    const modeOptions = this._modeOptions(snapshot.mode, snapshot, config);
    const overrideOptions = this._selectOptions(snapshot.override_duration);
    const currentModeRaw = stopped ? 'off' : this._state(snapshot.mode)?.toLowerCase();
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
                  class="chip ${isActive ? 'active' : ''} ${option.toLowerCase() === 'off' ? 'mode-off' : ''}"
                  ?disabled=${(option.toLowerCase() !== 'off' && !modeEntity) || Boolean(this._pendingMode)}
                  aria-pressed=${isActive}
                  aria-label=${`Set mode ${this._modeLabel(option)}`}
                  @click=${() => void this._setOperatingMode(hass, config, snapshot, option)}
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
   * the fuller controls). `Off` is only shown when the real mode select
   * advertises it as a supported option or a supported `stop_control` is
   * mapped; the card never invents a manufacturer-specific power action.
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
    const stopped = this._isStopped(snapshot);
    const modeOptions = this._modeOptions(snapshot.mode, snapshot, config);
    const currentModeRaw = stopped ? 'off' : this._state(snapshot.mode)?.toLowerCase();
    const canEditMode =
      config.show_controls &&
      ((Boolean(modeEntity) && snapshot.mode?.status === 'ok') ||
        this._canUseStopControl(snapshot, config));
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
    if (!canEditMode && !modeLabel && !hasBoost) {
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
                    class="mode-select-pill ${currentModeRaw === 'off' ? 'mode-off' : ''}"
                    aria-label="Operating mode"
                    .value=${this._selectedModeOption(modeOptions, currentModeRaw) ?? ''}
                    aria-busy=${Boolean(this._pendingMode)}
                    ?disabled=${Boolean(this._pendingMode)}
                    @change=${(event: Event) => {
                      const option = (event.currentTarget as HTMLSelectElement).value;
                      void this._setOperatingMode(hass, config, snapshot, option);
                    }}
                  >
                    ${modeOptions.map(
                      (option) => html`
                        <option
                          .value=${option}
                          .selected=${currentModeRaw !== undefined &&
                          option.toLowerCase() === currentModeRaw}
                        >
                          ${this._modeLabel(option)}
                        </option>
                      `,
                    )}
                  </select>
                  ${
                    this._modeError
                      ? html`<small class="control-error" role="alert">${this._modeError}</small>`
                      : ''
                  }
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
    active: boolean,
    profile: CapabilityProfile,
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
    const stopped = this._isStopped(snapshot);

    return html`
      <div class="mvhr-system">
        <section class="system-main">
          <section
            class="visual-panel system-visual-panel system-overview"
            aria-label="System overview"
          >
            <div class="panel-heading-row">
              <h3>System Overview</h3>
            </div>
            ${this._systemHeroVisual(snapshot, config, animated && !stopped, recovery, boostActive)}
          </section>
        </section>

        <section class="system-lower-grid" aria-label="MVHR details">
          ${this._systemAirflowCard(snapshot, config, profile)}
          ${this._systemTemperaturesCard(snapshot, recovery)}
          ${this._systemStatusCard(snapshot, config)}
        </section>

        ${shower.render ? this._systemShowerBanner(shower) : ''}
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
    unavailable: boolean;
    boostActive: boolean;
    pipeTemperature: string | null;
    triggerTemperature: string | null;
    rearmTemperature: string | null;
    boostRemaining: string | null;
  } {
    const detected = snapshot.shower_detected;
    const configured =
      Boolean(detected) &&
      detected?.status !== 'unsupported' &&
      detected?.status !== 'not_configured';
    const active = detected?.status === 'ok' && detected.value.toLowerCase() === 'on';
    const unavailable =
      configured && (detected?.status === 'unavailable' || detected?.status === 'entity_missing');

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
      unavailable,
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
   * The full shower detection banner — ready/active/unavailable status,
   * pipe/trigger/re-arm temperatures, and boost status. It sits below the
   * lower Temperature/Airflow/System Status boxes and directly above More
   * controls, so the header never duplicates shower state. Config's
   * `show_airflow_animation`
   * doesn't gate this panel's own droplet animation — it's a separate,
   * lightweight CSS effect — but `prefers-reduced-motion` always does (see
   * the reduced-motion media query in `static styles`).
   */
  private _systemShowerBanner(shower: ReturnType<HiperMvhrCard['_shower']>): TemplateResult {
    const stateClass = shower.active
      ? 'shower-active'
      : shower.unavailable
        ? 'shower-unavailable'
        : 'shower-ready';
    const title = shower.active
      ? 'Shower detected'
      : shower.unavailable
        ? 'Shower detection unavailable'
        : 'Shower detection ready';
    const subtitle = shower.active
      ? shower.boostActive
        ? 'Boost active'
        : 'Boost not active'
      : shower.unavailable
        ? 'Check the configured shower detector entity'
        : 'Rearmed and watching the pipe sensor';
    return html`
      <section class="shower-panel ${stateClass}" aria-label="Shower detection" role="status">
        <div class="shower-banner-head">
          <div class="shower-illustration" aria-hidden="true">${this._showerIllustration()}</div>
          <div class="shower-banner-titles">
            <h3 class="shower-heading">Shower Detection</h3>
            <strong class="shower-title">${title}</strong>
            <span class="shower-subtitle">${subtitle}</span>
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
            shower.active && shower.rearmTemperature
              ? html`
                  <div class="shower-fact">
                    <dt>Re-arm at</dt>
                    <dd>
                      ${shower.rearmTemperature}<small
                        >(${SHOWER_REARM_OFFSET_C}°C below trigger)</small
                      >
                    </dd>
                  </div>
                `
              : ''
          }
          ${
            shower.active && shower.boostRemaining
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
   *
   * The gauge's arc fill is the configured *operating level*, not "current
   * airflow ÷ target airflow" — target airflow is just a separate detail
   * row here, never the gauge's maximum. `mapped_level` is the preferred
   * source (Altair's 0-10 speed scale, read as 0-100%); `selected_speed`
   * (same 0-10 concept, a different entity) is the fallback when
   * `mapped_level` isn't available. The large central number stays the
   * actual measured airflow in m³/h regardless of which of those two the
   * arc is reading — two different facts sharing one gauge, not one
   * derived from the other.
   */
  private _systemAirflowCard(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    config: HiperMvhrCardConfig,
    profile: CapabilityProfile,
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
    const gauge = calculateAirflowGauge({
      current: airflowNumber,
      configuredMaximum: config.max_airflow,
      entityMaximum: this._number(snapshot.maximum_airflow),
      presetHigh: this._number(snapshot.high_airflow),
      manufacturerMaximum: profile.defaultMaxAirflow,
      mappedLevel: this._number(snapshot.mapped_level),
      selectedSpeed: this._number(snapshot.selected_speed),
    });
    const scaleLabel =
      airflowNumber !== undefined && gauge.maximum !== undefined
        ? `${airflowNumber} of ${gauge.maximum} ${airflowUnitText ?? 'm³/h'}`
        : null;
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
        this._diagnosticRow(
          'mdi:tune-variant',
          'Current profile',
          this._value(snapshot.mapped_level, true),
        ),
      );
    }
    if (snapshot.target_airflow) {
      rows.push(
        this._diagnosticRow(
          'mdi:target',
          'Target airflow',
          this._value(snapshot.target_airflow, true),
        ),
      );
    }

    return html`
      <section
        class="lower-card airflow-card ${airflowIncreased ? 'airflow-brighten' : ''}"
        aria-label="Airflow"
      >
        <h3>Airflow</h3>
        <div class="airflow-card-body">
          ${
            airflowValue
              ? this._airflowGauge(
                  gauge.fraction,
                  airflowNumberText,
                  airflowUnitText,
                  scaleLabel,
                )
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
    scaleLabel: string | null = null,
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
          ${scaleLabel ? html`<small class="gauge-scale">${scaleLabel}</small>` : ''}
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
          ${rows} ${this._diagnosticRow('mdi:heat-wave', 'Heat recovery', recovery.label)}
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
    const stopped = this._isStopped(snapshot);
    const boostActive = this._state(snapshot.boost_active) === 'on';
    const hasBoostRole = [
      snapshot.boost_active,
      snapshot.boost_duration,
      snapshot.start_boost,
    ].some((value) => value?.status === 'ok');
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
    if (snapshot.stop_control && snapshot.stop_control.status !== 'unsupported') {
      badges.push(this._statusBadge(stopped ? 'Stopped' : 'Running', stopped ? 'muted' : 'success'));
    }
    if (hasBoostRole) {
      badges.push(
        this._statusBadge(
          boostActive ? 'Boost Active' : 'Boost Ready',
          boostActive ? 'success' : 'muted',
        ),
      );
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
    const hasBoostDetail = [
      snapshot.boost_duration,
      snapshot.start_boost,
      snapshot.cancel_boost,
    ].some((value) => value?.status === 'ok');

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
        ${this._presetAirflowControls(snapshot, config, hass)}
        ${this._calibrationControl(snapshot, config, hass)}
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

  private _presetAirflowControls(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    config: HiperMvhrCardConfig,
    hass: HomeAssistant,
  ): TemplateResult {
    const configured = PRESET_AIRFLOW_ROLES.filter(([role]) => Boolean(config.entities[role]));
    const visible = configured.filter(([role]) => {
      const value = snapshot[role];
      return value?.status === 'ok' || value?.status === 'unavailable';
    });
    const validation = this._presetValidation(snapshot, visible.map(([role]) => role));
    return html`
      <section class="preset-controls" aria-label="Preset airflows">
        <div class="control-block-head"><span>Preset airflows</span></div>
        ${
          visible.length === 0
            ? html`
                <p class="preset-empty">
                  Preset airflow controls require number entities to be configured.
                </p>
              `
            : html`
                <div class="preset-grid">
                  ${visible.map(([role, label]) => {
            const value = snapshot[role];
            const entityId = config.entities[role];
            const minimum = this._attributeNumber(value, 'min');
            const maximum = this._attributeNumber(value, 'max');
            const step = this._attributeNumber(value, 'step') ?? 1;
            const displayed = this._presetDrafts.get(role) ?? this._number(value);
            const disabled = value?.status !== 'ok' || !entityId || this._presetPending.has(role);
            return html`
              <label class="preset-field">
                <span>${label}</span>
                <span class="preset-input-wrap">
                  <input
                    type="number"
                    .value=${displayed === undefined ? '' : String(displayed)}
                    min=${minimum ?? nothing}
                    max=${maximum ?? nothing}
                    step=${step}
                    ?disabled=${disabled}
                    aria-label=${`${label} airflow`}
                    aria-busy=${this._presetPending.has(role)}
                    @input=${(event: Event) => {
                      const next = Number((event.currentTarget as HTMLInputElement).value);
                      if (Number.isFinite(next)) {
                        this._presetDrafts.set(role, next);
                        this.requestUpdate();
                      }
                    }}
                    @change=${(event: Event) => {
                      const next = Number((event.currentTarget as HTMLInputElement).value);
                      if (entityId && Number.isFinite(next)) {
                        this._schedulePresetUpdate(role, entityId, next, value, snapshot, hass);
                      }
                    }}
                  />
                  <small>${value?.status === 'ok' ? value.unit ?? 'm³/h' : 'Unavailable'}</small>
                </span>
                ${
                  this._presetErrors.has(role)
                    ? html`<small class="control-error" role="alert"
                        >${this._presetErrors.get(role)}</small
                      >`
                    : ''
                }
              </label>
            `;
          })}
                </div>
              `
        }
        ${
          validation
            ? html`<p class="preset-validation" role="alert">${validation}</p>`
            : ''
        }
      </section>
    `;
  }

  private _attributeNumber(value: RoleValue | undefined, key: string): number | undefined {
    if (value?.status !== 'ok') {
      return undefined;
    }
    const attribute = value.attributes[key];
    const number = typeof attribute === 'number' ? attribute : Number(attribute);
    return Number.isFinite(number) ? number : undefined;
  }

  private _presetValidation(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    roles: EntityRoleId[],
  ): string | null {
    const values = roles
      .map((role) => this._presetDrafts.get(role) ?? this._number(snapshot[role]))
      .filter((value): value is number => value !== undefined);
    for (let index = 1; index < values.length; index += 1) {
      if (values[index]! < values[index - 1]!) {
        return 'Preset airflow must follow Away ≤ Low ≤ Home ≤ High.';
      }
    }
    return null;
  }

  private _schedulePresetUpdate(
    role: EntityRoleId,
    entityId: string,
    value: number,
    currentValue: RoleValue | undefined,
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    hass: HomeAssistant,
  ): void {
    this._presetDrafts.set(role, value);
    this._presetErrors.delete(role);
    const rangeError = this._presetRangeValidation(value, currentValue);
    if (rangeError) {
      this._presetErrors.set(role, rangeError);
      this.requestUpdate();
      return;
    }
    if (this._presetValidation(snapshot, PRESET_AIRFLOW_ROLES.map(([presetRole]) => presetRole))) {
      this.requestUpdate();
      return;
    }
    const existing = this._presetTimers.get(role);
    if (existing) {
      clearTimeout(existing);
    }
    this._presetTimers.set(
      role,
      setTimeout(() => {
        this._presetTimers.delete(role);
        this._presetPending.add(role);
        this.requestUpdate();
        void this._call(hass, this._domain(entityId) || 'number', 'set_value', {
          entity_id: entityId,
          value,
        })
          .catch(() => this._presetErrors.set(role, "Couldn't save preset"))
          .finally(() => {
            this._presetPending.delete(role);
            this.requestUpdate();
          });
      }, 300),
    );
    this.requestUpdate();
  }

  private _presetRangeValidation(value: number, currentValue: RoleValue | undefined): string | null {
    const minimum = this._attributeNumber(currentValue, 'min');
    const maximum = this._attributeNumber(currentValue, 'max');
    const step = this._attributeNumber(currentValue, 'step');
    if (minimum !== undefined && value < minimum) {
      return `Must be at least ${minimum}.`;
    }
    if (maximum !== undefined && value > maximum) {
      return `Must be no more than ${maximum}.`;
    }
    if (step !== undefined && step > 0) {
      const origin = minimum ?? 0;
      const steps = (value - origin) / step;
      if (Math.abs(steps - Math.round(steps)) > 1e-6) {
        return `Must use ${step} increments.`;
      }
    }
    return null;
  }

  private _calibrationControl(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    config: HiperMvhrCardConfig,
    hass: HomeAssistant,
  ): TemplateResult {
    if (!config.show_calibration) {
      return html``;
    }
    const roles: EntityRoleId[] = [
      'calibration_available',
      'calibration_start_control',
      'calibration_cancel_control',
      'calibration_status',
      'calibration_progress',
      'calibration_result',
      'last_calibration',
    ];
    const hasCalibration = roles.some((role) => {
      const value = snapshot[role];
      return value && value.status !== 'unsupported' && value.status !== 'not_configured';
    });
    if (!hasCalibration) {
      return html``;
    }

    const startRole: EntityRoleId = 'calibration_start_control';
    const cancelRole: EntityRoleId = 'calibration_cancel_control';
    const startValue = snapshot[startRole];
    const cancelValue = snapshot[cancelRole];
    const startEntityId = config.entities[startRole];
    const cancelEntityId = config.entities[cancelRole];
    const startDispatcher = this._getDispatcher(startRole);
    const cancelDispatcher = this._getDispatcher(cancelRole);
    const startPending = startDispatcher.state.status === 'pending';
    const cancelPending = cancelDispatcher.state.status === 'pending';
    const startUnavailable = startValue?.status !== 'ok' || !startEntityId;
    const cancelUnavailable = cancelValue?.status !== 'ok' || !cancelEntityId;
    const statusRaw = this._state(snapshot.calibration_status)?.toLowerCase();
    const running = Boolean(statusRaw && !CALIBRATION_QUIET_STATES.has(statusRaw));
    const progress = this._number(snapshot.calibration_progress);
    const progressLabel = this._value(snapshot.calibration_progress, true);
    const available =
      snapshot.calibration_available?.status === 'ok'
        ? this._state(snapshot.calibration_available)?.toLowerCase() === 'on'
        : null;
    const lastCalibration =
      snapshot.last_calibration?.status === 'ok'
        ? formatTimestampMaybe(snapshot.last_calibration.value)
        : this._value(snapshot.last_calibration, true);
    const startError =
      startDispatcher.state.status === 'error' ? startDispatcher.state.message : null;
    const cancelError =
      cancelDispatcher.state.status === 'error' ? cancelDispatcher.state.message : null;
    return html`
      <section class="calibration-panel" aria-label="Airflow calibration">
        <div class="calibration-panel-head">
          <div>
            <strong>Airflow calibration</strong>
            <small>The unit may change fan speeds during calibration.</small>
          </div>
          ${
            available !== null
              ? html`<span class="state-pill ${available ? 'is-active' : ''}"
                  >${available ? 'Available' : 'Not calibrated'}</span
                >`
              : ''
          }
        </div>
        <div class="calibration-actions">
          <button
            type="button"
            class="cta calibration-button"
            ?disabled=${startUnavailable || startPending || running}
            aria-busy=${startPending}
            @click=${async () => {
              const confirmed = globalThis.confirm?.(
                'Start airflow calibration?\nThe unit may change fan speeds during calibration.',
              );
              if (!confirmed || !startEntityId) {
                return;
              }
              this._calibrationFeedback = undefined;
              await startDispatcher.dispatchAction(hass, startEntityId);
              this._calibrationFeedback =
                startDispatcher.state.status === 'idle' ? 'Calibration started' : undefined;
            }}
          >
            ${startPending ? 'Starting…' : 'Start Calibration'}
          </button>
          ${
            running
              ? html`
                  <button
                    type="button"
                    class="cta ghost calibration-cancel-button"
                    ?disabled=${cancelUnavailable || cancelPending}
                    aria-busy=${cancelPending}
                    @click=${async () => {
                      if (cancelEntityId) {
                        await cancelDispatcher.dispatchAction(hass, cancelEntityId);
                      }
                    }}
                  >
                    ${cancelPending ? 'Cancelling…' : 'Cancel Calibration'}
                  </button>
                `
              : ''
          }
        </div>
        ${
          progress !== undefined
            ? html`
                <div class="calibration-progress" aria-label="Calibration progress">
                  <span style=${`width:${Math.max(0, Math.min(100, progress))}%`}></span>
                </div>
              `
            : ''
        }
        <div class="calibration-details">
          ${this._compactStat('Status', this._value(snapshot.calibration_status, true))}
          ${this._compactStat('Complete', progressLabel)}
          ${this._compactStat('Last calibration', lastCalibration)}
          ${this._compactStat('Result', this._value(snapshot.calibration_result, true))}
        </div>
        ${
          startUnavailable && startValue && startValue.status !== 'not_configured'
            ? html`<small class="control-error">Calibration unavailable</small>`
            : startError
              ? html`<small class="control-error" role="alert">${startError}</small>`
              : cancelError
                ? html`<small class="control-error" role="alert">${cancelError}</small>`
                : this._calibrationFeedback
                  ? html`<small class="control-success" role="status"
                      >${this._calibrationFeedback}</small
                    >`
                  : ''
        }
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
   * System mode's equipment cutaway. Outdoor intake/exhaust occupy the left
   * side and indoor extract/supply the right. The static cabinet, chamber,
   * filters, blower housings, exchanger cassette and collars provide the
   * appliance structure; temperature gradients, particles and impellers are
   * reactive overlays. The two physical streams remain separate throughout.
   */
  private _systemHeroVisual(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    config: HiperMvhrCardConfig,
    animated: boolean,
    recovery: HeatRecoveryResult,
    boostActive: boolean,
  ): TemplateResult {
    const sharedAirflow =
      this._value(snapshot.airflow, true) ?? this._value(snapshot.supply_airflow, true);
    const showAllAirflows = config.show_airflow_on_all_paths;
    const temperatures = {
      extract: this._number(snapshot.extract_air_temp) ?? null,
      exhaust: this._number(snapshot.exhaust_air_temp) ?? null,
      outdoor: this._number(snapshot.outdoor_air_temp) ?? null,
      supply: this._number(snapshot.supply_air_temp) ?? null,
    };
    const colours = {
      extract: this._temperatureColour(temperatures.extract),
      exhaust: this._temperatureColour(temperatures.exhaust),
      outdoor: this._temperatureColour(temperatures.outdoor),
      supply: this._temperatureColour(temperatures.supply),
    };
    const warmMidpoint =
      temperatures.extract !== null && temperatures.exhaust !== null
        ? this._temperatureColour((temperatures.extract + temperatures.exhaust) / 2)
        : this._temperatureColour(null);
    const coolMidpoint =
      temperatures.outdoor !== null && temperatures.supply !== null
        ? this._temperatureColour((temperatures.outdoor + temperatures.supply) / 2)
        : this._temperatureColour(null);
    const filterKnown = this._number(snapshot.filter_remaining) !== undefined;
    const supplyFanKnown = this._number(snapshot.supply_fan_speed) !== undefined;
    const extractFanKnown = this._number(snapshot.extract_fan_speed) !== undefined;
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
      const temperature = this._number(snapshot[role]) ?? null;
      const streamColour = this._temperatureColour(temperature);
      const streamSoft = this._temperatureColour(temperature, 0.13);
      const side = key === 'extract' || key === 'supply' ? 'indoor' : 'outdoor';
      const direction = key === 'extract' || key === 'outdoor' ? 'inward' : 'outward';
      const humidity =
        key === 'extract' && snapshot.indoor_humidity?.status === 'ok'
          ? this._value(snapshot.indoor_humidity, true)
          : null;
      return html`
        <div
          class="air-path ${key}"
          data-side=${side}
          data-flow=${direction}
          data-temperature=${temperature ?? 'unavailable'}
          style=${`--stream-color:${streamColour};--stream-soft:${streamSoft}`}
        >
          <span class="path-label">
            <ha-icon icon=${endpointIcon} aria-hidden="true"></ha-icon>
            ${label}
            <ha-icon class="path-arrow" icon=${arrowIcon} aria-label=${arrowLabel}></ha-icon>
          </span>
          <span class="path-temp">${this._value(snapshot[role], true) ?? '—'}</span>
          ${
            humidity
              ? html`<span class="path-humidity">
                  <ha-icon icon="mdi:water-percent" aria-hidden="true"></ha-icon>
                  Indoor humidity ${humidity}
                </span>`
              : ''
          }
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
          'outdoor',
          'Outdoor air',
          'outdoor_air_temp',
          false,
          'mdi:tree',
          'mdi:arrow-bottom-right-thin',
          'Drawn from outdoors',
        )}
        ${path(
          'extract',
          'Extract air',
          'extract_air_temp',
          true,
          'mdi:home',
          'mdi:arrow-bottom-left-thin',
          'Drawn from the home',
        )}
        <div class="unit-stage">
          ${
            recovery.status === 'ok'
              ? html`
                  <div
                    class="recovery-badge-plate ${recoveryPulse ? 'recovery-pulse' : ''}"
                    title="Apparent temperature recovery"
                    role="img"
                    aria-label=${`Heat recovery ${recovery.label}`}
                  >
                    <strong>${recovery.label}</strong>
                    <span>Heat Recovery</span>
                  </div>
                  <span class="recovery-connector" aria-hidden="true"></span>
                `
              : ''
          }
          <div
            class="unit ${animated ? 'active' : ''} ${animated && boostActive ? 'boost-active' : ''}"
            aria-label="Heat recovery unit"
          >
          <svg
            class="airflow-schematic"
            viewBox="0 0 700 360"
            role="img"
            aria-label="Cutaway MVHR unit with two separate air streams crossing through a plate heat exchanger"
            style=${`--air-extract:${colours.extract};--air-exhaust:${colours.exhaust};--air-outdoor:${colours.outdoor};--air-supply:${colours.supply}`}
          >
            <defs>
              <clipPath id="system-exchanger-clip">
                <path d="M350 62 L470 180 L350 298 L230 180 Z"></path>
              </clipPath>
              <linearGradient id="cabinet-edge" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" class="metal-light"></stop>
                <stop offset="0.42" class="metal-mid"></stop>
                <stop offset="1" class="metal-dark"></stop>
              </linearGradient>
              <linearGradient id="inner-chamber" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" class="chamber-top"></stop>
                <stop offset="1" class="chamber-bottom"></stop>
              </linearGradient>
              <linearGradient id="collar-metal" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" class="metal-dark"></stop>
                <stop offset="0.3" class="metal-light"></stop>
                <stop offset="0.72" class="metal-mid"></stop>
                <stop offset="1" class="metal-dark"></stop>
              </linearGradient>
              <linearGradient id="blower-metal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" class="blower-light"></stop>
                <stop offset="1" class="blower-dark"></stop>
              </linearGradient>
              <linearGradient id="exchanger-frame" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" class="metal-light"></stop>
                <stop offset="0.5" class="metal-dark"></stop>
                <stop offset="1" class="metal-mid"></stop>
              </linearGradient>
              <filter id="equipment-shadow" x="-20%" y="-30%" width="140%" height="170%">
                <feDropShadow dx="0" dy="8" stdDeviation="8" flood-opacity="0.28"></feDropShadow>
              </filter>
              <filter id="component-shadow" x="-25%" y="-25%" width="150%" height="160%">
                <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.4"></feDropShadow>
              </filter>
              <linearGradient
                id="extract-gradient"
                gradientUnits="userSpaceOnUse"
                x1="700"
                y1="82"
                x2="433"
                y2="154"
              >
                <stop offset="0" stop-color=${colours.extract}></stop>
                <stop offset="1" stop-color=${warmMidpoint}></stop>
              </linearGradient>
              <linearGradient
                id="exhaust-gradient"
                gradientUnits="userSpaceOnUse"
                x1="267"
                y1="206"
                x2="0"
                y2="278"
              >
                <stop offset="0" stop-color=${warmMidpoint}></stop>
                <stop offset="1" stop-color=${colours.exhaust}></stop>
              </linearGradient>
              <linearGradient
                id="outdoor-gradient"
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1="82"
                x2="267"
                y2="154"
              >
                <stop offset="0" stop-color=${colours.outdoor}></stop>
                <stop offset="1" stop-color=${coolMidpoint}></stop>
              </linearGradient>
              <linearGradient
                id="supply-gradient"
                gradientUnits="userSpaceOnUse"
                x1="433"
                y1="206"
                x2="700"
                y2="278"
              >
                <stop offset="0" stop-color=${coolMidpoint}></stop>
                <stop offset="1" stop-color=${colours.supply}></stop>
              </linearGradient>
              <linearGradient
                id="warm-exchanger-gradient"
                gradientUnits="userSpaceOnUse"
                x1="430"
                y1="135"
                x2="270"
                y2="225"
              >
                <stop offset="0" stop-color=${colours.extract}></stop>
                <stop offset="1" stop-color=${colours.exhaust}></stop>
              </linearGradient>
              <linearGradient
                id="cool-exchanger-gradient"
                gradientUnits="userSpaceOnUse"
                x1="270"
                y1="135"
                x2="430"
                y2="225"
              >
                <stop offset="0" stop-color=${colours.outdoor}></stop>
                <stop offset="1" stop-color=${colours.supply}></stop>
              </linearGradient>
            </defs>
            <g class="cabinet" filter="url(#equipment-shadow)" aria-hidden="true">
              <rect class="cabinet-outer" x="14" y="16" width="672" height="328" rx="18"></rect>
              <rect class="cutaway-shell" x="27" y="29" width="646" height="302" rx="11"></rect>
              <rect class="cabinet-seam" x="36" y="38" width="628" height="284" rx="7"></rect>
              <path class="cabinet-lip" d="M37 45 H663 M37 315 H663"></path>
            </g>
            <g class="cutaway-compartments" aria-hidden="true">
              <path d="M186 42 V318"></path>
              <path d="M514 42 V318"></path>
              <path d="M39 180 H661"></path>
              <path class="support-rail" d="M205 52 V307 M495 52 V307"></path>
            </g>
            <g class="mounting-brackets" aria-hidden="true">
              <path d="M208 83 h28 v9 h-18 v27 h-10 Z"></path>
              <path d="M492 83 h-28 v9 h18 v27 h10 Z"></path>
              <path d="M208 277 h28 v-9 h-18 v-27 h-10 Z"></path>
              <path d="M492 277 h-28 v-9 h18 v-27 h10 Z"></path>
              <rect x="114" y="305" width="72" height="9" rx="3"></rect>
              <rect x="514" y="305" width="72" height="9" rx="3"></rect>
            </g>
            <g class="casing-bolts" aria-hidden="true">
              ${[
                [31, 33],
                [669, 33],
                [31, 327],
                [669, 327],
                [187, 33],
                [513, 33],
                [187, 327],
                [513, 327],
              ].map(
                ([cx, cy]) => svg`<g transform=${`translate(${cx} ${cy})`}><circle r="5"></circle><path d="M-2.2 0 H2.2"></path></g>`,
              )}
            </g>
            <g class="duct-shells" aria-hidden="true">
              <path d="M700 82 H566 C512 82 488 111 433 154"></path>
              <path d="M267 206 C212 249 188 278 134 278 H0"></path>
              <path d="M0 82 H134 C188 82 212 111 267 154"></path>
              <path d="M433 206 C488 249 512 278 566 278 H700"></path>
            </g>
            <g class="duct-highlights" aria-hidden="true">
              <path d="M700 76 H566 C512 76 488 105 433 148"></path>
              <path d="M267 200 C212 243 188 272 134 272 H0"></path>
              <path d="M0 76 H134 C188 76 212 105 267 148"></path>
              <path d="M433 200 C488 243 512 272 566 272 H700"></path>
            </g>
            <path
              class="airflow-path extract-flow"
              data-flow="inward"
              d="M700 82 H566 C512 82 488 111 433 154"
            ></path>
            <path
              class="airflow-path exhaust-flow"
              data-flow="outward"
              d="M267 206 C212 249 188 278 134 278 H0"
            ></path>
            <path
              class="airflow-path outdoor-flow"
              data-flow="inward"
              d="M0 82 H134 C188 82 212 111 267 154"
            ></path>
            <path
              class="airflow-path supply-flow"
              data-flow="outward"
              d="M433 206 C488 249 512 278 566 278 H700"
            ></path>
            <g class="filters" aria-hidden="true">
              ${[
                ['outdoor-filter', 134],
                ['extract-filter', 566],
              ].map(
                ([filterClass, x]) => svg`
                  <g
                    class="filter-cartridge ${filterClass} ${filterKnown ? 'known' : 'unavailable'}"
                    data-path="incoming"
                    transform=${`translate(${x} 82)`}
                    filter="url(#component-shadow)"
                  >
                    <rect class="filter-depth" x="-17" y="-50" width="34" height="100" rx="4"></rect>
                    <rect class="filter-media" x="-12" y="-45" width="24" height="90" rx="2"></rect>
                    ${[-38, -26, -14, -2, 10, 22, 34].map(
                      (y) => svg`<path class="filter-pleat" d=${`M-10 ${y} L10 ${y + 8}`}></path>`,
                    )}
                    <rect class="filter-status-edge" x="-17" y="-50" width="5" height="100" rx="2"></rect>
                  </g>
                `,
              )}
            </g>
            <g class="fan-assemblies" aria-hidden="true">
              ${[
                ['exhaust-fan', 148, 273, extractFanKnown],
                ['supply-fan', 552, 273, supplyFanKnown],
              ].map(
                ([fanClass, x, y, fanKnown]) => svg`
                  <g
                    class="fan-assembly ${fanClass} ${fanKnown ? 'known' : 'unavailable'}"
                    data-location="internal"
                    transform=${`translate(${x} ${y})`}
                    filter="url(#component-shadow)"
                  >
                    <path class="fan-scroll" d="M-60 -43 H12 Q48 -43 52 -12 V31 H29 V10 Q29 -8 10 -8 H-60 Z"></path>
                    <rect class="fan-motor" x="22" y="-15" width="30" height="30" rx="12"></rect>
                    <ellipse class="fan-drum-back" cx="-27" rx="38" ry="35"></ellipse>
                    <path class="fan-drum-depth" d="M-27 -35 H-18 A38 35 0 0 1 -18 35 H-27 A38 35 0 0 0 -27 -35 Z"></path>
                    <circle class="fan-ring" cx="-27" r="33"></circle>
                    <g class="fan-rotor">
                      ${Array.from({ length: 18 }, (_, index) => index * 20).map(
                        (rotation) => svg`<path
                          class="fan-vane"
                          d="M-31 -27 Q-21 -34 -13 -27 L-17 -21 Q-23 -26 -29 -20 Z"
                          transform=${`rotate(${rotation} -27 0)`}
                        ></path>`,
                      )}
                      <circle class="fan-shroud" cx="-27" r="24"></circle>
                      <circle class="fan-hub" cx="-27" r="9"></circle>
                      <circle class="fan-axle" cx="-27" r="3"></circle>
                    </g>
                    <path class="fan-feet" d="M-45 39 v9 h18 v-9 M26 39 v9 h18 v-9"></path>
                  </g>
                `,
              )}
            </g>
            <g class="exchanger-plate" filter="url(#component-shadow)" aria-hidden="true">
              <path class="exchanger-shadow" d="M350 52 L480 180 L350 308 L220 180 Z"></path>
              <path class="exchanger-outline" d="M350 62 L470 180 L350 298 L230 180 Z"></path>
              <path class="exchanger-warm-face" d="M350 70 L462 180 L350 180 L238 180 Z"></path>
              <path class="exchanger-cool-face" d="M238 180 H350 V290 Z M350 180 H462 L350 290 Z"></path>
              <g class="warm-channels" clip-path="url(#system-exchanger-clip)">
                ${Array.from(
                  { length: 15 },
                  (_, index) => svg`<path d=${`M${220 + index * 11} 75 L${405 + index * 11} 260`}></path>`,
                )}
              </g>
              <g class="cool-channels" clip-path="url(#system-exchanger-clip)">
                ${Array.from(
                  { length: 15 },
                  (_, index) => svg`<path d=${`M${295 + index * 11} 75 L${110 + index * 11} 260`}></path>`,
                )}
              </g>
              <path class="passage-separator" d="M350 66 V294 M234 180 H466"></path>
              <path class="exchanger-frame-detail" d="M350 62 L470 180 L350 298 L230 180 Z"></path>
            </g>
            ${['extract', 'exhaust', 'outdoor', 'supply'].map(
              (stream) =>
                svg`<g
                  class="airflow-particles ${stream}-particles ${temperatures[stream as keyof typeof temperatures] === null ? 'unavailable' : ''}"
                  aria-hidden="true"
                >
                  <circle class="airflow-particle particle-1" r="5"></circle
                  ><circle class="airflow-particle particle-2" r="5"></circle
                  ><circle class="airflow-particle particle-3" r="5"></circle>
                </g>`,
            )}
            <g class="port-collars" aria-hidden="true">
              ${[
                ['outdoor-collar', 24, 82, colours.outdoor],
                ['exhaust-collar', 24, 278, colours.exhaust],
                ['extract-collar', 676, 82, colours.extract],
                ['supply-collar', 676, 278, colours.supply],
              ].map(
                ([collarClass, x, y, collarColour]) => svg`
                  <g
                    class="port-collar ${collarClass}"
                    transform=${`translate(${x} ${y})`}
                    style=${`--collar-color:${collarColour}`}
                  >
                    <rect x="-26" y="-31" width="52" height="62" rx="8"></rect>
                    <ellipse cx="0" cy="0" rx="14" ry="31"></ellipse>
                    <path class="collar-highlight" d="M-13 -23 C-5 -29 5 -29 13 -23"></path>
                    <path class="collar-accent" d="M-18 -26 V26"></path>
                  </g>
                `,
              )}
            </g>
          </svg>
          </div>
        </div>
        ${path(
          'exhaust',
          'Exhaust air',
          'exhaust_air_temp',
          false,
          'mdi:tree',
          'mdi:arrow-bottom-left-thin',
          'Flowing outdoors',
        )}
        ${path(
          'supply',
          'Supply air',
          'supply_air_temp',
          true,
          'mdi:home',
          'mdi:arrow-bottom-right-thin',
          'Flowing into the home',
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

  private _canUseStopControl(
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    config: HiperMvhrCardConfig,
  ): boolean {
    return Boolean(config.entities.stop_control) && snapshot.stop_control?.status === 'ok';
  }

  private _isStopped(snapshot: Partial<Record<EntityRoleId, RoleValue>>): boolean {
    const stopState = this._state(snapshot.stop_control)?.toLowerCase();
    if (stopState && ['on', 'true', '1', 'stop', 'stopped'].includes(stopState)) {
      return true;
    }
    const mode = this._state(snapshot.mode)?.toLowerCase();
    const effectiveMode = this._state(snapshot.effective_mode)?.toLowerCase();
    return mode === 'off' || effectiveMode === 'off' || effectiveMode === 'stopped';
  }

  private _temperatureColour(temperature: number | null, alpha = 1): string {
    const opacity = Math.max(0, Math.min(1, alpha));
    if (temperature === null || !Number.isFinite(temperature)) {
      return `color-mix(in srgb, var(--secondary-text-color), transparent ${Math.round((1 - opacity) * 100)}%)`;
    }

    const firstStop = TEMPERATURE_COLOUR_STOPS[0]!;
    const lastStop = TEMPERATURE_COLOUR_STOPS[TEMPERATURE_COLOUR_STOPS.length - 1]!;
    const clamped = Math.max(firstStop[0], Math.min(lastStop[0], temperature));
    let lower = firstStop;
    let upper = lastStop;
    for (let index = 1; index < TEMPERATURE_COLOUR_STOPS.length; index += 1) {
      const candidate = TEMPERATURE_COLOUR_STOPS[index]!;
      if (clamped <= candidate[0]) {
        lower = TEMPERATURE_COLOUR_STOPS[index - 1]!;
        upper = candidate;
        break;
      }
    }
    const fraction = upper[0] === lower[0] ? 0 : (clamped - lower[0]) / (upper[0] - lower[0]);
    const channel = (from: number, to: number) => Math.round(from + (to - from) * fraction);
    return `rgba(${channel(lower[1], upper[1])}, ${channel(lower[2], upper[2])}, ${channel(lower[3], upper[3])}, ${opacity})`;
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

  private _modeOptions(
    value: RoleValue | undefined,
    snapshot?: Partial<Record<EntityRoleId, RoleValue>>,
    config?: HiperMvhrCardConfig,
  ): string[] {
    const options =
      value?.status === 'ok' && Array.isArray(value.attributes.options)
        ? value.attributes.options.filter((option): option is string => typeof option === 'string')
        : ['Away', 'Low', 'Home', 'High'];
    const withStop =
      snapshot && config && this._canUseStopControl(snapshot, config)
        ? ['Off', ...options]
        : options;
    return [...new Map(withStop.map((option) => [option.toLowerCase(), option])).values()]
      .filter((option) => option.toLowerCase() !== 'boost')
      .sort((a, b) => Number(b.toLowerCase() === 'off') - Number(a.toLowerCase() === 'off'));
  }

  private _selectedModeOption(options: string[], currentModeRaw: string | undefined): string | null {
    if (!currentModeRaw) {
      return null;
    }
    return options.find((option) => option.toLowerCase() === currentModeRaw) ?? null;
  }

  private async _setMode(
    hass: HomeAssistant,
    entityId: string,
    option: string,
  ): Promise<void> {
    if (this._pendingMode) {
      return;
    }
    this._pendingMode = option;
    this._modeError = undefined;
    try {
      await this._call(hass, 'select', 'select_option', { entity_id: entityId, option });
    } catch {
      this._modeError = `Couldn't set ${this._modeLabel(option)} mode`;
    } finally {
      this._pendingMode = undefined;
    }
  }

  private async _setOperatingMode(
    hass: HomeAssistant,
    config: HiperMvhrCardConfig,
    snapshot: Partial<Record<EntityRoleId, RoleValue>>,
    option: string,
  ): Promise<void> {
    const optionIsOff = option.toLowerCase() === 'off';
    const modeEntity = config.entities.mode;
    if (optionIsOff && this._canUseStopControl(snapshot, config)) {
      await this._setStopControl(hass, config, true);
      return;
    }

    if (!modeEntity) {
      return;
    }
    if (this._isStopped(snapshot) && this._canUseStopControl(snapshot, config)) {
      await this._setStopControl(hass, config, false);
    }
    await this._setMode(hass, modeEntity, option);
  }

  private async _setStopControl(
    hass: HomeAssistant,
    config: HiperMvhrCardConfig,
    stopped: boolean,
  ): Promise<void> {
    const entityId = config.entities.stop_control;
    if (!entityId || this._pendingMode) {
      return;
    }
    this._pendingMode = stopped ? 'Off' : 'Run';
    this._modeError = undefined;
    try {
      const domain = this._domain(entityId);
      if (domain === 'switch' || domain === 'input_boolean') {
        await this._call(hass, domain, stopped ? 'turn_on' : 'turn_off', { entity_id: entityId });
      } else if (domain === 'button' || domain === 'input_button') {
        await this._call(hass, domain, 'press', { entity_id: entityId });
      } else {
        await this._call(hass, domain, stopped ? 'turn_on' : 'turn_off', { entity_id: entityId });
      }
    } catch {
      this._modeError = stopped ? "Couldn't stop the unit" : "Couldn't start the unit";
    } finally {
      this._pendingMode = undefined;
    }
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
    if (this._isStopped(snapshot)) {
      return { tone: 'muted', label: 'Stopped' };
    }

    return { tone: 'success', label: 'System OK' };
  }

  private _press(hass: HomeAssistant, entityId: string | undefined): void {
    if (!entityId) {
      return;
    }
    void this._call(hass, 'button', 'press', { entity_id: entityId });
  }

  private _domain(entityId: string): string {
    return entityId.split('.')[0] ?? '';
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
      .system-visual-panel .unit.active .fan-rotor,
      .system-visual-panel .unit.active .airflow-particle,
      .recovery-badge-plate.recovery-pulse,
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
      /* Same reasoning for the airflow particles: a static dot reads
         as decoration, not motion, so just leave them off rather than
         freeze mid-animation. */
      .system-visual-panel .unit.active .airflow-particle {
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
    /* System Overview's own wrapper — always full width. The shower banner
       sits below the lower cards now, so there's no competing column here
       on any screen size. */
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
      .system-visual-wrap {
        grid-template-columns: minmax(130px, 1fr) minmax(240px, 320px) minmax(130px, 1fr);
        min-height: 420px;
      }
      .system-lower-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .shower-ready,
      .shower-active,
      .shower-unavailable {
        flex-direction: column;
        align-items: stretch;
        text-align: left;
      }
    }
    @container (max-width: 520px) {
      .system-visual-wrap {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        grid-template-rows: auto auto auto;
        min-height: 0;
      }
      .system-visual-panel .unit-stage {
        grid-column: 1 / -1;
        grid-row: 2;
      }
      .system-visual-panel .unit {
        min-height: 180px;
      }
      .system-visual-panel .air-path {
        min-height: 66px;
      }
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
      .boost-pill-button {
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
    /* With shower status no longer competing in a side column, Overview
       always gets the full card width and can stay generously sized. */
    .system-visual-wrap {
      min-height: 430px;
      grid-template-columns: minmax(160px, 1fr) minmax(460px, 700px) minmax(160px, 1fr);
    }
    .unit-stage {
      grid-column: 2;
      grid-row: 1 / span 2;
      width: 100%;
      min-width: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .system-visual-panel .unit {
      grid-column: auto;
      grid-row: auto;
      min-height: 360px;
      border-radius: 26px;
      background: transparent;
      border-color: transparent;
      box-shadow: none;
    }
    .airflow-schematic {
      position: absolute;
      inset: 3% 0;
      width: 100%;
      height: 94%;
      overflow: visible;
    }
    .airflow-path {
      fill: none;
      stroke-width: 40;
      stroke-linecap: round;
      stroke-linejoin: round;
      opacity: 0.96;
    }
    .duct-shells path {
      fill: none;
      stroke: color-mix(in srgb, var(--primary-text-color), #05080b 72%);
      stroke-width: 54;
      stroke-linecap: round;
      stroke-linejoin: round;
      filter: drop-shadow(0 5px 5px rgba(0, 0, 0, 0.35));
    }
    .duct-highlights path {
      fill: none;
      stroke: rgba(255, 255, 255, 0.24);
      stroke-width: 6;
      stroke-linecap: round;
      opacity: 0.75;
      pointer-events: none;
    }
    .cabinet-outer {
      fill: url(#cabinet-edge);
      stroke: color-mix(in srgb, var(--primary-text-color), #101419 54%);
      stroke-width: 4;
    }
    .cutaway-shell {
      fill: url(#inner-chamber);
      stroke: color-mix(in srgb, var(--primary-text-color), #090c10 70%);
      stroke-width: 8;
    }
    .cabinet-seam {
      fill: none;
      stroke: rgba(255, 255, 255, 0.24);
      stroke-width: 1.8;
      stroke-dasharray: 20 8;
    }
    .cabinet-lip {
      fill: none;
      stroke: rgba(255, 255, 255, 0.28);
      stroke-width: 3;
      stroke-linecap: round;
    }
    .metal-light {
      stop-color: #d9dde0;
    }
    .metal-mid {
      stop-color: #8c949a;
    }
    .metal-dark {
      stop-color: #343a3f;
    }
    .chamber-top {
      stop-color: #24282c;
    }
    .chamber-bottom {
      stop-color: #0f1215;
    }
    .blower-light {
      stop-color: #5b6268;
    }
    .blower-dark {
      stop-color: #15191c;
    }
    .cutaway-compartments path {
      fill: none;
      stroke: #535b61;
      stroke-width: 6;
      filter: drop-shadow(2px 0 2px rgba(0, 0, 0, 0.5));
    }
    .cutaway-compartments .support-rail {
      stroke-width: 3;
      stroke: #9ba1a5;
      opacity: 0.62;
    }
    .mounting-brackets path,
    .mounting-brackets rect {
      fill: #71787e;
      stroke: #1b1f22;
      stroke-width: 2;
    }
    .casing-bolts circle {
      fill: #b8bdc1;
      stroke: #30363a;
      stroke-width: 1.5;
    }
    .casing-bolts path {
      stroke: #454b50;
      stroke-width: 1.2;
    }
    .filter-depth {
      fill: #555c61;
      stroke: #c2c6c9;
      stroke-width: 3;
    }
    .filter-media {
      fill: #c2b79d;
      stroke: #312e29;
      stroke-width: 2;
    }
    .filter-pleat {
      fill: none;
      stroke: #716956;
      stroke-width: 2.2;
    }
    .filter-status-edge {
      fill: #687078;
    }
    .filter-cartridge.known .filter-status-edge {
      fill: var(--success-color);
    }
    .filter-cartridge.unavailable {
      opacity: 0.68;
    }
    .port-collar rect {
      fill: url(#collar-metal);
      stroke: #252b2f;
      stroke-width: 3;
      filter: drop-shadow(0 3px 2px rgba(0, 0, 0, 0.36));
    }
    .port-collar ellipse {
      fill: #1a1f23;
      stroke: #aeb4b8;
      stroke-width: 3;
    }
    .collar-highlight {
      fill: none;
      stroke: rgba(255, 255, 255, 0.48);
      stroke-width: 3;
    }
    .collar-accent {
      fill: none;
      stroke: var(--collar-color);
      stroke-width: 5;
      opacity: 0.9;
    }
    .extract-flow {
      stroke: url(#extract-gradient);
    }
    .exhaust-flow {
      stroke: url(#exhaust-gradient);
    }
    .outdoor-flow {
      stroke: url(#outdoor-gradient);
    }
    .supply-flow {
      stroke: url(#supply-gradient);
    }
    .exchanger-outline {
      fill: #677077;
      stroke: url(#exchanger-frame);
      stroke-width: 16;
      stroke-linejoin: round;
    }
    .exchanger-shadow {
      fill: rgba(0, 0, 0, 0.45);
    }
    .exchanger-warm-face {
      fill: url(#warm-exchanger-gradient);
      opacity: 0.48;
    }
    .exchanger-cool-face {
      fill: url(#cool-exchanger-gradient);
      opacity: 0.5;
    }
    .warm-channels path,
    .cool-channels path {
      fill: none;
      stroke-width: 1.8;
      stroke-linecap: round;
      opacity: 0.92;
    }
    .warm-channels path {
      stroke: url(#warm-exchanger-gradient);
    }
    .cool-channels path {
      stroke: url(#cool-exchanger-gradient);
    }
    .passage-separator {
      fill: none;
      stroke: #d2d6d8;
      stroke-width: 5;
      opacity: 0.82;
    }
    .exchanger-frame-detail {
      fill: none;
      stroke: rgba(255, 255, 255, 0.48);
      stroke-width: 3;
      stroke-linejoin: round;
    }
    .fan-scroll {
      fill: url(#blower-metal);
      stroke: #0a0d0f;
      stroke-width: 3.2;
    }
    .fan-drum-back {
      fill: #080b0d;
      stroke: #c0c5c8;
      stroke-width: 4;
    }
    .fan-drum-depth {
      fill: url(#blower-metal);
      stroke: #262b2f;
      stroke-width: 2;
    }
    .fan-ring {
      fill: #101417;
      stroke: #9ca2a6;
      stroke-width: 2.6;
    }
    .fan-motor {
      fill: url(#blower-metal);
      stroke: #090b0d;
      stroke-width: 4;
    }
    .fan-feet {
      fill: none;
      stroke: #9ca2a6;
      stroke-width: 6;
      stroke-linejoin: round;
    }
    .fan-rotor {
      transform-box: fill-box;
      transform-origin: center;
    }
    .fan-vane {
      fill: #7b858d;
      stroke: #1a1e21;
      stroke-width: 0.8;
      opacity: 0.88;
    }
    .fan-shroud {
      fill: none;
      stroke: #a1a8ad;
      stroke-width: 3;
    }
    .fan-hub {
      fill: url(#blower-metal);
      stroke: #24292d;
      stroke-width: 3;
    }
    .fan-axle {
      fill: #d6dadd;
      stroke: #343a3e;
      stroke-width: 1.5;
    }
    .fan-assembly.unavailable {
      opacity: 0.58;
      filter: grayscale(1);
    }
    .system-visual-panel .unit.active .fan-assembly.unavailable .fan-rotor {
      animation: none;
    }
    .airflow-particle {
      opacity: 0;
      offset-rotate: 0deg;
    }
    .extract-particles .airflow-particle {
      fill: var(--air-extract);
      offset-path: path('M700 82 H566 C512 82 488 111 433 154');
    }
    .exhaust-particles .airflow-particle {
      fill: var(--air-exhaust);
      offset-path: path('M267 206 C212 249 188 278 134 278 H0');
    }
    .outdoor-particles .airflow-particle {
      fill: var(--air-outdoor);
      offset-path: path('M0 82 H134 C188 82 212 111 267 154');
    }
    .supply-particles .airflow-particle {
      fill: var(--air-supply);
      offset-path: path('M433 206 C488 249 512 278 566 278 H700');
    }
    .system-visual-panel .unit.active .airflow-particle {
      animation: schematic-particle 2.4s linear infinite;
    }
    .system-visual-panel .unit.active .airflow-particles.unavailable .airflow-particle {
      animation: none;
      opacity: 0;
    }
    .system-visual-panel .unit.active .fan-rotor {
      animation: spin 2.8s linear infinite;
    }
    .system-visual-panel .unit.active .particle-2 {
      animation-delay: -0.8s;
    }
    .system-visual-panel .unit.active .particle-3 {
      animation-delay: -1.6s;
    }
    @keyframes schematic-particle {
      0% {
        offset-distance: 0%;
        opacity: 0;
      }
      12%,
      88% {
        opacity: 0.9;
      }
      100% {
        offset-distance: 100%;
        opacity: 0;
      }
    }
    /* Compact equipment-style information plate: it leaves all four plate
       exchanger quadrants visible while retaining the one-shot update pulse. */
    .recovery-badge-plate {
      position: relative;
      z-index: 3;
      width: 176px;
      height: 88px;
      transform: translateY(-12px);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      text-align: center;
      background: color-mix(
        in srgb,
        var(--ha-card-background, var(--card-background-color)),
        transparent 4%
      );
      border: 3px solid color-mix(in srgb, var(--success-color), transparent 25%);
      box-shadow: 0 5px 14px rgba(0, 0, 0, 0.2);
      cursor: default;
    }
    .recovery-badge-plate strong {
      font-size: 2em;
      font-weight: 800;
      color: var(--success-color);
      line-height: 1.1;
    }
    .recovery-badge-plate span {
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
    .recovery-badge-plate.recovery-pulse {
      animation: recovery-pulse 0.7s ease-out;
    }
    .recovery-connector {
      width: 1px;
      height: 10px;
      background: color-mix(in srgb, var(--success-color), transparent 45%);
      flex: 0 0 auto;
    }
    @keyframes recovery-pulse {
      0% {
        transform: scale(1);
      }
      35% {
        transform: scale(1.08);
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.24);
      }
      100% {
        transform: scale(1);
      }
    }
    .system-visual-panel .path-label {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .system-visual-panel .path-label ha-icon,
    .system-visual-panel .path-airflow ha-icon,
    .system-visual-panel .path-humidity ha-icon {
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
    /* Each endpoint is tinted from its own live temperature. The inline
       custom properties are recalculated on every Home Assistant update. */
    .system-visual-panel .air-path {
      background: var(--stream-soft);
      border-color: color-mix(in srgb, var(--stream-color), transparent 45%);
    }
    /* System-mode endpoint cards are deliberately static. Their live tint,
       not decorative movement, communicates temperature. */
    .system-visual-panel .air-path::after {
      content: none;
      display: none;
      animation: none;
      background: none;
    }
    /* "Particles accelerate slightly during Boost" and the fans spin a
       little faster with them — a real boost mode raises fan speed
       noticeably, so this reinforces that state through the animations
       that already exist rather than adding anything new to the exchanger
       graphic (visual-polish follow-up, round 3). Same elements, same
       keyframes, just a shorter duration — .boost-active is only ever
       applied alongside .active, so this never overrides a stopped
       animation into a running one. */
    .system-visual-panel .unit.active.boost-active .fan-rotor {
      animation-duration: 1.6s;
    }
    .system-visual-panel .unit.active.boost-active .airflow-particle {
      animation-duration: 1.35s;
    }

    .path-humidity {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
      font-size: 0.78em;
      color: var(--secondary-text-color);
    }

    /* ---- shower-detection banner (full-width, below the lower cards) ---- */
    .shower-panel {
      border-radius: 16px;
      padding: 16px;
      box-sizing: border-box;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    /* A horizontal banner (illustration + heading on the left, facts as a
       row on the right) rather than a narrow vertical column. */
    .shower-ready,
    .shower-unavailable {
      border: 1px solid var(--divider-color);
      background: color-mix(in srgb, var(--divider-color), transparent 92%);
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      gap: 20px;
    }
    .shower-unavailable {
      background: color-mix(in srgb, var(--secondary-text-color), transparent 94%);
    }
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
    .shower-ready .droplet,
    .shower-unavailable .droplet {
      animation: none;
      opacity: 0.45;
      stroke: var(--secondary-text-color);
    }
    .shower-ready .shower-heading,
    .shower-unavailable .shower-heading,
    .shower-ready .shower-title,
    .shower-unavailable .shower-title {
      color: var(--secondary-text-color);
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
    .gauge-value .gauge-scale {
      margin-top: 4px;
      font-size: 0.72em;
      color: var(--secondary-text-color);
      text-transform: none;
      letter-spacing: normal;
    }
    .mode-select-pill.mode-off,
    .chip.mode-off.active {
      color: var(--secondary-text-color);
      background: color-mix(in srgb, var(--secondary-text-color), transparent 88%);
    }
    .control-error,
    .preset-validation {
      color: var(--error-color) !important;
    }
    .control-success {
      color: var(--success-color) !important;
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
    .preset-controls,
    .calibration-panel {
      border: 1px solid var(--divider-color);
      border-radius: 12px;
      padding: 14px;
      background: var(--ha-card-background, var(--card-background-color));
    }
    .preset-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-top: 10px;
    }
    .preset-field {
      display: flex;
      flex-direction: column;
      gap: 5px;
      min-width: 0;
      font-size: 0.82em;
      color: var(--secondary-text-color);
    }
    .preset-input-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .preset-input-wrap input {
      width: 100%;
      min-width: 0;
      min-height: 42px;
      box-sizing: border-box;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 8px;
      font: inherit;
      color: var(--primary-text-color);
      background: var(--ha-card-background, var(--card-background-color));
    }
    .preset-input-wrap small {
      white-space: nowrap;
    }
    .preset-validation {
      margin: 10px 0 0;
      font-size: 0.8em;
    }
    .preset-empty {
      margin: 10px 0 0;
      color: var(--secondary-text-color);
      font-size: 0.88em;
    }
    .calibration-panel {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .calibration-panel-head,
    .calibration-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .calibration-panel-head > div {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .calibration-panel small {
      color: var(--secondary-text-color);
    }
    .calibration-button {
      flex: 0 0 auto;
    }
    .calibration-progress {
      width: 100%;
      height: 9px;
      border-radius: 999px;
      overflow: hidden;
      background: var(--divider-color);
    }
    .calibration-progress span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--primary-color);
      transition: width 0.4s ease;
    }
    .calibration-details {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
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
        grid-template-columns: minmax(140px, 1fr) minmax(360px, 520px) minmax(140px, 1fr);
        min-height: 440px;
      }
      .system-visual-panel .unit {
        min-height: 320px;
      }
      .recovery-badge-plate {
        width: 148px;
        height: 76px;
      }
      /* Tablet: the three lower cards wrap to two columns instead of
         three, and the shower banner stacks to a column. */
      .system-lower-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .shower-ready,
      .shower-active,
      .shower-unavailable {
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
      .system-visual-panel .unit-stage {
        grid-column: 1 / -1;
        grid-row: 2;
      }
      .system-visual-panel .unit {
        min-height: 170px;
      }
      .airflow-schematic {
        inset: 4% 0;
        height: 92%;
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
      .boost-pill-button {
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
      .preset-grid {
        grid-template-columns: minmax(0, 1fr);
      }
      .calibration-details {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .calibration-button {
        width: 100%;
      }
    }

    /* Container-query overrides must follow the desktop system-visual
       rules above: dashboard columns can be narrow even when the browser
       viewport is wide, so viewport media queries alone are insufficient. */
    @container (max-width: 520px) {
      .system-visual-wrap {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        grid-template-rows: auto auto auto;
        min-height: 0;
        gap: 10px;
      }
      .system-visual-panel .unit-stage {
        grid-column: 1 / -1;
        grid-row: 2;
      }
      .system-visual-panel .unit {
        min-height: 180px;
      }
      .system-visual-panel .air-path {
        min-height: 66px;
        padding: 10px;
      }
      .system-visual-panel .duct-highlights,
      .system-visual-panel .mounting-brackets {
        opacity: 0.45;
      }
      .system-visual-panel .particle-3 {
        display: none;
      }
      .system-visual-panel .recovery-badge-plate {
        width: 106px;
        height: 58px;
        border-radius: 8px;
      }
      .system-visual-panel .recovery-badge-plate strong {
        font-size: 1.45em;
      }
      .system-visual-panel .recovery-badge-plate span {
        font-size: 0.54em;
      }
      .system-lower-grid {
        grid-template-columns: minmax(0, 1fr);
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
