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

// The one action role implemented so far. Kept out of STATUS_ROLES/`_present`
// because it renders as an interactive control, not read-only text, when its
// snapshot status is 'ok' — see `_controlRow`.
const CONTROL_ROLES: Array<[EntityRoleId, string]> = [['filter_reset_control', 'Filter reset']];

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
];
const OPTIONAL_AVAILABILITY_ROLE_SET = new Set(OPTIONAL_AVAILABILITY_ROLES);

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

  // One ControlDispatcher per active action role, created lazily and kept
  // alive across renders (not a @state field — its pending/error state is
  // read on demand in render(), and `onChange` explicitly requests an
  // update, so Lit's own reactivity doesn't need to know about this map).
  private readonly _dispatchers = new Map<EntityRoleId, ControlDispatcher>();

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
      <ha-card>
        ${this._header(title, subtitle, modeLabel, availability, showAvailability)}
        ${
          detailed
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
    const status = this._dashboardStatus(snapshot);
    const hasControls = config.show_controls && this._hasControls(snapshot, config);
    const lastCalibration =
      snapshot.last_calibration?.status === 'ok'
        ? formatTimestampMaybe(snapshot.last_calibration.value)
        : null;

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
        ${this._extraControls(snapshot, config, hass)}
      </div>
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

    const controlRows = CONTROL_ROLES.map(([role, label]) =>
      this._controlRow(role, label, snapshot[role], detailed, config, hass),
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
    const rows = CONTROL_ROLES.map(([role, label]) =>
      this._controlRow(role, label, snapshot[role], true, config, hass),
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
            ? html`<span class="status-value tone-warning">Couldn't reset</span>`
            : ''
        }
        <button
          type="button"
          class="control-button"
          aria-label=${label}
          ?disabled=${state.status === 'pending'}
          @click=${() => dispatcher.dispatchAction(hass, entityId)}
        >
          ${state.status === 'pending' ? 'Resetting…' : 'Reset'}
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
    }

    ha-card {
      width: 100%;
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
      .air-path.active::after {
        animation: none;
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
